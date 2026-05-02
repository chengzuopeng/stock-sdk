/**
 * 沪深港通 / 北向资金 数据类型
 */

/** 资金方向 */
export type NorthboundDirection = 'north' | 'south';

/** 北向持股市场 */
export type NorthboundMarket = 'all' | 'shanghai' | 'shenzhen';

/** 北向持股排行查询周期 */
export type NorthboundRankPeriod =
  | 'today'
  | '3day'
  | '5day'
  | '10day'
  | 'month'
  | 'quarter'
  | 'year';

/**
 * 北向 / 南向资金分时数据
 */
export interface NorthboundMinuteItem {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 时间 HH:MM */
  time: string;
  /** 沪股通 / 港股通(沪) 净流入(万元) */
  shanghaiNetInflow: number | null;
  /** 深股通 / 港股通(深) 净流入(万元) */
  shenzhenNetInflow: number | null;
  /** 合计净流入(万元) */
  totalNetInflow: number | null;
}

/**
 * 沪深港通市场资金流向汇总（datacenter RPT_MUTUAL_QUOTA）
 */
export interface NorthboundFlowSummary {
  /** 交易日 YYYY-MM-DD */
  date: string;
  /** 类型编号 */
  type: string;
  /** 板块名称（如「沪股通」「港股通(沪)」） */
  boardName: string;
  /** 资金方向（如「北向资金」「南向资金」） */
  direction: string;
  /** 交易状态 */
  status: string;
  /** 成交净买额(元，原始接口单位) */
  netBuyAmount: number | null;
  /** 资金净流入(元) */
  netInflow: number | null;
  /** 当日资金余额(元) */
  remainAmount: number | null;
  /** 上涨数 */
  upCount: number | null;
  /** 持平数 */
  flatCount: number | null;
  /** 下跌数 */
  downCount: number | null;
  /** 相关指数代码 */
  indexCode: string;
  /** 相关指数名称 */
  indexName: string;
  /** 指数涨跌幅(%) */
  indexChangePercent: number | null;
}

/**
 * 北向 / 沪股通 / 深股通持股个股排行项
 */
export interface NorthboundHoldingRankItem {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 今日收盘价 */
  close: number | null;
  /** 今日涨跌幅(%) */
  changePercent: number | null;
  /** 今日持股股数 */
  holdShares: number | null;
  /** 今日持股市值(元) */
  holdMarketValue: number | null;
  /** 持股占流通股比(%) */
  holdRatioFloat: number | null;
  /** 持股占总股本比(%) */
  holdRatioTotal: number | null;
  /** 区间增持估计股数 */
  addShares: number | null;
  /** 区间增持估计市值(元) */
  addMarketValue: number | null;
  /** 区间增持估计市值增幅(%) */
  addMarketValuePercent: number | null;
  /** 所属板块 */
  sector: string;
}

/**
 * 北向资金历史项（按日）
 */
export interface NorthboundHistoryItem {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 成交净买额(元) */
  netBuyAmount: number | null;
  /** 买入成交额(元) */
  buyAmount: number | null;
  /** 卖出成交额(元) */
  sellAmount: number | null;
  /** 历史累计净买额(元) */
  accNetBuyAmount: number | null;
  /** 当日资金流入(元) */
  netInflow: number | null;
  /** 当日资金余额(元) */
  remainAmount: number | null;
  /** 领涨股代码 */
  topStockCode: string | null;
  /** 领涨股名称 */
  topStockName: string | null;
  /** 领涨股涨跌幅(%) */
  topStockChangePercent: number | null;
}

/**
 * 个股北向持仓历史项
 */
export interface NorthboundIndividualItem {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 持股数量 */
  holdShares: number | null;
  /** 持股市值(元) */
  holdMarketValue: number | null;
  /** 持股占流通股比(%) */
  holdRatioFloat: number | null;
  /** 持股占总股本比(%) */
  holdRatioTotal: number | null;
  /** 收盘价 */
  close: number | null;
  /** 涨跌幅(%) */
  changePercent: number | null;
}
