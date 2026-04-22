/**
 * HTTP 请求客户端（带重试机制、限流和熔断）
 */
import { decodeGBK, parseResponse } from './parser';
import {
  DEFAULT_TIMEOUT,
  TENCENT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_DELAY,
  DEFAULT_MAX_DELAY,
  DEFAULT_BACKOFF_MULTIPLIER,
  DEFAULT_RETRYABLE_STATUS_CODES,
} from './constants';
import { RateLimiter, type RateLimiterOptions } from './rateLimiter';
import { getNextUserAgent } from './userAgentPool';
import { CircuitBreaker, CircuitBreakerError, type CircuitBreakerOptions } from './circuitBreaker';

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
 * HTTP 错误类
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly url?: string,
    public readonly provider?: string
  ) {
    const details = statusText ? ` ${statusText}` : '';
    const urlInfo = url ? `, url: ${url}` : '';
    const providerInfo = provider ? `, provider: ${provider}` : '';
    super(`HTTP error! status: ${status}${details}${urlInfo}${providerInfo}`);
    this.name = 'HttpError';
  }
}

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
 * 请求客户端配置选项
 */
export interface RequestClientOptions {
  baseUrl?: string;
  timeout?: number;
  retry?: RetryOptions;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 自定义 User-Agent（浏览器环境可能会被忽略） */
  userAgent?: string;
  /** 限流配置（防止请求过快被频控） */
  rateLimit?: RateLimiterOptions;
  /** 是否启用 UA 轮换（仅 Node.js 有效），默认 false */
  rotateUserAgent?: boolean;
  /** 熔断器配置（连续失败时暂停请求） */
  circuitBreaker?: CircuitBreakerOptions;
  /**
   * Provider 级请求策略。
   * 未配置的 provider 会回退到全局默认配置。
   */
  providerPolicies?: Partial<Record<ProviderName, ProviderRequestPolicy>>;
}

/**
 * 内部使用的完整重试配置
 */
interface ResolvedRetryOptions {
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
interface ResolvedProviderPolicy {
  timeout: number;
  retry: ResolvedRetryOptions;
  headers: Record<string, string>;
  rotateUserAgent: boolean;
  rateLimit?: RateLimiterOptions;
  circuitBreaker?: CircuitBreakerOptions;
}

/**
 * Provider 级运行时状态
 */
interface ProviderRuntimeState {
  policy: ResolvedProviderPolicy;
  rateLimiter: RateLimiter | null;
  circuitBreaker: CircuitBreaker | null;
}

/**
 * GET 请求选项
 */
interface GetOptions {
  responseType?: 'text' | 'json' | 'arraybuffer';
  provider?: ProviderName;
}

export class RequestClient {
  private baseUrl: string;
  private defaultPolicy: ResolvedProviderPolicy;
  private providerPolicies: Partial<Record<ProviderName, ResolvedProviderPolicy>>;
  private runtimeStates: Map<ProviderName, ProviderRuntimeState>;

  constructor(options: RequestClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? TENCENT_BASE_URL;
    const basePolicy: ProviderRequestPolicy = {
      timeout: options.timeout,
      retry: options.retry,
      headers: options.headers,
      userAgent: options.userAgent,
      rateLimit: options.rateLimit,
      rotateUserAgent: options.rotateUserAgent,
      circuitBreaker: options.circuitBreaker,
    };

    this.defaultPolicy = this.resolveProviderPolicy(basePolicy);
    this.providerPolicies = {};
    this.runtimeStates = new Map();

    for (const [provider, policy] of Object.entries(options.providerPolicies ?? {})) {
      const mergedPolicy = this.mergeProviderPolicy(basePolicy, policy);
      this.providerPolicies[provider as ProviderName] =
        this.resolveProviderPolicy(mergedPolicy);
    }
  }

