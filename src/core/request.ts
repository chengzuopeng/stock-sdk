/**
 * HTTP 请求客户端（带重试机制）
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

export class RequestClient {
  private baseUrl: string;
  private timeout: number;
  private retryOptions: ResolvedRetryOptions;
  private headers: Record<string, string>;

  constructor(options: RequestClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? TENCENT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retryOptions = this.resolveRetryOptions(options.retry);
    this.headers = { ...(options.headers ?? {}) };

    if (options.userAgent) {
      const hasUserAgent = Object.keys(this.headers).some(
        (key) => key.toLowerCase() === 'user-agent'
      );
      if (!hasUserAgent) {
        this.headers['User-Agent'] = options.userAgent;
      }
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
   * 从 URL 推断数据源
   */
  private inferProvider(url: string): string | undefined {
    try {
      const host = new URL(url).hostname;
      if (host.includes('eastmoney.com')) return 'eastmoney';
      if (host.includes('gtimg.cn')) return 'tencent';
      if (host.includes('linkdiary.cn')) return 'linkdiary';
    } catch {
      return undefined;
    }
    return undefined;
  }

  /**
   * 获取超时时间
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * 计算指数退避延迟时间
   */
  private calculateDelay(attempt: number): number {
    const delay = Math.min(
      this.retryOptions.baseDelay *
        Math.pow(this.retryOptions.backoffMultiplier, attempt),
      this.retryOptions.maxDelay
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
  private shouldRetry(error: unknown, attempt: number): boolean {
    // 超过最大重试次数
    if (attempt >= this.retryOptions.maxRetries) {
      return false;
    }

    // 超时错误 (AbortError)
    if (error instanceof DOMException && error.name === 'AbortError') {
      return this.retryOptions.retryOnTimeout;
    }

    // 网络错误 (fetch 失败，如 DNS 解析失败、连接被拒绝等)
    if (error instanceof TypeError) {
      return this.retryOptions.retryOnNetworkError;
    }

    // HTTP 状态码错误
    if (error instanceof HttpError) {
      return this.retryOptions.retryableStatusCodes.includes(error.status);
    }

    return false;
  }

  /**
   * 带重试的请求执行器
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (this.shouldRetry(error, attempt)) {
        const delay = this.calculateDelay(attempt);

        // 触发重试回调
        if (this.retryOptions.onRetry && error instanceof Error) {
          this.retryOptions.onRetry(attempt + 1, error, delay);
        }

        await this.sleep(delay);
        return this.executeWithRetry(requestFn, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 发送 GET 请求（带自动重试）
   */
  async get<T = string>(
    url: string,
    options: {
      responseType?: 'text' | 'json' | 'arraybuffer';
    } = {}
  ): Promise<T> {
    return this.executeWithRetry(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const provider = this.inferProvider(url);

      try {
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { ...this.headers },
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
    });
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
    });
    const text = decodeGBK(buffer);
    return parseResponse(text);
  }
}
