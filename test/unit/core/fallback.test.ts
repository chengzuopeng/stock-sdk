import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HostFallbackManager,
  HttpError,
  RequestClient,
  normalizeRequestError,
} from '../../../src/core';

describe('HostFallbackManager', () => {
  it('should expose eastmoney fallback candidates for push2his hosts', () => {
    const manager = new HostFallbackManager();
    const urls = manager.getCandidateUrls(
      'https://push2his.eastmoney.com/api/qt/stock/kline/get',
      'eastmoney'
    );

    expect(urls[0]).toContain('push2his.eastmoney.com');
    expect(urls).toContain(
      'https://7.push2his.eastmoney.com/api/qt/stock/kline/get'
    );
    expect(urls).toContain(
      'https://91.push2his.eastmoney.com/api/qt/stock/kline/get'
    );
  });

  it('should record failures and successes by host', () => {
    const manager = new HostFallbackManager();
    const error = normalizeRequestError(new TypeError('fetch failed'), {
      provider: 'eastmoney',
      url: 'https://push2his.eastmoney.com/test',
    });

    manager.recordFailure('https://push2his.eastmoney.com/test', error);
    manager.recordSuccess('https://7.push2his.eastmoney.com/test');

    const stats = manager.getStats('eastmoney');
    expect(stats.find((item) => item.host === 'push2his.eastmoney.com')?.failureCount).toBe(1);
    expect(stats.find((item) => item.host === '7.push2his.eastmoney.com')?.successCount).toBe(1);
  });

  it('should try healthy fallback hosts before a cooling original host', () => {
    const manager = new HostFallbackManager();
    const error = normalizeRequestError(new TypeError('fetch failed'), {
      provider: 'eastmoney',
      url: 'https://push2his.eastmoney.com/test',
    });

    manager.recordFailure('https://push2his.eastmoney.com/test', error);

    const urls = manager.getCandidateUrls(
      'https://push2his.eastmoney.com/api/qt/stock/kline/get',
      'eastmoney'
    );

    expect(urls[0]).toContain('7.push2his.eastmoney.com');
    expect(urls[urls.length - 1]).toContain('push2his.eastmoney.com');
  });

  it('should return empty stats for providers without host fallback pools', () => {
    const manager = new HostFallbackManager();
    const error = normalizeRequestError(new TypeError('fetch failed'), {
      provider: 'eastmoney',
      url: 'https://push2his.eastmoney.com/test',
    });

    manager.recordFailure('https://push2his.eastmoney.com/test', error);

    expect(manager.getStats('tencent')).toEqual([]);
    expect(manager.getStats('unknown')).toEqual([]);
    expect(manager.getStats()).toHaveLength(1);
  });

  it('should only fallback for retryable network-like failures', () => {
    const manager = new HostFallbackManager();
    const networkError = normalizeRequestError(new TypeError('network error'));

    expect(manager.shouldFallback(networkError)).toBe(true);
    expect(manager.shouldFallback(new HttpError(503, 'Service Unavailable'))).toBe(true);
    expect(manager.shouldFallback(new HttpError(404, 'Not Found'))).toBe(false);
  });
});

describe('RequestClient host fallback', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should retry the next eastmoney host after a network failure', async () => {
    const visited: string[] = [];

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      visited.push(url);

      if (url.includes('https://push2his.eastmoney.com/test')) {
        return Promise.reject(new TypeError('socket closed'));
      }

      if (url.includes('https://7.push2his.eastmoney.com/test')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('fallback-ok'),
        });
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const client = new RequestClient({
      retry: { maxRetries: 0 },
      providerPolicies: {
        eastmoney: {
          retry: { maxRetries: 0 },
        },
      },
    });

    const result = await client.get('https://push2his.eastmoney.com/test');

    expect(result).toBe('fallback-ok');
    expect(visited[0]).toBe('https://push2his.eastmoney.com/test');
    expect(visited[1]).toBe('https://7.push2his.eastmoney.com/test');

    const stats = client.getHostHealth('eastmoney');
    expect(stats.find((item) => item.host === 'push2his.eastmoney.com')?.failureCount).toBe(1);
    expect(stats.find((item) => item.host === '7.push2his.eastmoney.com')?.successCount).toBe(1);
  });
});
