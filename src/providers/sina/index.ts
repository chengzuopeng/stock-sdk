/**
 * 新浪财经数据源
 */

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
