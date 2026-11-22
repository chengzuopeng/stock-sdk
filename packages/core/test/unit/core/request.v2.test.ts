/**
 * 请求层 v2（阶段1）单测：
 * - 注入自定义 fetchImpl（client 级 / per-call 级）
 * - 外部 AbortSignal → AbortedError(code=ABORTED)，且不重试
 * - 对外只抛 SdkError（裸 TypeError 被归一化）
 * - 生命周期 hooks（onRequest/onResponse/onError/onRetry/trace）
 */
import { describe, it, expect, vi } from 'vitest';
import { RequestClient, AbortedError, SdkError } from '../../../src/core';

function okFetch(body: string, status = 200): typeof fetch {
  return vi.fn(
    async () => new Response(body, { status })
  ) as unknown as typeof fetch;
}

describe('RequestClient v2 — fetchImpl injection', () => {
  it('uses client-level fetchImpl', async () => {
    const f = okFetch('hello');
    const client = new RequestClient({ fetchImpl: f, retry: { maxRetries: 0 } });
    await expect(client.get<string>('https://example.com/a')).resolves.toBe(
      'hello'
    );
    expect(f).toHaveBeenCalledOnce();
  });

  it('per-call fetchImpl overrides client-level', async () => {
    const clientF = okFetch('client');
    const callF = okFetch('percall');
    const client = new RequestClient({
      fetchImpl: clientF,
      retry: { maxRetries: 0 },
    });
    await expect(
      client.get<string>('https://example.com/a', { fetchImpl: callF })
    ).resolves.toBe('percall');
    expect(callF).toHaveBeenCalledOnce();
    expect(clientF).not.toHaveBeenCalled();
  });
});

describe('RequestClient v2 — external signal → ABORTED', () => {
  const signalAwareFetch = (): typeof fetch =>
    vi.fn(async (_url: string, init?: { signal?: AbortSignal }) => {
      if (init?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return new Response('ok');
    }) as unknown as typeof fetch;

  it('throws AbortedError(code=ABORTED) on aborted signal and does not retry', async () => {
    const f = signalAwareFetch();
    const controller = new AbortController();
    controller.abort();
    const client = new RequestClient({ fetchImpl: f, retry: { maxRetries: 2 } });
    const err = await client
      .get('https://example.com/a', { signal: controller.signal })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AbortedError);
    expect(err.code).toBe('ABORTED');
    expect(f).toHaveBeenCalledOnce();
  });
});

describe('RequestClient v2 — only throws SdkError', () => {
  it('network failure surfaces as SdkError(NETWORK_ERROR), not raw TypeError', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('network down');
    }) as unknown as typeof fetch;
    const client = new RequestClient({ fetchImpl: f, retry: { maxRetries: 0 } });
    const err = await client.get('https://example.com/a').catch((e) => e);
    expect(err).toBeInstanceOf(SdkError);
    expect(err.code).toBe('NETWORK_ERROR');
  });
});

describe('RequestClient v2 — hooks', () => {
  it('fires onRequest/onResponse/trace on success', async () => {
    const onRequest = vi.fn();
    const onResponse = vi.fn();
    const trace = vi.fn();
    const client = new RequestClient({
      fetchImpl: okFetch('ok'),
      retry: { maxRetries: 0 },
      hooks: { onRequest, onResponse, trace },
    });
    await client.get('https://example.com/a');
    expect(onRequest).toHaveBeenCalledOnce();
    expect(onResponse).toHaveBeenCalledOnce();
    expect(onResponse.mock.calls[0][1]).toMatchObject({ status: 200 });
    expect(trace).toHaveBeenCalled();
  });

  it('fires onError and onRetry on retried network failure', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('down');
    }) as unknown as typeof fetch;
    const onError = vi.fn();
    const onRetry = vi.fn();
    const client = new RequestClient({
      fetchImpl: f,
      retry: { maxRetries: 1, retryOnNetworkError: true, baseDelay: 1 },
      hooks: { onError, onRetry },
    });
    await client.get('https://example.com/a').catch(() => undefined);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[0][1]).toBeInstanceOf(SdkError);
  });

  it('a throwing hook does not break the main flow', async () => {
    const client = new RequestClient({
      fetchImpl: okFetch('ok'),
      retry: { maxRetries: 0 },
      hooks: {
        onRequest: () => {
          throw new Error('boom');
        },
      },
    });
    await expect(client.get('https://example.com/a')).resolves.toBe('ok');
  });
});
