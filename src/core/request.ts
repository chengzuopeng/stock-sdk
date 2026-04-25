/**
 * HTTP 请求客户端（带重试机制、限流、熔断和 host fallback）
 */
import { decodeGBK, parseResponse } from './parser';
import { TENCENT_BASE_URL } from './constants';
import { RateLimiter, type RateLimiterOptions } from './rateLimiter';
import { getNextUserAgent } from './userAgentPool';
import {
  CircuitBreaker,
  CircuitBreakerError,
  type CircuitBreakerOptions,
} from './circuitBreaker';
import { HostFallbackManager, type HostHealthStats } from './fallback';
import {
  HttpError,
  getSdkErrorCode,
  normalizeRequestError,
  type RequestError,
} from './errors';
import {
  inferProviderFromUrl,
  mergeProviderPolicy,
  resolveProviderPolicy,
  type ProviderName,
  type ProviderRequestPolicy,
  type ResolvedProviderPolicy,
  type ResolvedRetryOptions,
  type RetryOptions,
} from './providerPolicy';

export { HttpError } from './errors';
export type {
  ProviderName,
  ProviderRequestPolicy,
  RetryOptions,
} from './providerPolicy';

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
  private readonly baseUrl: string;
  private readonly defaultPolicy: ResolvedProviderPolicy;
  private readonly providerPolicies: Partial<Record<ProviderName, ResolvedProviderPolicy>>;
  private readonly runtimeStates: Map<ProviderName, ProviderRuntimeState>;
  private readonly fallbackManager: HostFallbackManager;

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

    this.defaultPolicy = resolveProviderPolicy(basePolicy);
    this.providerPolicies = {};
    this.runtimeStates = new Map();
    this.fallbackManager = new HostFallbackManager();

    for (const [provider, policy] of Object.entries(options.providerPolicies ?? {})) {
      const mergedPolicy = mergeProviderPolicy(basePolicy, policy);
      this.providerPolicies[provider as ProviderName] =
        resolveProviderPolicy(mergedPolicy);
    }
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
   * 获取默认超时时间
   */
  getTimeout(): number {
    return this.defaultPolicy.timeout;
  }

  /**
   * 获取 host 健康状态
   */
  getHostHealth(provider?: ProviderName): HostHealthStats[] {
    return this.fallbackManager.getStats(provider);
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
    error: RequestError,
    attempt: number,
    retryOptions: ResolvedRetryOptions
  ): boolean {
    if (attempt >= retryOptions.maxRetries) {
      return false;
    }

    const code = getSdkErrorCode(error);

    if (code === 'TIMEOUT') {
      return retryOptions.retryOnTimeout;
    }

    if (code === 'NETWORK_ERROR') {
      return retryOptions.retryOnNetworkError;
    }

    // RATE_LIMITED 一定来自 HttpError(429)，统一交给下面的 HttpError 分支处理
    if (error instanceof HttpError) {
      return retryOptions.retryableStatusCodes.includes(error.status);
    }

    return false;
  }

  /**
   * 单 host 带重试的请求执行器
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    retryOptions: ResolvedRetryOptions,
    context: {
      provider: ProviderName;
      url: string;
      timeout: number;
    },
    attempt: number = 0
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      const normalized = normalizeRequestError(error, context);

      if (this.shouldRetry(normalized, attempt, retryOptions)) {
        const delay = this.calculateDelay(attempt, retryOptions);

        if (retryOptions.onRetry) {
          retryOptions.onRetry(attempt + 1, normalized, delay);
        }

        await this.sleep(delay);
        return this.executeWithRetry(requestFn, retryOptions, context, attempt + 1);
      }

      throw normalized;
    }
  }

  /**
   * 执行单次 HTTP 请求
   */
  private async performRequest<T>(
    url: string,
    state: ProviderRuntimeState,
    provider: ProviderName,
    responseType: GetOptions['responseType'] = 'text'
  ): Promise<T> {
    if (state.rateLimiter) {
      await state.rateLimiter.acquire();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), state.policy.timeout);

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

      switch (responseType) {
        case 'json':
          return await resp.json();
        case 'arraybuffer':
          return (await resp.arrayBuffer()) as T;
        default:
          return (await resp.text()) as T;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 发送 GET 请求（带自动重试、限流、熔断和 fallback）
   */
  async get<T = string>(
    url: string,
    options: GetOptions = {}
  ): Promise<T> {
    const provider = inferProviderFromUrl(url, options.provider);
    const state = this.getProviderState(provider);

    if (state.circuitBreaker && !state.circuitBreaker.canRequest()) {
      throw new CircuitBreakerError('Circuit breaker is OPEN, request rejected');
    }

    const candidateUrls = this.fallbackManager.getCandidateUrls(url, provider);
    let lastError: RequestError | undefined;

    for (let index = 0; index < candidateUrls.length; index++) {
      const candidateUrl = candidateUrls[index];
      // 仅首个 host 走完整重试预算；后续 fallback host 只尝试一次，
      // 避免 (maxRetries+1) × hosts 的延迟倍乘。
      const retryForHost: ResolvedRetryOptions =
        index === 0
          ? state.policy.retry
          : { ...state.policy.retry, maxRetries: 0 };

      try {
        const result = await this.executeWithRetry(
          () => this.performRequest<T>(candidateUrl, state, provider, options.responseType),
          retryForHost,
          {
            provider,
            url: candidateUrl,
            timeout: state.policy.timeout,
          }
        );

        state.circuitBreaker?.recordSuccess();
        this.fallbackManager.recordSuccess(candidateUrl);
        return result;
      } catch (error) {
        const normalized = normalizeRequestError(error, {
          provider,
          url: candidateUrl,
          timeout: state.policy.timeout,
        });
        lastError = normalized;
        this.fallbackManager.recordFailure(candidateUrl, normalized);

        const shouldTryNextHost =
          index < candidateUrls.length - 1 &&
          this.fallbackManager.shouldFallback(normalized);

        if (shouldTryNextHost) {
          continue;
        }

        state.circuitBreaker?.recordFailure();
        throw normalized;
      }
    }

    state.circuitBreaker?.recordFailure();
    throw lastError ?? new CircuitBreakerError('Request failed without a concrete error');
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
