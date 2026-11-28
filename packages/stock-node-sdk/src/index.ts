/**
 * stock-node-sdk 主入口
 */
export {
  StockNodeSDK,
  default,
  type StockNodeSDKOptions,
  type ResultWithMeta,
} from './sdk';

// Node 专属传输层与存储层
export {
  NodeHttpClient,
  CookieJar,
  SessionManager,
  ProxyPool,
  type NodeHttpClientOptions,
  type StoredCookie,
  type SessionInitializer,
  type ProxyConfig,
  type ProxyResolverContext,
} from './transport';
export { FileCacheStore, type FileCacheStoreOptions } from './storage';
export type { NodeCacheConfig } from './services/nodeDomainServices';
export {
  OVERSEAS_PROVIDERS,
  createOverseasAdapters,
  type OverseasProviderId,
} from './adapters/overseas';

// 多源路由引擎
export {
  SourceRouter,
  SourceHealthTracker,
  isFallbackableError,
  type ProviderId,
  type CapabilityId,
  type RouteOptions,
  type RouteAttempt,
  type RouteTrace,
  type AdapterContext,
  type SourceAdapter,
  type SourceHealthStats,
  type SourceRouterOptions,
} from '@stock-sdk/core/router';

// 全部公共数据结构类型
export * from '@stock-sdk/core/types';
export type { FullQuote, SimpleQuote, HKQuote, USQuote, Quote } from './quoteTypes';

// 选项与扩展类型
export type {
  MarketType,
  KlineWithIndicatorsOptions,
  KlineSignalsOptions,
  KlineSignal,
  ChipDistributionRequestOptions,
  IndividualChangesOptions,
  IndividualChangesHistoryOptions,
  MarketStatus,
  SupportedMarket,
} from '@stock-sdk/core/sdk/index';
export type {
  GetAllAShareQuotesOptions,
  GetAllHKQuotesOptions,
  AShareMarket,
  GetAShareCodeListOptions,
  USMarket,
  GetUSCodeListOptions,
  GetAllUSQuotesOptions,
} from '@stock-sdk/core/providers/tencent/batch';
export type {
  HistoryKlineOptions,
  MinuteKlineOptions,
  HKKlineOptions,
  HKMinuteKlineOptions,
  USKlineOptions,
  USMinuteKlineOptions,
  IndustryBoardKlineOptions,
  IndustryBoardMinuteKlineOptions,
  ConceptBoardKlineOptions,
  ConceptBoardMinuteKlineOptions,
  FuturesKlineOptions,
  GlobalFuturesSpotOptions,
  GlobalFuturesKlineOptions,
  FuturesInventoryOptions,
  ComexInventoryOptions,
  CFFEXOptionQuotesOptions,
  FundFlowOptions,
  FundFlowRankOptions,
  NorthboundHoldingRankOptions,
  NorthboundHistoryOptions,
  DatacenterQuery,
  DatacenterResult,
  BlockTradeDateOptions,
  DragonTigerDateOptions,
} from '@stock-sdk/core/providers/eastmoney/index';

// 外部链接、核心工具、错误、时间
export { generateSearchExternalLinks } from '@stock-sdk/core/externalLinks';
export {
  decodeGBK,
  parseResponse,
  safeNumber,
  safeNumberOrNull,
  chunkArray,
  asyncPool,
  HttpError,
  SdkError,
  getSdkErrorCode,
  MARKET_TZ,
  parseMarketTime,
  buildTimeMeta,
  buildTimeMetaFromDateAndTime,
  formatInTz,
  type MarketTz,
  type TimeMeta,
  type RetryOptions,
  type RequestClientOptions,
  type ProviderName,
  type ProviderRequestPolicy,
  type RequestError,
} from '@stock-sdk/core/core';

// 纯计算能力（指标 / 符号 / 信号 / 选股回测 / 缓存）
export * from '@stock-sdk/core/indicators';
export {
  normalizeSymbol,
  toTencentSymbol,
  toEastmoneySecid,
  type SymbolInput,
  type SymbolRef,
  type NormalizedSymbol,
  type Market,
  type AssetType,
  type Exchange,
} from '@stock-sdk/core/symbols';
export { calcSignals, type Signal, type SignalType, type SignalOptions } from '@stock-sdk/core/signals';
export {
  screen,
  backtest,
  type ScreenerBuilder,
  type Strategy,
  type StrategySignal,
  type Trade,
  type BacktestOptions,
  type BacktestReport,
} from '@stock-sdk/core/screener';
export {
  MemoryCacheStore,
  cacheThrough,
  MemoryCache,
  getSharedCache,
  configureSharedCache,
  clearClientScopedCaches,
  createCacheKey,
  type CacheStore,
  type MaybePromise,
  type CacheOptions,
} from '@stock-sdk/core/cache';
