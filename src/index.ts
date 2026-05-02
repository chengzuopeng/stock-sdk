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
} from './sdk';

// 导出类型
export * from './types';

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
