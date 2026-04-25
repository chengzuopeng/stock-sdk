import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CircuitBreakerError,
  RateLimiter,
  RequestClient,
} from '../../../src/core';

describe('RequestClient provider policies', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should allow provider-specific retry overrides', async () => {
    let callCount = 0;

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (url.includes('eastmoney.com') && callCount === 1) {
        return Promise.reject(new TypeError('Network error'));
      }

      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('success'),
      });
    });

    const client = new RequestClient({
      retry: { maxRetries: 0, baseDelay: 1 },
      providerPolicies: {
        eastmoney: {
          retry: { maxRetries: 1, baseDelay: 1 },
        },
      },
    });

    const result = await client.get('https://push2his.eastmoney.com/test');
    expect(result).toBe('success');
    expect(callCount).toBe(2);
  });

  it('should isolate circuit breaker state by provider', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('eastmoney.com')) {
        return Promise.reject(new TypeError('Eastmoney failure'));
      }

      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('tencent-ok'),
      });
    });

    const client = new RequestClient({
      retry: { maxRetries: 0 },
      providerPolicies: {
        eastmoney: {
          circuitBreaker: { failureThreshold: 1, resetTimeout: 1000 },
        },
        tencent: {
          circuitBreaker: { failureThreshold: 1, resetTimeout: 1000 },
        },
      },
    });

    await expect(
      client.get('https://push2his.eastmoney.com/test')
    ).rejects.toThrow(TypeError);

    await expect(
      client.get('https://91.push2.eastmoney.com/test')
    ).rejects.toThrow(CircuitBreakerError);

    await expect(
      client.get('https://qt.gtimg.cn/test')
    ).resolves.toBe('tencent-ok');
  });

  it('should apply rate limiting to every retry attempt', async () => {
    const acquire = vi
      .spyOn(RateLimiter.prototype, 'acquire')
      .mockResolvedValue(undefined);
    let callCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new TypeError('Network error'));
      }

      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('success'),
      });
    });

    const client = new RequestClient({
      rateLimit: { requestsPerSecond: 1, maxBurst: 1 },
      retry: { maxRetries: 1, baseDelay: 1 },
    });

    await expect(client.get('https://qt.gtimg.cn/test')).resolves.toBe('success');

    expect(callCount).toBe(2);
    expect(acquire).toHaveBeenCalledTimes(2);
  });

  it('should replace case-insensitive User-Agent headers when rotating UA', async () => {
    let requestHeaders: Record<string, string> | undefined;

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      requestHeaders = init?.headers as Record<string, string>;
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('success'),
      });
    });

    const client = new RequestClient({
      rotateUserAgent: true,
      headers: {
        'user-agent': 'custom-lowercase-ua',
        'X-Request-Source': 'unit-test',
      },
      retry: { maxRetries: 0 },
    });

    await expect(client.get('https://qt.gtimg.cn/test')).resolves.toBe('success');

    expect(requestHeaders).toBeDefined();
    expect(requestHeaders?.['user-agent']).toBeUndefined();
    expect(requestHeaders?.['User-Agent']).toBeDefined();
    expect(requestHeaders?.['User-Agent']).not.toBe('custom-lowercase-ua');
    expect(requestHeaders?.['X-Request-Source']).toBe('unit-test');
  });
});
