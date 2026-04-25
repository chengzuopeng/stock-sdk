import {
  DEFAULT_TIMEOUT,
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_DELAY,
  DEFAULT_MAX_DELAY,
  DEFAULT_BACKOFF_MULTIPLIER,
  DEFAULT_RETRYABLE_STATUS_CODES,
} from './constants';
import type { RateLimiterOptions } from './rateLimiter';
import type { CircuitBreakerOptions } from './circuitBreaker';

/**
 * 已知的数据源名称
 */
export type ProviderName =
  | 'tencent'
  | 'eastmoney'
  | 'sina'
  | 'linkdiary'
  | 'unknown';

/**
 * 重试配置选项
 */
export interface RetryOptions {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 初始退避时间（毫秒），默认 1000 */
  baseDelay?: number;
  /** 最大退避时间（毫秒），默认 30000 */
  maxDelay?: number;
  /** 退避系数，默认 2 */
  backoffMultiplier?: number;
  /** 可重试的 HTTP 状态码，默认 [408, 429, 500, 502, 503, 504] */
  retryableStatusCodes?: number[];
  /** 是否在网络错误时重试，默认 true */
  retryOnNetworkError?: boolean;
  /** 是否在超时时重试，默认 true */
  retryOnTimeout?: boolean;
  /** 重试回调（用于日志等） */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Provider 级请求策略
 */
export interface ProviderRequestPolicy {
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 重试配置 */
  retry?: RetryOptions;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 自定义 User-Agent（浏览器环境可能会被忽略） */
  userAgent?: string;
  /** 限流配置（防止请求过快被频控） */
  rateLimit?: RateLimiterOptions;
  /** 是否启用 UA 轮换（仅 Node.js 有效） */
  rotateUserAgent?: boolean;
  /** 熔断器配置（连续失败时暂停请求） */
  circuitBreaker?: CircuitBreakerOptions;
}

/**
 * 内部使用的完整重试配置
 */
export interface ResolvedRetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryOnNetworkError: boolean;
  retryOnTimeout: boolean;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * 归一化后的 provider 请求策略
 */
export interface ResolvedProviderPolicy {
  timeout: number;
  retry: ResolvedRetryOptions;
  headers: Record<string, string>;
  rotateUserAgent: boolean;
  rateLimit?: RateLimiterOptions;
  circuitBreaker?: CircuitBreakerOptions;
}

/**
 * 解析重试配置，填充默认值
 */
export function resolveRetryOptions(options?: RetryOptions): ResolvedRetryOptions {
  return {
    maxRetries: options?.maxRetries ?? DEFAULT_MAX_RETRIES,
    baseDelay: options?.baseDelay ?? DEFAULT_BASE_DELAY,
    maxDelay: options?.maxDelay ?? DEFAULT_MAX_DELAY,
    backoffMultiplier: options?.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER,
    retryableStatusCodes: options?.retryableStatusCodes ?? DEFAULT_RETRYABLE_STATUS_CODES,
    retryOnNetworkError: options?.retryOnNetworkError ?? true,
    retryOnTimeout: options?.retryOnTimeout ?? true,
    onRetry: options?.onRetry,
  };
}

/**
 * 归一化请求头，确保自定义 UA 不会覆盖显式传入的 User-Agent。
 */
export function normalizeHeaders(
  headers?: Record<string, string>,
  userAgent?: string
): Record<string, string> {
  const normalizedHeaders = { ...(headers ?? {}) };
  if (userAgent) {
    const hasUserAgent = Object.keys(normalizedHeaders).some(
      (key) => key.toLowerCase() === 'user-agent'
    );
    if (!hasUserAgent) {
      normalizedHeaders['User-Agent'] = userAgent;
    }
  }
  return normalizedHeaders;
}

/**
 * 合并 provider 策略，嵌套对象按浅合并处理。
 */
export function mergeProviderPolicy(
  base: ProviderRequestPolicy,
  override?: ProviderRequestPolicy
): ProviderRequestPolicy {
  if (!override) {
    return {
      ...base,
      headers: { ...(base.headers ?? {}) },
      retry: base.retry ? { ...base.retry } : undefined,
      rateLimit: base.rateLimit ? { ...base.rateLimit } : undefined,
      circuitBreaker: base.circuitBreaker ? { ...base.circuitBreaker } : undefined,
    };
  }

  return {
    timeout: override.timeout ?? base.timeout,
    retry: override.retry
      ? { ...(base.retry ?? {}), ...override.retry }
      : base.retry
        ? { ...base.retry }
        : undefined,
    headers: {
      ...(base.headers ?? {}),
      ...(override.headers ?? {}),
    },
    userAgent: override.userAgent ?? base.userAgent,
    rateLimit: override.rateLimit
      ? { ...(base.rateLimit ?? {}), ...override.rateLimit }
      : base.rateLimit
        ? { ...base.rateLimit }
        : undefined,
    rotateUserAgent: override.rotateUserAgent ?? base.rotateUserAgent,
    circuitBreaker: override.circuitBreaker
      ? { ...(base.circuitBreaker ?? {}), ...override.circuitBreaker }
      : base.circuitBreaker
        ? { ...base.circuitBreaker }
        : undefined,
  };
}

/**
 * 解析 provider 策略，填充默认值。
 */
export function resolveProviderPolicy(
  policy: ProviderRequestPolicy = {}
): ResolvedProviderPolicy {
  return {
    timeout: policy.timeout ?? DEFAULT_TIMEOUT,
    retry: resolveRetryOptions(policy.retry),
    headers: normalizeHeaders(policy.headers, policy.userAgent),
    rotateUserAgent: policy.rotateUserAgent ?? false,
    rateLimit: policy.rateLimit ? { ...policy.rateLimit } : undefined,
    circuitBreaker: policy.circuitBreaker ? { ...policy.circuitBreaker } : undefined,
  };
}

/**
 * 从 URL 推断数据源
 */
export function inferProviderFromUrl(
  url: string,
  explicitProvider?: ProviderName
): ProviderName {
  if (explicitProvider) {
    return explicitProvider;
  }

  try {
    const host = new URL(url).hostname;
    if (host.includes('eastmoney.com')) return 'eastmoney';
    if (host.includes('gtimg.cn')) return 'tencent';
    if (host.includes('sina.com.cn')) return 'sina';
    if (host.includes('linkdiary.cn')) return 'linkdiary';
  } catch {
    return 'unknown';
  }
  return 'unknown';
}
