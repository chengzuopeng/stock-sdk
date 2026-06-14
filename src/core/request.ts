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
  SdkError,
  AbortedError,
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

/** 可注入的 fetch 实现（默认走运行时全局 fetch） */
export type FetchImpl = typeof fetch;

/** 请求生命周期事件 */
export type RequestTraceEvent =
  | 'request'
  | 'response'
  | 'error'
  | 'retry'
  | 'fallback';

/** 请求生命周期上下文 */
export interface RequestLifecycleContext {
  provider: ProviderName;
  url: string;
  timeout: number;
  attempt: number;
  responseType: GetOptions['responseType'];
}

/**
 * 请求生命周期钩子（client 级）。
 * 所有回调都在 try/catch 中调用，回调内抛错不会影响主请求流程。
 */
export interface RequestHooks {
  onRequest?(ctx: RequestLifecycleContext): void;
  onResponse?(
    ctx: RequestLifecycleContext,
    meta: { status: number; durationMs: number }
  ): void;
  onError?(ctx: RequestLifecycleContext, error: SdkError): void;
  onRetry?(ctx: RequestLifecycleContext, error: SdkError, delay: number): void;
  trace?(event: RequestTraceEvent, ctx: RequestLifecycleContext): void;
}

/**
 * 判断 error 是否「形似 abort」：标准 AbortError(DOMException 或 Error)，
 * 或 undici 连接被 abort 时抛的 TypeError，其真因(error.cause)是 AbortError。
 * 兜底用：自定义 fetchImpl 可能不透传 signal.reason 而抛自建 AbortError，
 * 此时按 reason 同一性溯源会落空，靠形状判定补救；
 * 同时不误伤 try 块里主动抛出的 HttpError / SdkError(PARSE_ERROR 等)业务错误。
 */
