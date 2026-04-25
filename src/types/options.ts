/**
 * 中金所股指期权产品
 */
export type IndexOptionProduct = 'ho' | 'io' | 'mo';

/**
 * 期权 T 型报价项
 */
export interface OptionTQuote {
  symbol: string;
  buyVolume: number | null;
  buyPrice: number | null;
  price: number | null;
  askPrice: number | null;
  askVolume: number | null;
  openInterest: number | null;
  change: number | null;
  strikePrice: number | null;
}

/**
 * 期权 T 型报价结果
 */
export interface OptionTQuoteResult {
  calls: OptionTQuote[];
  puts: OptionTQuote[];
}

/**
 * 期权日 K 线
 */
export interface OptionKline {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

/**
 * 期权分钟数据
 */
export interface OptionMinute {
  time: string;
  date: string;
  price: number | null;
  volume: number | null;
  openInterest: number | null;
  avgPrice: number | null;
}

/**
 * ETF 期权月份信息
 */
export interface ETFOptionMonth {
  months: string[];
  stockId: string;
  cateId: string;
  cateList: string[];
}

/**
 * ETF 期权到期信息
 */
export interface ETFOptionExpireDay {
  expireDay: string;
  remainderDays: number;
  stockId: string;
  name: string;
}

/**
 * ETF 期权品种
 */
export type ETFOptionCate = '50ETF' | '300ETF' | '500ETF' | '科创50' | '科创板50';

/**
 * 中金所期权实时行情
 */
export interface CFFEXOptionQuote {
  code: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  amount: number | null;
  openInterest: number | null;
  strikePrice: number | null;
  remainDays: number | null;
  dailyChange: number | null;
  prevSettle: number | null;
  open: number | null;
}

/**
 * 期权龙虎榜项
 */
export interface OptionLHBItem {
  tradeType: string;
  date: string;
  symbol: string;
  targetName: string;
  rank: number;
  memberName: string;
  sellVolume: number | null;
  sellVolumeChange: number | null;
  netSellVolume: number | null;
  sellVolumeRatio: number | null;
  buyVolume: number | null;
  buyVolumeChange: number | null;
  netBuyVolume: number | null;
  buyVolumeRatio: number | null;
  sellPosition: number | null;
  sellPositionChange: number | null;
  netSellPosition: number | null;
  sellPositionRatio: number | null;
  buyPosition: number | null;
  buyPositionChange: number | null;
  netBuyPosition: number | null;
  buyPositionRatio: number | null;
  /**
   * @deprecated 请改用 `date`
   */
  tradeDate: string;
  /**
   * @deprecated 旧字段，使用当前数据时优先读取 `buyVolume` / `sellVolume`
   */
  volume: number | null;
  /**
   * @deprecated 旧字段，使用当前数据时优先读取 `buyVolumeChange` / `sellVolumeChange`
   */
  volumeChange: number | null;
  /**
   * @deprecated 旧字段，历史实现中无稳定金额语义，当前返回最接近的持仓值
   */
  amount: number | null;
  /**
   * @deprecated 旧字段，历史实现中无稳定金额变动语义，当前返回最接近的持仓变动值
   */
  amountChange: number | null;
  /**
   * @deprecated 请改用 `buyPosition` / `sellPosition`
   */
  openInterest: number | null;
  /**
   * @deprecated 请改用 `buyPositionChange` / `sellPositionChange`
   */
  openInterestChange: number | null;
  /**
   * @deprecated 请改用更细粒度的 `tradeType`
   */
  side: 'buy' | 'sell' | 'net' | null;
}
