/**
 * 东方财富数据源
 */

// A 股 K 线
export {
  getHistoryKline,
  getMinuteKline,
  type HistoryKlineOptions,
  type MinuteKlineOptions,
} from './aShareKline';

// 港股 K 线
export { getHKHistoryKline, type HKKlineOptions } from './hkKline';

// 美股 K 线
export { getUSHistoryKline, type USKlineOptions } from './usKline';

// 行业板块
export {
  getIndustryList,
  getIndustrySpot,
  getIndustryConstituents,
  getIndustryKline,
  getIndustryMinuteKline,
  type IndustryBoardKlineOptions,
  type IndustryBoardMinuteKlineOptions,
} from './industryBoard';

// 概念板块
export {
  getConceptList,
  getConceptSpot,
  getConceptConstituents,
  getConceptKline,
  getConceptMinuteKline,
  type ConceptBoardKlineOptions,
  type ConceptBoardMinuteKlineOptions,
} from './conceptBoard';

// 分红派送
export { getDividendDetail } from './dividend';

// 国内期货 K 线
export {
  getFuturesHistoryKline,
  extractVariety,
  getFuturesMarketCode,
  type FuturesKlineOptions,
} from './futuresKline';

// 全球期货
export {
  getGlobalFuturesSpot,
  getGlobalFuturesKline,
  type GlobalFuturesSpotOptions,
  type GlobalFuturesKlineOptions,
} from './futuresGlobal';

// 期货库存
export {
  getFuturesInventorySymbols,
  getFuturesInventory,
  getComexInventory,
  type FuturesInventoryOptions,
  type ComexInventoryOptions,
} from './futuresInventory';

