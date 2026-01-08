/**
 * 重试机制测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestClient, HttpError } from './core';

describe('RequestClient 重试机制', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('指数退避计算', () => {
    it('should calculate delay with exponential backoff', async () => {
      const delays: number[] = [];
      let attempts = 0;

      // Mock fetch to always fail
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'));

      const client = new RequestClient({
        timeout: 1000,
        retry: {
          maxRetries: 3,
          baseDelay: 100,
          backoffMultiplier: 2,
          onRetry: (attempt, error, delay) => {
            delays.push(delay);
            attempts = attempt;
          },
        },
      });

      try {
        await client.get('https://example.com/test');
      } catch {
        // Expected to fail
      }

      expect(attempts).toBe(3);
      // 第一次重试: 100 * 2^0 = ~100ms (+ jitter)
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[0]).toBeLessThan(250);
      // 第二次重试: 100 * 2^1 = ~200ms (+ jitter)
      expect(delays[1]).toBeGreaterThanOrEqual(200);
      expect(delays[1]).toBeLessThan(350);
      // 第三次重试: 100 * 2^2 = ~400ms (+ jitter)
      expect(delays[2]).toBeGreaterThanOrEqual(400);
      expect(delays[2]).toBeLessThan(550);
    });
  });

  describe('重试条件', () => {
    it('should retry on network error', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('success'),
        });
      });

      const client = new RequestClient({
        retry: { maxRetries: 3, baseDelay: 10 },
      });

      const result = await client.get('https://example.com/test');
      expect(result).toBe('success');
      expect(callCount).toBe(3);
    });

    it('should retry on HTTP 500 error', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
        });
      });

      const client = new RequestClient({
        retry: { maxRetries: 3, baseDelay: 10 },
      });

      const result = await client.get('https://example.com/test', { responseType: 'json' });
      expect(result).toEqual({ data: 'success' });
      expect(callCount).toBe(2);
    });

    it('should NOT retry on HTTP 404 error', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        });
      });

      const client = new RequestClient({
        retry: { maxRetries: 3, baseDelay: 10 },
      });

      await expect(client.get('https://example.com/test')).rejects.toThrow(HttpError);
      expect(callCount).toBe(1); // No retry for 404
    });

    it('should NOT retry on HTTP 401 error', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });
      });

      const client = new RequestClient({
        retry: { maxRetries: 3, baseDelay: 10 },
      });

      await expect(client.get('https://example.com/test')).rejects.toThrow(HttpError);
      expect(callCount).toBe(1); // No retry for 401
    });
  });

  describe('maxRetries 配置', () => {
    it('should respect maxRetries limit', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject(new TypeError('Network error'));
      });

      const client = new RequestClient({
        retry: { maxRetries: 2, baseDelay: 10 },
      });

      await expect(client.get('https://example.com/test')).rejects.toThrow();
      expect(callCount).toBe(3); // 1 initial + 2 retries
    });

    it('should not retry when maxRetries is 0', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject(new TypeError('Network error'));
      });

      const client = new RequestClient({
        retry: { maxRetries: 0 },
      });

      await expect(client.get('https://example.com/test')).rejects.toThrow();
      expect(callCount).toBe(1); // No retries
    });
  });

  describe('选择性重试', () => {
    it('should respect retryOnNetworkError = false', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.reject(new TypeError('Network error'));
      });

      const client = new RequestClient({
        retry: { maxRetries: 3, retryOnNetworkError: false, baseDelay: 10 },
      });

      await expect(client.get('https://example.com/test')).rejects.toThrow();
      expect(callCount).toBe(1); // No retry because retryOnNetworkError is false
    });

    it('should respect custom retryableStatusCodes', async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 418, // I'm a teapot - custom status
            statusText: 'I am a teapot',
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('success'),
        });
      });

      const client = new RequestClient({
        retry: {
          maxRetries: 3,
          baseDelay: 10,
          retryableStatusCodes: [418], // Custom: retry on 418
        },
      });

      const result = await client.get('https://example.com/test');
      expect(result).toBe('success');
      expect(callCount).toBe(3);
    });
  });

  describe('onRetry 回调', () => {
    it('should call onRetry callback on each retry', async () => {
      const onRetry = vi.fn();
      let callCount = 0;

      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new TypeError('Network error'));
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('success'),
        });
      });

      const client = new RequestClient({
        retry: { maxRetries: 5, baseDelay: 10, onRetry },
      });

      await client.get('https://example.com/test');

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(TypeError), expect.any(Number));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(TypeError), expect.any(Number));
    });
  });

  describe('HttpError', () => {
    it('should include status and statusText', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      });

      const client = new RequestClient({
        retry: { maxRetries: 0 },
      });

      try {
        await client.get('https://example.com/test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).status).toBe(403);
        expect((error as HttpError).statusText).toBe('Forbidden');
        expect((error as HttpError).message).toContain('403');
      }
    });
  });
});
