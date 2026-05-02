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

// 中金所期权实时行情
export {
  getCFFEXOptionQuotes,
  type CFFEXOptionQuotesOptions,
} from './optionCffex';

// 期权龙虎榜
export { getOptionLHB } from './optionLhb';

// 期货库存
export {
  getFuturesInventorySymbols,
  getFuturesInventory,
  getComexInventory,
  type FuturesInventoryOptions,
  type ComexInventoryOptions,
} from './futuresInventory';

// 通用 datacenter 请求器
export {
  fetchDatacenter,
  fetchDatacenterList,
  type DatacenterQuery,
  type DatacenterResult,
} from './datacenter';

// 资金流向
export {
  getIndividualFundFlow,
  getMarketFundFlow,
  getFundFlowRank,
  getSectorFundFlowRank,
  getSectorFundFlowHistory,
  type FundFlowOptions,
  type FundFlowRankOptions,
} from './fundFlow';

// 北向资金 / 沪深港通
export {
  getNorthboundMinute,
  getNorthboundFlowSummary,
  getNorthboundHoldingRank,
  getNorthboundHistory,
  getNorthboundIndividual,
  type NorthboundHoldingRankOptions,
  type NorthboundHistoryOptions,
} from './northbound';

// 涨停板 / 盘口异动
export {
  getZTPool,
  getStockChanges,
  getBoardChanges,
} from './topicData';

// 龙虎榜
export {
  getDragonTigerDetail,
  getDragonTigerStockStats,
  getDragonTigerInstitution,
  getDragonTigerBranchRank,
  getDragonTigerStockSeatDetail,
} from './dragonTiger';

// 大宗交易
export {
  getBlockTradeMarketStat,
  getBlockTradeDetail,
  getBlockTradeDailyStat,
} from './blockTrade';
export type { BlockTradeDateOptions } from '../../types/blockTrade';

// 融资融券
export { getMarginAccountInfo, getMarginTargetList } from './margin';

// 龙虎榜：透出参数类型供 service / sdk.ts 引用
export type { DragonTigerDateOptions } from '../../types/dragonTiger';

