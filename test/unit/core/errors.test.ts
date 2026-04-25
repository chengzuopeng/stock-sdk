import { describe, expect, it } from 'vitest';
import {
  HttpError,
  getSdkErrorCode,
  normalizeRequestError,
} from '../../../src/core';

describe('request error normalization', () => {
  it('should preserve TypeError instances and attach metadata', () => {
    const original = new TypeError('socket hang up');
    const normalized = normalizeRequestError(original, {
      provider: 'eastmoney',
      url: 'https://push2his.eastmoney.com/api',
    });

    expect(normalized).toBe(original);
    expect(getSdkErrorCode(normalized)).toBe('NETWORK_ERROR');
    expect(normalized.provider).toBe('eastmoney');
    expect(normalized.url).toBe('https://push2his.eastmoney.com/api');
  });

  it('should preserve AbortError instances and expose timeout metadata', () => {
    const original = new DOMException('The operation was aborted.', 'AbortError');
    const normalized = normalizeRequestError(original, {
      provider: 'tencent',
      url: 'https://qt.gtimg.cn/q=sh600519',
      timeout: 5000,
    });

    expect(normalized).toBe(original);
    expect(getSdkErrorCode(normalized)).toBe('TIMEOUT');
    expect(normalized.provider).toBe('tencent');
    expect(normalized.details).toEqual({ timeout: 5000 });
  });

  it('should keep SDK-native errors unchanged', () => {
    const error = new HttpError(429, 'Too Many Requests', 'https://example.com', 'unknown');
    const normalized = normalizeRequestError(error, {
      provider: 'eastmoney',
      url: 'https://another.example.com',
    });

    expect(normalized).toBe(error);
    expect(getSdkErrorCode(normalized)).toBe('RATE_LIMITED');
    expect(normalized.provider).toBe('unknown');
    expect(normalized.url).toBe('https://example.com');
  });
});
