/**
 * 行业板块列表项
 */
export interface IndustryBoard {
  /** 排名 */
  rank: number;
  /** 板块名称 */
  name: string;
  /** 板块代码，如 BK1027 */
  code: string;
  /** 最新价 */
  price: number | null;
  /** 涨跌额 */
  change: number | null;
  /** 涨跌幅% */
  changePercent: number | null;
  /** 总市值 */
  totalMarketCap: number | null;
  /** 换手率% */
  turnoverRate: number | null;
  /** 上涨家数 */
  riseCount: number | null;
  /** 下跌家数 */
  fallCount: number | null;
  /** 领涨股名称 */
  leadingStock: string | null;
  /** 领涨股涨跌幅% */
  leadingStockChangePercent: number | null;
}

/**
 * 行业板块实时行情指标
 */
export interface IndustryBoardSpot {
  item: string;
  value: number | null;
}

/**
 * 行业板块成分股
 */
export interface IndustryBoardConstituent {
  /** 排名 */
  rank: number;
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 最新价 */
  price: number | null;
  /** 涨跌幅% */
  changePercent: number | null;
  /** 涨跌额 */
  change: number | null;
  /** 成交量 */
  volume: number | null;
  /** 成交额 */
  amount: number | null;
  /** 振幅% */
  amplitude: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 开盘价 */
  open: number | null;
  /** 昨收 */
  prevClose: number | null;
  /** 换手率% */
  turnoverRate: number | null;
  /** 市盈率 */
  pe: number | null;
  /** 市净率 */
  pb: number | null;
}

/**
 * 行业板块历史 K 线
 */
export interface IndustryBoardKline {
  date: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  changePercent: number | null;
  change: number | null;
  turnoverRate: number | null;
}

/**
 * 行业板块 1 分钟分时
 */
export interface IndustryBoardMinuteTimeline {
  time: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  /** 最新价 */
  price: number | null;
  /**
   * @deprecated 旧类型字段，请改用 `price`
   */
  avgPrice: number | null;
}

/**
 * 行业板块分钟 K 线（5/15/30/60）
 */
export interface IndustryBoardMinuteKline {
  time: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  changePercent: number | null;
  change: number | null;
  turnoverRate: number | null;
}

/**
 * 概念板块类型复用行业板块结构
 */
export type ConceptBoard = IndustryBoard;
export type ConceptBoardSpot = IndustryBoardSpot;
export type ConceptBoardConstituent = IndustryBoardConstituent;
export type ConceptBoardKline = IndustryBoardKline;
export type ConceptBoardMinuteTimeline = IndustryBoardMinuteTimeline;
export type ConceptBoardMinuteKline = IndustryBoardMinuteKline;
