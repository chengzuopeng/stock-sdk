import type { ProviderName } from './providerPolicy';

/**
 * SDK 统一错误码
 */
export type SdkErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'RATE_LIMITED'
  | 'CIRCUIT_OPEN'
  | 'UPSTREAM_EMPTY'
  | 'INVALID_SYMBOL'
  | 'INVALID_ARGUMENT'
  | 'NOT_FOUND';

/**
 * SDK 错误构造参数
 */
export interface SdkErrorOptions {
  code: SdkErrorCode;
  message: string;
  provider?: ProviderName;
  url?: string;
  status?: number;
  details?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * SDK 标准错误
 */
export class SdkError extends Error {
  readonly code: SdkErrorCode;
  readonly provider?: ProviderName;
  readonly url?: string;
  readonly status?: number;
  readonly details?: Record<string, unknown>;

  constructor(options: SdkErrorOptions) {
    super(options.message);
    this.name = 'SdkError';
    this.code = options.code;
    this.provider = options.provider;
    this.url = options.url;
    this.status = options.status;
    this.details = options.details;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

/**
 * HTTP 错误类
 */
export class HttpError extends SdkError {
  readonly statusText: string;

  constructor(
    public readonly status: number,
    statusText: string,
    url?: string,
    provider?: ProviderName
  ) {
    const details = statusText ? ` ${statusText}` : '';
    const urlInfo = url ? `, url: ${url}` : '';
    const providerInfo = provider ? `, provider: ${provider}` : '';
    super({
      code: status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR',
      message: `HTTP error! status: ${status}${details}${urlInfo}${providerInfo}`,
      status,
      url,
      provider,
      details: { statusText },
    });
    this.name = 'HttpError';
    this.statusText = statusText;
  }
}

/**
 * 上游返回空数据
 */
export class UpstreamEmptyError extends SdkError {
  constructor(message: string, provider?: ProviderName, url?: string) {
    super({ code: 'UPSTREAM_EMPTY', message, provider, url });
    this.name = 'UpstreamEmptyError';
  }
}

/**
 * 资源未找到
 */
export class NotFoundError extends SdkError {
  constructor(message: string, provider?: ProviderName, url?: string) {
    super({ code: 'NOT_FOUND', message, provider, url });
    this.name = 'NotFoundError';
  }
}

/**
 * 参数无效
 */
export class InvalidArgumentError extends SdkError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({ code: 'INVALID_ARGUMENT', message, details });
    this.name = 'InvalidArgumentError';
  }
}

/**
 * 标的无效
 */
export class InvalidSymbolError extends SdkError {
  constructor(symbol: string, provider?: ProviderName) {
    super({
      code: 'INVALID_SYMBOL',
      message: `Invalid symbol: ${symbol}`,
      provider,
      details: { symbol },
    });
    this.name = 'InvalidSymbolError';
  }
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  provider?: ProviderName;
  url?: string;
  timeout?: number;
}

/**
 * 标准化后的请求错误元数据。
 * 为保持兼容，网络类错误会尽量复用原始 Error 实例，并附加这些字段。
 */
export interface RequestErrorMetadata {
  sdkCode?: SdkErrorCode;
  provider?: ProviderName;
  url?: string;
  status?: number;
  details?: Record<string, unknown>;
}

/**
 * 带标准化元数据的请求错误。
 */
export type RequestError = Error & RequestErrorMetadata;

/**
 * 判断是否为 SDK 标准错误
 */
export function isSdkError(error: unknown): error is SdkError {
  return error instanceof SdkError;
}

/**
 * 为原始错误附加标准化元数据。
 */
export function attachErrorMetadata<T extends Error>(
  error: T,
  metadata: RequestErrorMetadata
): T & RequestErrorMetadata {
  const target = error as T & RequestErrorMetadata;
  if (!target.sdkCode && metadata.sdkCode) {
    target.sdkCode = metadata.sdkCode;
  }
  if (!target.provider && metadata.provider) {
    target.provider = metadata.provider;
  }
  if (!target.url && metadata.url) {
    target.url = metadata.url;
  }
  if (target.status === undefined && metadata.status !== undefined) {
    target.status = metadata.status;
  }
  if (!target.details && metadata.details) {
    target.details = metadata.details;
  }
  return target;
}

/**
 * 对已有错误补齐 provider / url 等上下文。
 */
export function withErrorContext<T extends RequestError>(
  error: T,
  context: ErrorContext
): T {
  return attachErrorMetadata(error, {
    provider: context.provider,
    url: context.url,
  });
}

/**
 * 读取错误上的 SDK 标准错误码。
 */
export function getSdkErrorCode(error: unknown): SdkErrorCode | undefined {
  if (error instanceof SdkError) {
    return error.code;
  }

  if (error instanceof HttpError) {
    return error.code;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'TIMEOUT';
  }

  if (error instanceof TypeError) {
    const metadata = error as RequestError;
    return metadata.sdkCode ?? 'NETWORK_ERROR';
  }

  if (error instanceof Error) {
    const metadata = error as RequestError;
    return metadata.sdkCode;
  }

  return undefined;
}

/**
 * 把请求层未知错误归一化为 SDK 标准错误
 */
export function normalizeRequestError(
  error: unknown,
  context: ErrorContext = {}
): RequestError {
  if (error instanceof SdkError) {
    return withErrorContext(error, context);
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return attachErrorMetadata(error, {
      sdkCode: 'TIMEOUT',
      provider: context.provider,
      url: context.url,
      details: context.timeout ? { timeout: context.timeout } : undefined,
    });
  }

  if (error instanceof TypeError) {
    return attachErrorMetadata(error, {
      sdkCode: 'NETWORK_ERROR',
      provider: context.provider,
      url: context.url,
    });
  }

  if (error instanceof Error) {
    return attachErrorMetadata(error, {
      sdkCode: 'NETWORK_ERROR',
      provider: context.provider,
      url: context.url,
    });
  }

  return new SdkError({
    code: 'NETWORK_ERROR',
    message: 'Unknown request error',
    provider: context.provider,
    url: context.url,
    cause: error,
  });
}
