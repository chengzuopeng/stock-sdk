/**
 * Core 模块导出
 */

// 请求客户端
export {
  RequestClient,
  type RequestClientOptions,
} from './request';
export {
  HttpError,
  SdkError,
  UpstreamEmptyError,
  NotFoundError,
  InvalidArgumentError,
  InvalidSymbolError,
  attachErrorMetadata,
  normalizeRequestError,
  getSdkErrorCode,
  isSdkError,
  type RequestError,
  type SdkErrorCode,
} from './errors';
export {
  type ProviderName,
  type ProviderRequestPolicy,
  type RetryOptions,
  mergeProviderPolicy,
  resolveProviderPolicy,
  inferProviderFromUrl,
} from './providerPolicy';

// 解析器
export {
  decodeGBK,
  parseResponse,
  safeNumber,
  safeNumberOrNull,
  toNumber,
  toNumberSafe,
} from './parser';

// 工具函数
export {
  chunkArray,
  asyncPool,
  assertPositiveInteger,
  assertKlinePeriod,
  assertMinutePeriod,
  assertAdjustType,
  getMarketCode,
  getPeriodCode,
  getAdjustCode,
} from './utils';

// 常量
export {
  TENCENT_BASE_URL,
  TENCENT_MINUTE_URL,
  A_SHARE_LIST_URL,
  US_LIST_URL,
  HK_LIST_URL,
  FUND_LIST_URL,
  CODE_LIST_URL,
  EM_KLINE_URL,
  EM_TRENDS_URL,
  EM_HK_KLINE_URL,
  EM_US_KLINE_URL,
  EM_BOARD_LIST_URL,
  EM_BOARD_SPOT_URL,
  EM_BOARD_CONS_URL,
  EM_BOARD_KLINE_URL,
  EM_BOARD_TRENDS_URL,
  EM_CONCEPT_LIST_URL,
  EM_CONCEPT_SPOT_URL,
  EM_CONCEPT_CONS_URL,
  EM_CONCEPT_KLINE_URL,
  EM_CONCEPT_TRENDS_URL,
  EM_DATACENTER_URL,
  EM_FFLOW_URL,
  EM_CLIST_URL,
  EM_NORTHBOUND_MINUTE_URL,
  EM_TOPIC_BASE_URL,
  EM_PUSH_TOKEN,
  EM_DATA_TOKEN,
  EM_FUTURES_KLINE_URL,
  EM_FUTURES_GLOBAL_SPOT_URL,
  EM_FUTURES_GLOBAL_SPOT_TOKEN,
  FUTURES_EXCHANGE_MAP,
  FUTURES_VARIETY_EXCHANGE,
  GLOBAL_FUTURES_MARKET,
  SINA_OPTION_API_URL,
  SINA_OPTION_DAYLINE_URL,
  SINA_SSE_OPTION_LIST_URL,
  SINA_SSE_OPTION_EXPIRE_URL,
  SINA_SSE_OPTION_MINUTE_URL,
  SINA_SSE_OPTION_DAILY_URL,
  SINA_SSE_OPTION_5DAY_URL,
  EM_OPTION_CFFEX_URL,
  EM_OPTION_LHB_URL,
  EM_OPTION_LHB_TOKEN,
  CFFEX_OPTION_PRODUCT_MAP,
  COMMODITY_OPTION_MAP,
  DEFAULT_TIMEOUT,
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_DELAY,
  DEFAULT_MAX_DELAY,
  DEFAULT_BACKOFF_MULTIPLIER,
  DEFAULT_RETRYABLE_STATUS_CODES,
} from './constants';

// 限流器
export { RateLimiter, type RateLimiterOptions } from './rateLimiter';

// User-Agent 轮换池
export {
  getNextUserAgent,
  getRandomUserAgent,
  getAllUserAgents,
} from './userAgentPool';

// 缓存
export {
  MemoryCache,
  createCacheKey,
  getSharedCache,
  clearSharedCaches,
  type CacheOptions,
} from './cache';

// JSONP
export { jsonpRequest, extractJsonFromJsonp, type JsonpOptions } from './jsonp';

// 熔断器
export {
  CircuitBreaker,
  CircuitBreakerError,
  type CircuitBreakerOptions,
  type CircuitState,
} from './circuitBreaker';

// Host fallback
export {
  HostFallbackManager,
  type HostHealthStats,
} from './fallback';
