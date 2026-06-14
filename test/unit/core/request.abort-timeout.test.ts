/**
 * Review 修复回归（F2/F3/F4）：abort / 超时分类与失败记账
 *
 * 关键背景：真实 fetch 在 signal 触发时以 `signal.reason`【原样】作为拒绝值
 * （Node 20/22/25 与 undici 实测均如此），而非固定抛 DOMException。
 * 此前的实现：
 * - F2: 内部超时 reason 是 Symbol → normalizeRequestError 无法识别 → 超时被
 *   错分类为 NETWORK_ERROR，retryOnTimeout:false 被绕过。
 * - F3: 外部取消传自定义 reason（string / Error）→ 不被识别为 ABORTED →
 *   对已取消的请求空转重试。
 * - F4: ABORTED 被记入 host 健康（30s 冷却）与熔断器（取消几次就 OPEN）。
 */
import { describe, it, expect, vi } from 'vitest';
import { RequestClient, AbortedError } from '../../../src/core';

/** 模拟真实 fetch 的 signal 语义：abort 时以 signal.reason 原样拒绝，否则挂起 */
function hangingFetch(): typeof fetch {
  return vi.fn((_url: string, init?: { signal?: AbortSignal }) => {
    return new Promise<Response>((_resolve, reject) => {
      const s = init?.signal;
      if (!s) return;
      if (s.aborted) return reject(s.reason);
      s.addEventListener('abort', () => reject(s.reason), { once: true });
    });
  }) as unknown as typeof fetch;
}

describe('F2 内部超时 → TIMEOUT（而非 NETWORK_ERROR）', () => {
  it('超时错误码为 TIMEOUT，message 含超时信息', async () => {
    const client = new RequestClient({
      fetchImpl: hangingFetch(),
      timeout: 20,
      retry: { maxRetries: 0 },
    });
    const err = await client.get('https://example.com/a').catch((e) => e);
    expect(err.code).toBe('TIMEOUT');
    expect(String(err.message)).toContain('timed out');
  });

  it('retryOnTimeout:false 时超时不重试', async () => {
    const f = hangingFetch();
    const client = new RequestClient({
      fetchImpl: f,
      timeout: 20,
      retry: { maxRetries: 2, retryOnTimeout: false, baseDelay: 1 },
    });
    const err = await client.get('https://example.com/a').catch((e) => e);
    expect(err.code).toBe('TIMEOUT');
    expect(f).toHaveBeenCalledOnce();
  });

  it('retryOnTimeout 默认开启时超时会按预算重试', async () => {
    const f = hangingFetch();
    const client = new RequestClient({
      fetchImpl: f,
      timeout: 15,
      retry: { maxRetries: 1, baseDelay: 1 },
    });
    const err = await client.get('https://example.com/a').catch((e) => e);
    expect(err.code).toBe('TIMEOUT');
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('F3 外部取消（任意 reason 形状）→ ABORTED 且不重试', () => {
  it('abort(new Error(...)) → AbortedError，fetch 只调用一次', async () => {
    const f = hangingFetch();
    const controller = new AbortController();
    const client = new RequestClient({
      fetchImpl: f,
      retry: { maxRetries: 3, baseDelay: 1 },
    });
    const pending = client
      .get('https://example.com/a', { signal: controller.signal })
      .catch((e) => e);
    controller.abort(new Error('navigation'));
    const err = await pending;
    expect(err).toBeInstanceOf(AbortedError);
    expect(err.code).toBe('ABORTED');
    expect(f).toHaveBeenCalledOnce();
  });

  it('abort(字符串 reason) 预先取消 → ABORTED', async () => {
    const f = hangingFetch();
    const controller = new AbortController();
    controller.abort('user cancelled');
    const client = new RequestClient({
      fetchImpl: f,
      retry: { maxRetries: 2, baseDelay: 1 },
    });
    const err = await client
      .get('https://example.com/a', { signal: controller.signal })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AbortedError);
    expect(err.code).toBe('ABORTED');
    expect(f).toHaveBeenCalledOnce();
  });

  it('client 级 signal 自定义 reason 同样归 ABORTED', async () => {
    const controller = new AbortController();
    const client = new RequestClient({
      fetchImpl: hangingFetch(),
      retry: { maxRetries: 2, baseDelay: 1 },
      signal: controller.signal,
    });
    const pending = client.get('https://example.com/a').catch((e) => e);
    controller.abort({ kind: 'route-change' });
    const err = await pending;
    expect(err.code).toBe('ABORTED');
  });

  it('超时先触发时仍归 TIMEOUT（外部 signal 存在但未取消）', async () => {
    const controller = new AbortController();
    const client = new RequestClient({
      fetchImpl: hangingFetch(),
      timeout: 10,
      retry: { maxRetries: 0 },
    });
    const err = await client
      .get('https://example.com/a', { signal: controller.signal })
      .catch((e) => e);
    expect(err.code).toBe('TIMEOUT');
  });
});

describe('P2-8 自定义 fetchImpl 不透传 reason 时超时仍归 TIMEOUT', () => {
  /** node-fetch 风格:abort 时抛自建 plain-Error AbortError 而非 signal.reason */
  function nodeFetchStyle(): typeof fetch {
    return vi.fn((_url: string, init?: { signal?: AbortSignal }) => {
      return new Promise<Response>((_resolve, reject) => {
        const s = init?.signal;
        if (!s) return;
        const fail = () =>
          reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }));
        if (s.aborted) return fail();
        s.addEventListener('abort', fail, { once: true });
      });
    }) as unknown as typeof fetch;
  }

  it('超时 → code TIMEOUT 且 retryOnTimeout:false 生效(此前 NETWORK_ERROR + 3 次重试)', async () => {
    const f = nodeFetchStyle();
    const client = new RequestClient({
      fetchImpl: f,
      timeout: 20,
      retry: { maxRetries: 2, retryOnTimeout: false, retryOnNetworkError: true, baseDelay: 1 },
    });
    const err = await client.get('https://example.com/a').catch((e) => e);
    expect(err.code).toBe('TIMEOUT');
    expect(f).toHaveBeenCalledOnce();
  });

  it('外部取消优先级不受影响(自建 AbortError + 外部已取消 → ABORTED)', async () => {
    const f = nodeFetchStyle();
    const controller = new AbortController();
    const client = new RequestClient({ fetchImpl: f, retry: { maxRetries: 2, baseDelay: 1 } });
    const pending = client
      .get('https://example.com/a', { signal: controller.signal })
      .catch((e) => e);
    controller.abort('stop');
    const err = await pending;
    expect(err).toBeInstanceOf(AbortedError);
  });
});

