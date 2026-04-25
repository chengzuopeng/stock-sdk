/**
 * A 股历史 K 线（日/周/月）
 */
export interface HistoryKline {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 股票代码 */
  code: string;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 振幅% */
  amplitude: number | null;
  /** 涨跌幅% */
  changePercent: number | null;
  /** 涨跌额 */
  change: number | null;
  /** 换手率% */
  turnoverRate: number | null;
}

/**
 * A 股分时数据（1 分钟）
 */
export interface MinuteTimeline {
  /** 时间 YYYY-MM-DD HH:mm */
  time: string;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 均价 */
  avgPrice: number | null;
}

/**
 * A 股分钟 K 线（5/15/30/60）
 */
export interface MinuteKline {
  /** 时间 YYYY-MM-DD HH:mm */
  time: string;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 振幅% */
  amplitude: number | null;
  /** 涨跌幅% */
  changePercent: number | null;
  /** 涨跌额 */
  change: number | null;
  /** 换手率% */
  turnoverRate: number | null;
}

/**
 * 当日分时项
 */
export interface TodayTimeline {
  /** 时间 HH:mm */
  time: string;
  /** 当前价 */
  price: number;
  /** 均价 */
  avgPrice: number;
  /** 累计成交量(股) */
  volume: number;
  /** 累计成交额(元) */
  amount: number;
}

/**
 * 当日分时响应
 */
export interface TodayTimelineResponse {
  /** 股票代码 */
  code: string;
  /** 交易日期 YYYY-MM-DD */
  date: string;
  /**
   * 昨收价
   * - 由 SDK 解析腾讯接口的 `quoteFields[4]` 得到
   * - 上游异常或接口未返回时可能为 `0` 或 `undefined`
   */
  preClose?: number;
  /** 当日分时序列 */
  data: TodayTimeline[];
}

/**
 * 港股 / 美股历史 K 线
 */
export interface HKUSHistoryKline {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 振幅% */
  amplitude: number | null;
  /** 涨跌幅% */
  changePercent: number | null;
  /** 涨跌额 */
  change: number | null;
  /** 换手率% */
  turnoverRate: number | null;
}
