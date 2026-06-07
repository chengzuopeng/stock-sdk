/**
 * Review 问题回归测试（跨模块：jsonp #3 / cache #9 / request #8）
 */
import { describe, it, expect, vi } from 'vitest';
import { extractJsonFromJsonp } from '../../../src/core/jsonp';
import { MemoryCacheStore, cacheThrough } from '../../../src/cache';
import {
  RequestClient,
  AbortedError,
  HttpError,
  SdkError,
  getSdkErrorCode,
} from '../../../src/core';

describe('#3 extractJsonFromJsonp 非法 JSON → SdkError(PARSE_ERROR)', () => {
  it('括号配平但内部非法 JSON(反爬 HTML) 抛 SdkError 而非裸 SyntaxError', () => {
    const bad = '/*x*/cb(<html>error</html>)';
    expect(() => extractJsonFromJsonp(bad)).toThrow(SdkError);
    try {
      extractJsonFromJsonp(bad);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(getSdkErrorCode(e)).toBe('PARSE_ERROR');
    }
  });
});

describe('#9 cacheThrough 并发 single-flight 去重', () => {
  it('N 个并发同 key 未命中只触发一次 fetcher', async () => {
    const store = new MemoryCacheStore();
    let calls = 0;
    const fetcher = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return 'v';
    };
    const results = await Promise.all([
      cacheThrough(store, 'k', fetcher),
      cacheThrough(store, 'k', fetcher),
      cacheThrough(store, 'k', fetcher),
    ]);
    expect(results).toEqual(['v', 'v', 'v']);
    expect(calls).toBe(1);
  });
});

describe('#8 client signal 与 per-call signal 并存时 client 取消仍生效', () => {
  it('client abort 能取消带 per-call signal 的请求(不再被 per-call 覆盖)', async () => {
    const f: typeof fetch = vi.fn(
      async (_u: string, init?: { signal?: AbortSignal }) => {
        if (init?.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        return new Response('ok');
      }
    ) as unknown as typeof fetch;

    const clientController = new AbortController();
    clientController.abort(); // client 级取消（如全局 shutdown）
    const client = new RequestClient({
      fetchImpl: f,
      signal: clientController.signal,
      retry: { maxRetries: 0 },
    });
    const perCall = new AbortController(); // per-call signal（未取消）

    const err = await client
      .get('https://example.com/a', { signal: perCall.signal })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AbortedError);
    expect(err.code).toBe('ABORTED');
  });
});

describe('补f 修正:externalAborted 不再掩盖真实业务错误', () => {
  it('client signal 已 abort 时，in-flight 请求的真实 HTTP 500 仍归 HttpError(不被掩盖成 ABORTED)', async () => {
    // mock fetch 忽略 signal、返回 500，模拟「响应已到手后 client 才 abort」的竞态
    const f: typeof fetch = vi.fn(
      async () => new Response('server error', { status: 500 })
    ) as unknown as typeof fetch;

    const clientController = new AbortController();
    clientController.abort(); // client 持久 aborted

    const client = new RequestClient({
      fetchImpl: f,
      signal: clientController.signal,
      retry: { maxRetries: 0 },
    });

    const err = await client.get('https://example.com/a').catch((e) => e);
    // 修复前：externalAborted 判定过宽 → 误归 AbortedError，真实 500 丢失
    // 修复后：error 非 abort 形状 → 保留 HttpError
    expect(err).toBeInstanceOf(HttpError);
    expect(getSdkErrorCode(err)).not.toBe('ABORTED');
    expect(err.status).toBe(500);
  });
});
