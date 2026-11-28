/**
 * Review 修复回归（commit 7 边角批）：
 * - F20 熔断器半开限流（在途探测计数）
 * - F23 jsonp/jsVars 裸 fetch 路径非 abort 失败归一为 SdkError
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { CircuitBreaker } from '../../../src/core/circuitBreaker';
import { SdkError } from '../../../src/core/errors';
import { jsonpRequest } from '../../../src/core/jsonp';
import { fetchJsVars } from '../../../src/core/jsVars';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('F20 熔断器 HALF_OPEN 在途限流', () => {
  it('半开期并发请求只放行 halfOpenRequests 个(此前门控恒真不限量)', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 30,
      halfOpenRequests: 1,
    });
    cb.recordFailure(); // → OPEN
    expect(cb.canRequest()).toBe(false);
    await sleep(40); // → HALF_OPEN

    expect(cb.canRequest()).toBe(true); // 第 1 个探测放行(预占名额)
    expect(cb.canRequest()).toBe(false); // 并发第 2 个被拒 ← 修复点
    expect(cb.canRequest()).toBe(false);

    cb.recordSuccess(); // 探测成功 → CLOSED
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canRequest()).toBe(true);
  });

  it('halfOpenRequests=2 时恰好放行两个', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 30,
      halfOpenRequests: 2,
    });
    cb.recordFailure();
    await sleep(40);
    expect(cb.canRequest()).toBe(true);
    expect(cb.canRequest()).toBe(true);
    expect(cb.canRequest()).toBe(false);
    cb.recordSuccess();
    // 1 成功 + 1 仍在途 = 配额满 → 不再放行新探测
    expect(cb.canRequest()).toBe(false);
    cb.recordSuccess(); // 第二个探测也成功 → CLOSED
    expect(cb.getState()).toBe('CLOSED');
  });

  it('releaseProbe 释放被取消探测的名额', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 30,
      halfOpenRequests: 1,
    });
    cb.recordFailure();
    await sleep(40);
    expect(cb.canRequest()).toBe(true);
    expect(cb.canRequest()).toBe(false);
    cb.releaseProbe(); // 该探测被外部取消(ABORTED) → 名额归还
    expect(cb.canRequest()).toBe(true);
  });

  it('半开探测失败重新熔断', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 30,
      halfOpenRequests: 1,
    });
    cb.recordFailure();
    await sleep(40);
    expect(cb.canRequest()).toBe(true);
    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
    expect(cb.canRequest()).toBe(false);
  });
});

describe('P2-11 半开在途名额的时间回收(防泄漏永久卡死)', () => {
  it('未配对释放的名额在 probeRecycleTimeout 后被回收,熔断器可恢复探测', async () => {
    // R3-8 后回收阈值与 resetTimeout 解耦(默认 max(resetTimeout*4, 120s)),
    // 测试显式传小值
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 40,
      probeRecycleTimeout: 40,
      halfOpenRequests: 1,
    });
    cb.recordFailure();
    await sleep(50); // → HALF_OPEN
    expect(cb.canRequest()).toBe(true); // 预占名额
    // 调用方异常路径漏配对(或把 canRequest 当探询):不做任何 record*/release
    expect(cb.canRequest()).toBe(false);
    await sleep(50); // 超过 probeRecycleTimeout → 失联名额回收
    expect(cb.canRequest()).toBe(true); // 此前会永久 false 卡死
  });
});

describe('R3-8 半开名额回收精确化(独立阈值 + 逐项过期判定)', () => {
  it('合法慢探测(在途 < probeRecycleTimeout)的名额不再被回收击穿限流', async () => {
    // 修复前回收阈值硬复用 resetTimeout(30ms):慢探测 50ms 即被回收,
    // 半开期重新放行新请求 → 限流被击穿
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 30,
      probeRecycleTimeout: 5_000,
      halfOpenRequests: 1,
    });
    cb.recordFailure();
    await sleep(40); // → HALF_OPEN
    expect(cb.canRequest()).toBe(true); // 慢探测在途
    await sleep(60); // 远超 resetTimeout,但 < probeRecycleTimeout
    expect(cb.canRequest()).toBe(false); // 名额仍被慢探测占住(修复点)
    cb.recordSuccess(); // 慢探测最终成功
    expect(cb.getState()).toBe('CLOSED');
  });

  it('默认 probeRecycleTimeout = max(resetTimeout*4, 120s):resetTimeout 量级的慢探测不被回收', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 30,
      halfOpenRequests: 1,
    });
    cb.recordFailure();
    await sleep(40); // → HALF_OPEN
    expect(cb.canRequest()).toBe(true);
    await sleep(60); // 旧实现(回收阈值=resetTimeout=30ms)这里已回收
    expect(cb.canRequest()).toBe(false);
  });

  it('回收只剔除过期项,不连坐未过期的在途探测', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 30,
      probeRecycleTimeout: 150,
      halfOpenRequests: 2,
    });
    cb.recordFailure();
    await sleep(40); // → HALF_OPEN
    expect(cb.canRequest()).toBe(true); // 探测 A(将失联,t≈40)
    await sleep(90);
    expect(cb.canRequest()).toBe(true); // 探测 B(t≈130,新鲜)
    await sleep(80); // t≈210:A 在途 ≈170ms ≥ 150 过期;B 仅 ≈80ms 未过期
    // 旧实现:回收一刀切清零 → 这里会连放两个;现在只回收 A 的名额
    expect(cb.canRequest()).toBe(true); // 顶替 A 的新探测
    expect(cb.canRequest()).toBe(false); // B + 新探测已满额(B 未被连坐)
  });

  it('未放行过探测时迟到的 releaseProbe 不产生负名额/超发(shift 空数组无操作)', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 30,
      probeRecycleTimeout: 10_000,
      halfOpenRequests: 1,
    });
    cb.recordFailure();
    await sleep(40); // → HALF_OPEN
    // 异常路径:上一轮 OPEN 前的僵尸请求此刻才被取消,releaseProbe 迟到 ——
    // 名额数组为空,无操作;数值计数器实现若无守卫会变负数导致后续超发
    cb.releaseProbe();
    cb.releaseProbe();
    expect(cb.canRequest()).toBe(true); // 正常放行
    expect(cb.canRequest()).toBe(false); // 名额恰好占满,无超发
    cb.recordSuccess();
    expect(cb.getState()).toBe('CLOSED');
  });
});

describe('F23 jsonp/jsVars 非 abort 失败归一为 SdkError', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('jsonpRequest: ECONNREFUSED 类 TypeError → SdkError(NETWORK_ERROR)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const err = await jsonpRequest('https://example.com/api?x=1', {
      timeout: 1000,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(SdkError);
    expect((err as SdkError).code).toBe('NETWORK_ERROR');
  });

  it('fetchJsVars(裸 fetch 路径): TypeError → SdkError(NETWORK_ERROR)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('terminated');
    }) as unknown as typeof fetch;
    const err = await fetchJsVars('https://example.com/vars.js', ['a'], {
      timeout: 1000,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(SdkError);
    expect((err as SdkError).code).toBe('NETWORK_ERROR');
  });
});
