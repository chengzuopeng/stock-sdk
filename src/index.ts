/**
 * Stock SDK 导出入口
 */

// 默认导出 SDK 类
export { StockSDK, default } from './sdk';
export type {
  MarketType,
  GetAllAShareQuotesOptions,
  AShareMarket,
  GetAShareCodeListOptions,
  // 美股市场筛选与批量选项类型（之前只在 sdk.ts 内部 re-export，未透到顶层）
  USMarket,
  GetUSCodeListOptions,
  GetAllUSQuotesOptions,
} from './sdk';

// 交易日历 / 市场状态相关 service 与类型（changelog 已承诺，但之前未透出）
// 注意：`./sdk` 文件优先于 `./sdk/` 目录，必须显式写 `./sdk/index`
export {
  TradingCalendarService,
  type MarketStatus,
  type SupportedMarket,
} from './sdk/index';

// 公募基金扩展（v1.10.0+）：作为顶层 export 与 TradingCalendarService 对齐
export { FundService } from './sdk/index';

// 导出类型
export * from './types';

// 导出外部财经链接工具
export { generateSearchExternalLinks } from './externalLinks';

// 导出独立指标计算函数
export {
  calcMA,
  calcSMA,
  calcEMA,
  calcWMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
  calcBIAS,
  calcCCI,
  calcATR,
  // 新增指标
  calcOBV,
  calcROC,
  calcDMI,
  calcSAR,
  calcKC,
  addIndicators,
  INDICATOR_REGISTRY,
  buildIndicatorContext,
  getEnabledIndicatorKeys,
  estimateIndicatorLookback,
} from './indicators';

// 导出指标类型
export type {
  IndicatorOptions,
  MAOptions,
  MACDOptions,
  BOLLOptions,
  KDJOptions,
  RSIOptions,
  WROptions,
  BIASOptions,
  CCIOptions,
  ATROptions,
  // 新增指标类型
  OBVOptions,
  OBVResult,
  ROCOptions,
  ROCResult,
  DMIOptions,
  DMIResult,
  SAROptions,
  SARResult,
  KCOptions,
  KCResult,
  KlineWithIndicators,
  IndicatorKey,
} from './indicators';

// 为了向后兼容，导出工具函数
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
} from './core';

// 时间工具（changelog 已承诺：MARKET_TZ / MarketTz / TimeMeta /
// parseMarketTime / buildTimeMeta / buildTimeMetaFromDateAndTime）
// v1.10.0+ 新增 formatInTz：epoch → 指定时区 'YYYY-MM-DD HH:mm' 字符串
export {
  MARKET_TZ,
  type MarketTz,
  type TimeMeta,
  parseMarketTime,
  buildTimeMeta,
  buildTimeMetaFromDateAndTime,
  formatInTz,
} from './core';

// 导出配置类型
export type {
  RetryOptions,
  RequestClientOptions,
  ProviderName,
  ProviderRequestPolicy,
  RequestError,
} from './core';

// 导出选项类型
export type {
  // A 股 / 港股 / 美股 K 线选项（API 文档已公开使用这些类型名，必须在根入口暴露）
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
  // Phase 1/2 新增选项类型
  FundFlowOptions,
  FundFlowRankOptions,
  NorthboundHoldingRankOptions,
  NorthboundHistoryOptions,
  DatacenterQuery,
  DatacenterResult,
  BlockTradeDateOptions,
  DragonTigerDateOptions,
} from './providers/eastmoney';

// 导出 JSONP 工具（供高级用户直接使用）
export { jsonpRequest, extractJsonFromJsonp, type JsonpOptions } from './core';

// JS 变量声明文件解析工具 + 浏览器互斥锁（v1.10.0+，供高级用户直接使用）
export {
  fetchJsVars,
  parseJsVars,
  type FetchJsVarsOptions,
  withScriptMutex,
} from './core';
export { BROWSER_JSVARS_MUTEX_KEY } from './core/jsVars';

// 统一符号模型（v2 A1）
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
} from './symbols';

// 指标信号层（v2 B1）
export { calcSignals } from './signals';
export type { Signal, SignalType, SignalOptions } from './signals';

// 选股器 + 回测（v2 B2）
export { screen, backtest } from './screener';
export type {
  ScreenerBuilder,
  Strategy,
  StrategySignal,
  Trade,
  BacktestOptions,
  BacktestReport,
} from './screener';

// 统一缓存层（v2 B3）
export {
  MemoryCacheStore,
  cacheThrough,
  MemoryCache,
  getSharedCache,
  createCacheKey,
} from './cache';
export type { CacheStore, MaybePromise, CacheOptions } from './cache';
