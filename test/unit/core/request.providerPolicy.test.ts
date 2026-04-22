import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CircuitBreakerError,
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
});
