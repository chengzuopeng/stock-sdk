/**
 * A 股 / 指数 全量行情
 */
export interface FullQuote {
  /** 市场标识 */
  marketId: string;
  /** 名称 */
  name: string;
  /** 股票代码 */
  code: string;
  /** 最新价 */
  price: number;
  /** 昨收 */
  prevClose: number;
  /** 今开 */
  open: number;
  /** 成交量(手) */
  volume: number;
  /** 外盘 */
  outerVolume: number;
  /** 内盘 */
  innerVolume: number;
  /** 买一~买五 { price, volume }[] */
  bid: { price: number; volume: number }[];
  /** 卖一~卖五 { price, volume }[] */
  ask: { price: number; volume: number }[];
  /** 时间戳 yyyyMMddHHmmss */
  time: string;
  /** 涨跌额 */
  change: number;
  /** 涨跌幅% */
  changePercent: number;
  /** 最高 */
  high: number;
  /** 最低 */
  low: number;
  /** 成交量(手) (字段36) */
  volume2: number;
  /** 成交额(万) */
  amount: number;
  /** 换手率% */
  turnoverRate: number | null;
  /** 市盈率(TTM) */
  pe: number | null;
  /** 振幅% */
  amplitude: number | null;
  /** 流通市值(亿) */
  circulatingMarketCap: number | null;
  /** 总市值(亿) */
  totalMarketCap: number | null;
  /** 市净率 */
  pb: number | null;
  /** 涨停价 */
  limitUp: number | null;
  /** 跌停价 */
  limitDown: number | null;
  /** 量比 */
  volumeRatio: number | null;
  /** 均价 */
  avgPrice: number | null;
  /** 市盈率(静) */
  peStatic: number | null;
  /** 市盈率(动) */
  peDynamic: number | null;
  /** 52周最高价 */
  high52w: number | null;
  /** 52周最低价 */
  low52w: number | null;
  /** 流通股本(股) */
  circulatingShares: number | null;
  /** 总股本(股) */
  totalShares: number | null;
  /** 原始字段数组(供扩展使用) */
  raw: string[];
}

/**
 * 简要行情（股票 / 指数）
 */
export interface SimpleQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  /** 总市值(亿) */
  marketCap: number | null;
  /** 市场类型标识 如 GP-A / ZS */
  marketType: string;
  raw: string[];
}

/**
 * 资金流向
 */
export interface FundFlow {
  code: string;
  /** 主力流入 */
  mainInflow: number;
  /** 主力流出 */
  mainOutflow: number;
  /** 主力净流入 */
  mainNet: number;
  /** 主力净流入占比 */
  mainNetRatio: number;
  /** 散户流入 */
  retailInflow: number;
  /** 散户流出 */
  retailOutflow: number;
  /** 散户净流入 */
  retailNet: number;
  /** 散户净流入占比 */
  retailNetRatio: number;
  /** 总资金流 */
  totalFlow: number;
  name: string;
  date: string;
  raw: string[];
}

/**
 * 盘口大单占比
 */
export interface PanelLargeOrder {
  /** 买盘大单占比 */
  buyLargeRatio: number;
  /** 买盘小单占比 */
  buySmallRatio: number;
  /** 卖盘大单占比 */
  sellLargeRatio: number;
  /** 卖盘小单占比 */
  sellSmallRatio: number;
  raw: string[];
}

/**
 * 港股扩展行情
 */
export interface HKQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  prevClose: number;
  open: number;
  volume: number;
  time: string;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  amount: number;
  lotSize: number | null;
  circulatingMarketCap: number | null;
  totalMarketCap: number | null;
  currency: string;
  raw: string[];
}

/**
 * 美股行情
 */
export interface USQuote {
  /** 市场标识 */
  marketId: string;
  /** 名称 */
  name: string;
  /** 股票代码 */
  code: string;
  /** 最新价 */
  price: number;
  /** 昨收 */
  prevClose: number;
  /** 今开 */
  open: number;
  /** 成交量 */
  volume: number;
  /** 时间 */
  time: string;
  /** 涨跌额 */
  change: number;
  /** 涨跌幅% */
  changePercent: number;
  /** 最高 */
  high: number;
  /** 最低 */
  low: number;
  /** 成交额 */
  amount: number;
  /** 换手率% */
  turnoverRate: number | null;
  /** 市盈率 */
  pe: number | null;
  /** 振幅% */
  amplitude: number | null;
  /** 总市值(亿) */
  totalMarketCap: number | null;
  /** 市净率 */
  pb: number | null;
  /** 52周最高价 */
  high52w: number | null;
  /** 52周最低价 */
  low52w: number | null;
  /** 原始字段数组 */
  raw: string[];
}

/**
 * 公募基金行情
 */
export interface FundQuote {
  code: string;
  name: string;
  /** 最新单位净值 */
  nav: number;
  /** 累计净值 */
  accNav: number;
  /** 当日涨跌额 */
  change: number;
  /** 净值日期 */
  navDate: string;
  raw: string[];
}

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
 * A 股分钟 K 线（5/15/30/60 分钟）
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
  /** 换手率% */
  turnoverRate: number | null;
}

