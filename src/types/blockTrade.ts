/**
 * 大宗交易数据类型
 */

/**
 * 大宗交易市场统计项（按日）
 */
export interface BlockTradeMarketStatItem {
  /** 交易日期 YYYY-MM-DD */
  date: string;
  /** 上证指数 */
  shClose: number | null;
  /** 上证指数涨跌幅(%) */
  shChangePercent: number | null;
  /** 大宗交易成交总额(元) */
  totalAmount: number | null;
  /** 溢价成交总额(元) */
  premiumAmount: number | null;
  /** 溢价成交占比(%) */
  premiumRatio: number | null;
  /** 折价成交总额(元) */
  discountAmount: number | null;
  /** 折价成交占比(%) */
  discountRatio: number | null;
}

/**
 * 大宗交易明细项
 */
export interface BlockTradeDetailItem {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 交易日期 YYYY-MM-DD */
  date: string;
  /** 收盘价 */
  close: number | null;
  /** 涨跌幅(%) */
  changePercent: number | null;
  /** 成交价(元) */
  dealPrice: number | null;
  /** 成交量(股) */
  dealVolume: number | null;
  /** 成交额(元) */
  dealAmount: number | null;
  /** 溢价率(%) */
  premiumRate: number | null;
  /** 买方营业部 */
  buyBranch: string;
  /** 卖方营业部 */
  sellBranch: string;
}

/**
 * 大宗交易每日统计项（按股票汇总）
 */
export interface BlockTradeDailyStatItem {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 交易日期 YYYY-MM-DD */
  date: string;
  /** 涨跌幅(%) */
  changePercent: number | null;
  /** 收盘价 */
  close: number | null;
  /** 成交笔数 */
  dealCount: number | null;
  /** 成交总额(元) */
  dealTotalAmount: number | null;
  /** 成交总量(股) */
  dealTotalVolume: number | null;
  /** 溢价成交额(元) */
  premiumAmount: number | null;
  /** 折价成交额(元) */
  discountAmount: number | null;
}

/**
 * 大宗交易日期范围参数
 */
export interface BlockTradeDateOptions {
  /** 开始日期 YYYYMMDD 或 YYYY-MM-DD */
  startDate?: string;
  /** 结束日期 YYYYMMDD 或 YYYY-MM-DD */
  endDate?: string;
}
