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
  it('未配对释放的名额在 resetTimeout 后被回收,熔断器可恢复探测', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 40,
      halfOpenRequests: 1,
    });
    cb.recordFailure();
    await sleep(50); // → HALF_OPEN
    expect(cb.canRequest()).toBe(true); // 预占名额
    // 调用方异常路径漏配对(或把 canRequest 当探询):不做任何 record*/release
    expect(cb.canRequest()).toBe(false);
    await sleep(50); // 超过 resetTimeout → 失联名额回收
    expect(cb.canRequest()).toBe(true); // 此前会永久 false 卡死
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