function isAbortShapedError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return true;
    }
    // undici：连接被 abort 时抛 TypeError: terminated，真正的中止原因挂在 cause 上
    const cause = (error as { cause?: unknown }).cause;
    if (
      (cause instanceof Error || cause instanceof DOMException) &&
      cause.name === 'AbortError'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 合并多个 AbortSignal：任一触发即 abort。
 * 优先用原生 `AbortSignal.any`（Node 18.17+/20.3+、现代浏览器）；
 * 缺失时（Node 18.0–18.16）退回手写联动，并在结束后清理监听防泄漏。
 */
interface CombinedSignal {
  signal: AbortSignal | undefined;
  /** 请求结束后调用以移除 fallback 注册的监听，防止长生命周期 signal 泄漏 */
  cleanup: () => void;
}

const NO_CLEANUP = () => {};

function combineSignals(signals: (AbortSignal | undefined)[]): CombinedSignal {
  const list = signals.filter((s): s is AbortSignal => Boolean(s));
  if (list.length === 0) return { signal: undefined, cleanup: NO_CLEANUP };
  if (list.length === 1) return { signal: list[0], cleanup: NO_CLEANUP };

  const anyFn = (
    AbortSignal as unknown as {
      any?: (signals: AbortSignal[]) => AbortSignal;
    }
  ).any;
  if (typeof anyFn === 'function') {
    return { signal: anyFn(list), cleanup: NO_CLEANUP };
  }

  // fallback（Node 18.0–18.16）：手动联动，并记录监听以便请求结束后移除
  const controller = new AbortController();
  const abort = (reason: unknown) => {
    if (!controller.signal.aborted) controller.abort(reason);
  };
  const registered: Array<{ s: AbortSignal; handler: () => void }> = [];
  for (const s of list) {
    if (s.aborted) {
      abort(s.reason);
      break;
    }
    const handler = () => abort(s.reason);
    s.addEventListener('abort', handler, { once: true });
    registered.push({ s, handler });
  }
  const cleanup = () => {
    for (const { s, handler } of registered) {
      s.removeEventListener('abort', handler);
    }
  };
  return { signal: controller.signal, cleanup };
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
  /** 可注入的自定义 fetch 实现（代理 / mock / 日志），默认运行时全局 fetch */
  fetchImpl?: FetchImpl;
  /** client 级外部取消信号；与每次请求的 timeout 合并，触发后归类为 ABORTED */
  signal?: AbortSignal;
  /** 请求生命周期钩子 */
  hooks?: RequestHooks;
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
export interface GetOptions {
  responseType?: 'text' | 'json' | 'arraybuffer';
  provider?: ProviderName;
  /** 单次请求的自定义 fetch（优先级高于 client 级 fetchImpl） */
  fetchImpl?: FetchImpl;
  /** 单次请求的外部取消信号（触发后归类为 ABORTED） */
  signal?: AbortSignal;
}

export class RequestClient {
  private readonly baseUrl: string;
  private readonly defaultPolicy: ResolvedProviderPolicy;
  private readonly providerPolicies: Partial<Record<ProviderName, ResolvedProviderPolicy>>;
  private readonly runtimeStates: Map<ProviderName, ProviderRuntimeState>;
  private readonly fallbackManager: HostFallbackManager;
  private readonly fetchImpl?: FetchImpl;
  private readonly clientSignal?: AbortSignal;
  private readonly hooks?: RequestHooks;

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
    this.fetchImpl = options.fetchImpl;
    this.clientSignal = options.signal;
    this.hooks = options.hooks;

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

  /** 安全调用钩子：回调抛错不影响主流程 */
  private safe(fn: () => void): void {
    try {
      fn();
    } catch {
      /* 钩子回调抛错被吞掉，不影响请求主流程 */
    }
  }

  /** 把归一化后的 RequestError 转成 SdkError，供钩子使用 */
  private toSdkError(error: RequestError): SdkError {
    if (error instanceof SdkError) {
      return error;
    }
    return new SdkError({
      code: getSdkErrorCode(error) ?? 'NETWORK_ERROR',
      message: error.message,
      provider: error.provider,
      url: error.url,
      status: error.status,
      details: error.details,
      cause: error,
    });
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

    // 外部主动取消不重试
    if (code === 'ABORTED') {
      return false;
    }

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
    requestFn: (attempt: number) => Promise<T>,
    retryOptions: ResolvedRetryOptions,
    context: {
      provider: ProviderName;
      url: string;
      timeout: number;
      responseType: GetOptions['responseType'];
    },
    attempt: number = 0
  ): Promise<T> {
    try {
      return await requestFn(attempt);
    } catch (error) {
      const normalized = normalizeRequestError(error, context);
      const ctx: RequestLifecycleContext = {
        provider: context.provider,
        url: context.url,
        timeout: context.timeout,
        attempt,
        responseType: context.responseType,
      };
      this.safe(() => this.hooks?.onError?.(ctx, this.toSdkError(normalized)));
      this.safe(() => this.hooks?.trace?.('error', ctx));

      if (this.shouldRetry(normalized, attempt, retryOptions)) {
        const delay = this.calculateDelay(attempt, retryOptions);

        if (retryOptions.onRetry) {
          retryOptions.onRetry(attempt + 1, normalized, delay);
        }
        this.safe(() =>
          this.hooks?.onRetry?.(ctx, this.toSdkError(normalized), delay)
        );
        this.safe(() => this.hooks?.trace?.('retry', ctx));

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
    responseType: GetOptions['responseType'] = 'text',
    perCall: { fetchImpl?: FetchImpl; signal?: AbortSignal } = {},
    attempt = 0
  ): Promise<T> {
    if (state.rateLimiter) {
      await state.rateLimiter.acquire();
    }

    const timeoutController = new AbortController();
    // 超时 reason 必须是 DOMException(AbortError)：fetch 会把 signal.reason 原样作为
    // 拒绝值抛出，若用 Symbol/裸值，normalizeRequestError 无法识别 → 超时被错分类为
    // NETWORK_ERROR(绕过 retryOnTimeout、hooks/主机健康记错码)。
    // 每个请求新建实例：attachErrorMetadata 会往错误上写 provider/url，共享实例会被
    // 首个超时请求的上下文污染。
    const timeoutReason = new DOMException(
      `Request timed out after ${state.policy.timeout}ms`,
      'AbortError'
    );
    const timeoutId = setTimeout(
      () => timeoutController.abort(timeoutReason),
      state.policy.timeout
    );
    // 三源合并：内部 timeout + per-call signal + client 级 signal 都能取消该请求
    // （此前用 perCall.signal ?? clientSignal，会让 client 级取消对带 per-call signal 的请求失效）
    const { signal, cleanup: cleanupSignals } = combineSignals([
      timeoutController.signal,
      perCall.signal,
      this.clientSignal,
    ]);
    const doFetch = perCall.fetchImpl ?? this.fetchImpl ?? globalThis.fetch;

    const requestHeaders = { ...state.policy.headers };
    if (state.policy.rotateUserAgent) {
      const rotatedUA = getNextUserAgent();
      if (rotatedUA) {
        for (const key of Object.keys(requestHeaders)) {
          if (key.toLowerCase() === 'user-agent') {
            delete requestHeaders[key];
          }
        }
        requestHeaders['User-Agent'] = rotatedUA;
      }
    }

    const ctx: RequestLifecycleContext = {
      provider,
      url,
      timeout: state.policy.timeout,
      attempt,
      responseType,
    };
    this.safe(() => this.hooks?.onRequest?.(ctx));
    this.safe(() => this.hooks?.trace?.('request', ctx));
    const startedAt = Date.now();

    try {
      const resp = await doFetch(url, {
        signal,
        headers: requestHeaders,
      });

      this.safe(() =>
        this.hooks?.onResponse?.(ctx, {
          status: resp.status,
          durationMs: Date.now() - startedAt,
        })
      );
      this.safe(() => this.hooks?.trace?.('response', ctx));

      if (!resp.ok) {
        throw new HttpError(resp.status, resp.statusText, url, provider);
      }

      switch (responseType) {
        case 'json':
          // 200 但响应体不是合法 JSON（如反爬 HTML / 验证码页）会让 resp.json() 抛 SyntaxError。
          // 这类是确定性的数据错误，若按 NETWORK_ERROR 处理会被同 host 反复重试，放大无谓负载。
          // 显式归类为 PARSE_ERROR：shouldRetry 不重试，但 shouldFallback 仍允许切换备用 host。
          try {
            return await resp.json();
          } catch (parseError) {
            throw new SdkError({
              code: 'PARSE_ERROR',
              message: `Failed to parse JSON response from ${url}`,
              provider,
              url,
              cause: parseError,
            });
          }
        case 'arraybuffer':
          return (await resp.arrayBuffer()) as T;
        default:
          return (await resp.text()) as T;
      }
    } catch (error) {
      // fetch 以 signal.reason【原样】作为拒绝值（undici 偶见把 reason 挂在 cause 上），
      // 而 reason 可以是任意值（string / 自定义 Error / DOMException），不能只靠错误
      // 形状分类。优先按「reason 同一性」把错误溯源到具体 signal：
      const matchesReason = (s: AbortSignal | undefined): boolean => {
        if (!s?.aborted) return false;
        if (error === s.reason) return true;
        return (
          error instanceof Error &&
          (error as { cause?: unknown }).cause === s.reason
        );
      };
      // 内部超时命中 → 保持原错误（DOMException AbortError），由 normalizeRequestError
      // 归一化为 TIMEOUT；与外部取消同时发生时，以先触发者（即 error 的来源）为准。
      if (!matchesReason(timeoutController.signal)) {
        // 外部取消（per-call 或 client 级）→ ABORTED，无论 reason 形状。
        // 形状判定仅作兜底：自定义 fetchImpl 可能不透传 reason 而抛自建 AbortError；
        // 同时要求「外部 signal 确已取消」，避免把该 client 后续真实的 HttpError /
        // PARSE_ERROR 误掩盖成 AbortedError(丢失 status/cause、误导 fallback 与熔断器)。
        const externalAborted =
          perCall.signal?.aborted || this.clientSignal?.aborted;
        if (
          matchesReason(perCall.signal) ||
          matchesReason(this.clientSignal) ||
          (externalAborted && isAbortShapedError(error))
        ) {
          throw new AbortedError(
            'Request aborted by external signal',
            provider,
            url
          );
        }
        // Review P2-8:自定义 fetchImpl(node-fetch 风格)可能不透传 signal.reason
        // 而抛自建 plain-Error AbortError —— reason 同一性溯源落空、又非外部取消,
        // 此前会坠入 normalizeRequestError 的 NETWORK_ERROR 分支,绕过
        // retryOnTimeout:false。内部超时已触发且错误形似 abort → 抛本请求的
        // timeoutReason(DOMException),由 normalizeRequestError 正确归类 TIMEOUT。
        if (timeoutController.signal.aborted && isAbortShapedError(error)) {
          throw timeoutReason;
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      cleanupSignals();
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

    const perCall = { fetchImpl: options.fetchImpl, signal: options.signal };
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
          (attempt) =>
            this.performRequest<T>(
              candidateUrl,
              state,
              provider,
              options.responseType,
              perCall,
              attempt
            ),
          retryForHost,
          {
            provider,
            url: candidateUrl,
            timeout: state.policy.timeout,
            responseType: options.responseType,
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
        // 外部取消不是上游故障：不计入 host 健康（避免单次取消把 host 打进 30s 冷却）、
        // 不喂熔断器（避免连续取消几次就把 breaker 打开拒绝后续正常请求）。
        const isExternalAbort = getSdkErrorCode(normalized) === 'ABORTED';
        if (!isExternalAbort) {
          this.fallbackManager.recordFailure(candidateUrl, normalized);
        } else {
          // 半开期被取消的请求要释放预占的探测名额(既非成功也非失败)
          state.circuitBreaker?.releaseProbe();
        }

        const shouldTryNextHost =
          index < candidateUrls.length - 1 &&
          this.fallbackManager.shouldFallback(normalized);

        if (shouldTryNextHost) {
          this.safe(() =>
            this.hooks?.trace?.('fallback', {
              provider,
              url: candidateUrl,
              timeout: state.policy.timeout,
              attempt: 0,
              responseType: options.responseType,
            })
          );
          continue;
        }

        if (!isExternalAbort) {
          state.circuitBreaker?.recordFailure();
        }
        throw this.toSdkError(normalized);
      }
    }

    state.circuitBreaker?.recordFailure();
    throw lastError
      ? this.toSdkError(lastError)
      : new CircuitBreakerError('Request failed without a concrete error');
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