/**
 * 当日分时走势数据（腾讯数据源）
 */
export interface TodayTimeline {
  /** 时间 HH:mm */
  time: string;
  /** 成交价 */
  price: number;
  /** 累计成交量（股） */
  volume: number;
  /** 累计成交额（元） */
  amount: number;
  /** 当日均价（累计成交额 / 累计成交量 × 100） */
  avgPrice: number;
}

/**
 * 当日分时走势响应
 */
export interface TodayTimelineResponse {
  /** 股票代码 */
  code: string;
  /** 交易日期 YYYYMMDD */
  date: string;
  /** 分时数据列表 */
  data: TodayTimeline[];
}

/**
 * 港股/美股历史 K 线
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

/**
 * 行业板块信息
 */
export interface IndustryBoard {
  /** 排名 */
  rank: number;
  /** 板块名称 */
  name: string;
  /** 板块代码 */
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
  /** 领涨股票名称 */
  leadingStock: string | null;
  /** 领涨股票涨跌幅% */
  leadingStockChangePercent: number | null;
}

/**
 * 行业板块实时行情
 */
export interface IndustryBoardSpot {
  /** 指标名称 */
  item: string;
  /** 指标值 */
  value: number | null;
}

/**
 * 行业板块成分股
 */
export interface IndustryBoardConstituent {
  /** 序号 */
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
  /** 今开 */
  open: number | null;
  /** 昨收 */
  prevClose: number | null;
  /** 换手率% */
  turnoverRate: number | null;
  /** 市盈率-动态 */
  pe: number | null;
  /** 市净率 */
  pb: number | null;
}

/**
 * 行业板块历史 K 线
 */
export interface IndustryBoardKline {
  /** 日期 */
  date: string;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
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
  /** 换手率% */
  turnoverRate: number | null;
}

/**
 * 行业板块 1 分钟分时数据
 */
export interface IndustryBoardMinuteTimeline {
  /** 日期时间 */
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
  /** 最新价 */
  price: number | null;
}

/**
 * 行业板块分钟 K 线
 */
export interface IndustryBoardMinuteKline {
  /** 日期时间 */
  time: string;
  /** 开盘价 */
  open: number | null;
  /** 收盘价 */
  close: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
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
  /** 换手率% */
  turnoverRate: number | null;
}

/**
 * 概念板块信息（结构同行业板块）
 */
export type ConceptBoard = IndustryBoard;

/**
 * 概念板块实时行情（结构同行业板块）
 */
export type ConceptBoardSpot = IndustryBoardSpot;

/**
 * 概念板块成分股（结构同行业板块）
 */
export type ConceptBoardConstituent = IndustryBoardConstituent;

/**
 * 概念板块历史 K 线（结构同行业板块）
 */
export type ConceptBoardKline = IndustryBoardKline;

/**
 * 概念板块 1 分钟分时数据（结构同行业板块）
 */
export type ConceptBoardMinuteTimeline = IndustryBoardMinuteTimeline;

/**
 * 概念板块分钟 K 线（结构同行业板块）
 */
export type ConceptBoardMinuteKline = IndustryBoardMinuteKline;

/**
 * 股票搜索结果
 */
export interface SearchResult {
  /** 股票代码（完整，如 sh600519） */
  code: string;
  /** 股票名称 */
  name: string;
  /** 市场标识 (sh/sz/hk/us) */
  market: string;
  /** 资产类别 (GP-A/GP/KJ 等) */
  type: string;
}

/**
 * 分红派送详情
 */
export interface DividendDetail {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 报告期 YYYY-MM-DD */
  reportDate: string | null;
  /** 预案公告日 YYYY-MM-DD */
  planNoticeDate: string | null;
  /** 业绩披露日期 YYYY-MM-DD */
  disclosureDate: string | null;
  /** 送转总比例（每10股送转X股） */
  assignTransferRatio: number | null;
  /** 送股比例（每10股送X股） */
  bonusRatio: number | null;
  /** 转股比例（每10股转X股） */
  transferRatio: number | null;
  /** 每10股派息(税前)，单位：元 */
  dividendPretax: number | null;
  /** 分红描述（如：10派2.36元(含税,扣税后2.124元)） */
  dividendDesc: string | null;
  /** 股息率 */
  dividendYield: number | null;
  /** 每股收益(元) */
  eps: number | null;
  /** 每股净资产(元) */
  bps: number | null;
  /** 每股公积金(元) */
  capitalReserve: number | null;
  /** 每股未分配利润(元) */
  unassignedProfit: number | null;
  /** 净利润同比增长(%) */
  netProfitYoy: number | null;
  /** 总股本(股) */
  totalShares: number | null;
  /** 股权登记日 YYYY-MM-DD */
  equityRecordDate: string | null;
  /** 除权除息日 YYYY-MM-DD */
  exDividendDate: string | null;
  /** 现金分红发放日 YYYY-MM-DD */
  payDate: string | null;
  /** 方案进度（如：实施分配、股东大会预案等） */
  assignProgress: string | null;
  /** 最新公告日期 YYYY-MM-DD */
  noticeDate: string | null;
}