describe('F4 ABORTED 不计入失败记账', () => {
  it('连续取消不会把熔断器打开', async () => {
    let mode: 'hang' | 'ok' = 'hang';
    const f = vi.fn((_url: string, init?: { signal?: AbortSignal }) => {
      if (mode === 'ok') {
        return Promise.resolve(new Response('ok'));
      }
      return new Promise<Response>((_resolve, reject) => {
        const s = init?.signal;
        if (!s) return;
        if (s.aborted) return reject(s.reason);
        s.addEventListener('abort', () => reject(s.reason), { once: true });
      });
    }) as unknown as typeof fetch;

    const client = new RequestClient({
      fetchImpl: f,
      retry: { maxRetries: 0 },
      circuitBreaker: { failureThreshold: 2, resetTimeout: 60_000 },
    });

    for (let i = 0; i < 3; i++) {
      const controller = new AbortController();
      const pending = client
        .get('https://example.com/a', { signal: controller.signal })
        .catch((e) => e);
      controller.abort(new Error('cancel'));
      const err = await pending;
      expect(err.code).toBe('ABORTED');
    }

    // 若 ABORTED 被记为失败，3 次取消早已超过 failureThreshold:2 → 这里会 CIRCUIT_OPEN
    mode = 'ok';
    await expect(client.get('https://example.com/a')).resolves.toBe('ok');
  });

  it('取消不污染 host 健康（无 failureCount / 冷却）', async () => {
    const controller = new AbortController();
    const client = new RequestClient({
      fetchImpl: hangingFetch(),
      retry: { maxRetries: 0 },
    });
    const pending = client
      .get('https://example.com/health-check', { signal: controller.signal })
      .catch((e) => e);
    controller.abort('stop');
    await pending;

    const entry = client
      .getHostHealth()
      .find((s) => s.host === 'example.com');
    expect(entry?.failureCount ?? 0).toBe(0);
    expect(entry?.cooldownUntil ?? 0).toBe(0);
  });

  it('真实失败仍正常记账（对照组）', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('network down');
    }) as unknown as typeof fetch;
    const client = new RequestClient({ fetchImpl: f, retry: { maxRetries: 0 } });
    await client.get('https://example.com/a').catch(() => undefined);
    const entry = client
      .getHostHealth()
      .find((s) => s.host === 'example.com');
    expect(entry?.failureCount).toBe(1);
  });
});
