/**
 * Stock SDK 导出入口
 */

// 默认导出 SDK 类
export { StockSDK, default } from './sdk';
export type { MarketType, GetAllAShareQuotesOptions } from './sdk';

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
  addIndicators,
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
  KlineWithIndicators,
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
} from './core';

// 导出配置类型
export type { RetryOptions, RequestClientOptions } from './core';

// 导出选项类型
export type {
  IndustryBoardKlineOptions,
  IndustryBoardMinuteKlineOptions,
  ConceptBoardKlineOptions,
  ConceptBoardMinuteKlineOptions,
} from './providers/eastmoney';