  /**
   * 解析重试配置，填充默认值
   */
  private resolveRetryOptions(options?: RetryOptions): ResolvedRetryOptions {
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
  private normalizeHeaders(
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
  private mergeProviderPolicy(
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
  private resolveProviderPolicy(
    policy: ProviderRequestPolicy = {}
  ): ResolvedProviderPolicy {
    return {
      timeout: policy.timeout ?? DEFAULT_TIMEOUT,
      retry: this.resolveRetryOptions(policy.retry),
      headers: this.normalizeHeaders(policy.headers, policy.userAgent),
      rotateUserAgent: policy.rotateUserAgent ?? false,
      rateLimit: policy.rateLimit
        ? { ...policy.rateLimit }
        : undefined,
      circuitBreaker: policy.circuitBreaker
        ? { ...policy.circuitBreaker }
        : undefined,
    };
  }

  /**
   * 获取 provider 运行时状态，按需初始化限流器和熔断器。
   */
  private getProviderState(provider: ProviderName): ProviderRuntimeState {
    const cached = this.runtimeStates.get(provider);
    if (cached) {
      return cached;
    }

    const policy = this.providerPolicies[provider] ?? this.defaultPolicy;
    const state: ProviderRuntimeState = {
      policy,
      rateLimiter: policy.rateLimit ? new RateLimiter(policy.rateLimit) : null,
      circuitBreaker: policy.circuitBreaker
        ? new CircuitBreaker(policy.circuitBreaker)
        : null,
    };
    this.runtimeStates.set(provider, state);
    return state;
  }

  /**
   * 从 URL 推断数据源
   */
  private inferProvider(url: string, explicitProvider?: ProviderName): ProviderName {
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

  /**
   * 获取超时时间
   */
  getTimeout(): number {
    return this.defaultPolicy.timeout;
  }

  /**
   * 计算指数退避延迟时间
   */
  private calculateDelay(
    attempt: number,
    retryOptions: ResolvedRetryOptions
  ): number {
    const delay = Math.min(
      retryOptions.baseDelay *
      Math.pow(retryOptions.backoffMultiplier, attempt),
      retryOptions.maxDelay
    );
    // 添加随机抖动 (0-100ms) 防止惊群效应
    return delay + Math.random() * 100;
  }

  /**
   * 休眠指定毫秒
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(
    error: unknown,
    attempt: number,
    retryOptions: ResolvedRetryOptions
  ): boolean {
    // 超过最大重试次数
    if (attempt >= retryOptions.maxRetries) {
      return false;
    }

    // 超时错误 (AbortError)
    if (error instanceof DOMException && error.name === 'AbortError') {
      return retryOptions.retryOnTimeout;
    }

    // 网络错误 (fetch 失败，如 DNS 解析失败、连接被拒绝等)
    if (error instanceof TypeError) {
      return retryOptions.retryOnNetworkError;
    }

    // HTTP 状态码错误
    if (error instanceof HttpError) {
      return retryOptions.retryableStatusCodes.includes(error.status);
    }

    return false;
  }

  /**
   * 带重试的请求执行器（集成熔断器）
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    state: ProviderRuntimeState,
    provider: ProviderName,
    attempt: number = 0
  ): Promise<T> {
    try {
      const result = await requestFn();
      // 请求成功，记录到熔断器
      state.circuitBreaker?.recordSuccess();
      return result;
    } catch (error) {
      if (this.shouldRetry(error, attempt, state.policy.retry)) {
        const delay = this.calculateDelay(attempt, state.policy.retry);

        // 触发重试回调
        if (state.policy.retry.onRetry && error instanceof Error) {
          state.policy.retry.onRetry(attempt + 1, error, delay);
        }

        await this.sleep(delay);
        return this.executeWithRetry(requestFn, state, provider, attempt + 1);
      }
      // 重试耗尽，记录失败到熔断器
      state.circuitBreaker?.recordFailure();
      if (error instanceof Error) {
        (error as { provider?: ProviderName }).provider = provider;
      }
      throw error;
    }
  }

  /**
   * 发送 GET 请求（带自动重试、限流和熔断保护）
   */
  async get<T = string>(
    url: string,
    options: GetOptions = {}
  ): Promise<T> {
    const provider = this.inferProvider(url, options.provider);
    const state = this.getProviderState(provider);

    // 熔断器检查：如果熔断器打开，直接抛出错误
    if (state.circuitBreaker && !state.circuitBreaker.canRequest()) {
      throw new CircuitBreakerError('Circuit breaker is OPEN, request rejected');
    }

    // 限流：等待获取令牌
    if (state.rateLimiter) {
      await state.rateLimiter.acquire();
    }

    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), state.policy.timeout);

      // 构建请求头，支持 UA 轮换
      const requestHeaders = { ...state.policy.headers };
      if (state.policy.rotateUserAgent) {
        const rotatedUA = getNextUserAgent();
        if (rotatedUA) {
          requestHeaders['User-Agent'] = rotatedUA;
        }
      }

      try {
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: requestHeaders,
        });

        if (!resp.ok) {
          throw new HttpError(resp.status, resp.statusText, url, provider);
        }

        switch (options.responseType) {
          case 'json':
            return await resp.json();
          case 'arraybuffer':
            return (await resp.arrayBuffer()) as T;
          default:
            return (await resp.text()) as T;
        }
      } catch (error) {
        if (error instanceof Error) {
          (error as { url?: string; provider?: string }).url = url;
          (error as { url?: string; provider?: string }).provider = provider;
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }, state, provider);
  }

  /**
   * 腾讯财经专用请求（GBK 解码，带自动重试）
   */
  async getTencentQuote(
    params: string
  ): Promise<{ key: string; fields: string[] }[]> {
    const url = `${this.baseUrl}/?q=${encodeURIComponent(params)}`;
    const buffer = await this.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      provider: 'tencent',
    });
    const text = decodeGBK(buffer);
    return parseResponse(text);
  }
}
