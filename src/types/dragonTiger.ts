/**
 * 龙虎榜数据类型
 */

/** 龙虎榜统计周期 */
export type DragonTigerPeriod = '1month' | '3month' | '6month' | '1year';

/**
 * 龙虎榜详情项
 */
export interface DragonTigerDetailItem {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 上榜日期 YYYY-MM-DD */
  date: string;
  /** 收盘价 */
  close: number | null;
  /** 涨跌幅(%) */
  changePercent: number | null;
  /** 龙虎榜净买额(元) */
  netBuyAmount: number | null;
  /** 龙虎榜买入额(元) */
  buyAmount: number | null;
  /** 龙虎榜卖出额(元) */
  sellAmount: number | null;
  /** 龙虎榜成交额(元) */
  dealAmount: number | null;
  /** 市场总成交额(元) */
  totalAmount: number | null;
  /** 净买额占总成交比(%) */
  netBuyRatio: number | null;
  /** 成交额占总成交比(%) */
  dealAmountRatio: number | null;
  /** 换手率(%) */
  turnoverRate: number | null;
  /** 流通市值(元) */
  floatMarketValue: number | null;
  /** 上榜原因 */
  reason: string;
  /** 上榜后 1 日涨跌幅(%) */
  afterChange1d: number | null;
  /** 上榜后 2 日涨跌幅(%) */
  afterChange2d: number | null;
  /** 上榜后 5 日涨跌幅(%) */
  afterChange5d: number | null;
  /** 上榜后 10 日涨跌幅(%) */
  afterChange10d: number | null;
}

/**
 * 龙虎榜个股上榜统计项
 */
export interface DragonTigerStockStatItem {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 最近上榜日 YYYY-MM-DD */
  latestDate: string;
  /** 收盘价 */
  close: number | null;
  /** 涨跌幅(%) */
  changePercent: number | null;
  /** 上榜次数 */
  count: number | null;
  /** 龙虎榜累计买入额(元) */
  totalBuyAmount: number | null;
  /** 龙虎榜累计卖出额(元) */
  totalSellAmount: number | null;
  /** 龙虎榜累计净额(元) */
  totalNetAmount: number | null;
  /** 龙虎榜累计成交额(元) */
  totalDealAmount: number | null;
  /** 累计买方机构次数 */
  buyOrgCount: number | null;
  /** 累计卖方机构次数 */
  sellOrgCount: number | null;
}

/**
 * 龙虎榜机构买卖项
 */
export interface DragonTigerInstitutionItem {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 上榜日期 YYYY-MM-DD */
  date: string;
  /** 收盘价 */
  close: number | null;
  /** 涨跌幅(%) */
  changePercent: number | null;
  /** 买方机构数 */
  buyOrgCount: number | null;
  /** 卖方机构数 */
  sellOrgCount: number | null;
  /** 机构买入额(元) */
  orgBuyAmount: number | null;
  /** 机构卖出额(元) */
  orgSellAmount: number | null;
  /** 机构净额(元) */
  orgNetAmount: number | null;
}

/**
 * 龙虎榜营业部排行项
 */
export interface DragonTigerBranchItem {
  /** 营业部代码 */
  code: string;
  /** 营业部名称 */
  name: string;
  /** 买入总额(元) */
  totalBuyAmount: number | null;
  /** 卖出总额(元) */
  totalSellAmount: number | null;
  /** 买入次数 */
  buyCount: number | null;
  /** 卖出次数 */
  sellCount: number | null;
  /** 上榜次数 */
  totalCount: number | null;
}

/**
 * 龙虎榜个股席位明细项
 */
export interface DragonTigerSeatItem {
  /** 排名 */
  rank: number | null;
  /** 营业部名称 */
  branchName: string;
  /** 买入额(元) */
  buyAmount: number | null;
  /** 买入占总成交比(%) */
  buyAmountRatio: number | null;
  /** 卖出额(元) */
  sellAmount: number | null;
  /** 卖出占总成交比(%) */
  sellAmountRatio: number | null;
  /** 净额(元) */
  netAmount: number | null;
  /** 类型标识: 'buy' | 'sell' */
  side: 'buy' | 'sell';
}

/**
 * 龙虎榜日期范围参数
 */
export interface DragonTigerDateOptions {
  /** 开始日期 YYYYMMDD */
  startDate: string;
  /** 结束日期 YYYYMMDD */
  endDate: string;
}
