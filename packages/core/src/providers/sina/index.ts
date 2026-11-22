/**
 * 新浪财经数据源
 */

// A 股 K 线备用源
export {
  getSinaHistoryKline,
  getSinaMinuteKline,
  type SinaHistoryKlineOptions,
  type SinaMinuteKlineOptions,
} from './kline';

// 中金所股指期权
export { getIndexOptionSpot, getIndexOptionKline } from './optionIndex';

// 上交所 ETF 期权
export {
  getETFOptionMonths,
  getETFOptionExpireDay,
  getETFOptionMinute,
  getETFOptionDailyKline,
  getETFOption5DayMinute,
} from './optionEtf';

// 商品期权
export { getCommodityOptionSpot, getCommodityOptionKline } from './optionCommodity';
