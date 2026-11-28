import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { RequestClient } from '../../../src/core';
import { sleepWithAbort } from '../../../src/core/abort';
import { MemoryCache } from '../../../src/core/cache';

const url = 'https://example.com/data';
const pendingJson = () => new Response(new ReadableStream({ start() {} }));

async function withLegacyAbortSignal(test: () => Promise<void>) {
  const props = [
    [AbortSignal.prototype, 'throwIfAborted'],
    [AbortSignal.prototype, 'reason'],
    [AbortSignal, 'any'],
  ] as const;
  const descriptors = props.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key));
  try {
    for (const [target, key] of props) Reflect.deleteProperty(target, key);
    await test();
  } finally {
    props.forEach(([target, key], i) => {
      if (descriptors[i]) Object.defineProperty(target, key, descriptors[i]!);
    });
  }
}

describe('request runtime compatibility', () => {
  it('supports ordinary requests and pre-cancellation without modern AbortSignal methods', async () => {
    await withLegacyAbortSignal(async () => {
      const fetchImpl = vi.fn(async () => new Response('ok'));
      const client = new RequestClient({ fetchImpl, retry: { maxRetries: 0 } });
      await expect(client.get(url)).resolves.toBe('ok');
      const controller = new AbortController();
      await expect(client.get(url, { signal: controller.signal })).resolves.toBe('ok');
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      controller.abort();
      await expect(client.get(url, { signal: controller.signal })).rejects.toMatchObject({ code: 'ABORTED' });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });
  });

  it('classifies body timeout and external cancellation when signals have no reason', async () => {
    await withLegacyAbortSignal(async () => {
      const fetchImpl = vi.fn(async () => pendingJson());
      const client = new RequestClient({ fetchImpl, timeout: 15, retry: { maxRetries: 0 } });
      await expect(client.get(url, { responseType: 'json' })).rejects.toMatchObject({ code: 'TIMEOUT' });

      const controller = new AbortController();
      const abortingFetch = vi.fn(async () => {
        queueMicrotask(() => controller.abort());
        return pendingJson();
      });
      const aborting = new RequestClient({ fetchImpl: abortingFetch, retry: { maxRetries: 0 } });
      await expect(aborting.get(url, { signal: controller.signal, responseType: 'json' }))
        .rejects.toMatchObject({ code: 'ABORTED' });
      expect(abortingFetch).toHaveBeenCalledOnce();
    });
  });

  it('supports legacy signals in the limiter, retry delay and cache paths', async () => {
    await withLegacyAbortSignal(async () => {
      const controller = new AbortController();
      const fetchImpl = vi.fn(async () => new Response('try again', { status: 503 }));
      const onRetry = vi.fn(() => queueMicrotask(() => controller.abort()));
      const client = new RequestClient({
        fetchImpl, hooks: { onRetry }, rateLimit: { requestsPerSecond: 1, maxBurst: 1 },
        retry: { maxRetries: 1, baseDelay: 1_000 },
      });
      await expect(client.get(url, { signal: controller.signal })).rejects.toMatchObject({ code: 'ABORTED' });
      expect(onRetry).toHaveBeenCalledOnce();
      expect(fetchImpl).toHaveBeenCalledOnce();

      const live = new AbortController();
      const cache = new MemoryCache<string>();
      await expect(cache.getOrFetch('key', async () => 'value', undefined, live.signal)).resolves.toBe('value');
      await expect(sleepWithAbort(0, live.signal)).resolves.toBeUndefined();
    });
  });

  it('cancels a legacy caller queued behind a rate-limited request', async () => {
    await withLegacyAbortSignal(async () => {
      const fetchImpl = vi.fn(async () => new Response('ok'));
      const client = new RequestClient({
        fetchImpl, rateLimit: { requestsPerSecond: 1, maxBurst: 1 },
      });
      await client.get(url);
      const first = new AbortController();
      const queued = new AbortController();
      const firstResult = expect(client.get(url, { signal: first.signal }))
        .rejects.toMatchObject({ code: 'ABORTED' });
      const queuedResult = expect(client.get(url, { signal: queued.signal }))
        .rejects.toMatchObject({ code: 'ABORTED' });
      queued.abort();
      await queuedResult;
      first.abort();
      await firstResult;
      expect(fetchImpl).toHaveBeenCalledOnce();
    });
  });

  it('does not retry a cross-realm JSON syntax error as a network failure', async () => {
    const error: unknown = runInNewContext('try { JSON.parse("<html>") } catch (error) { error }');
    expect(error).toMatchObject({ name: 'SyntaxError' });
    expect(error).not.toBeInstanceOf(SyntaxError);
    const fetchImpl = vi.fn(async () => {
      const response = new Response('<html>');
      response.json = async () => { throw error; };
      return response;
    });
    const client = new RequestClient({
      fetchImpl, retry: { maxRetries: 1, retryOnNetworkError: true, baseDelay: 1 },
    });
    await expect(client.get(url, { responseType: 'json' })).rejects.toMatchObject({ code: 'PARSE_ERROR', cause: error });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
