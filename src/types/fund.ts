/**
 * 公募基金扩展数据类型
 *
 * 对应数据源：天天基金 / 东方财富的基金数据频道
 * （https://fund.eastmoney.com/data/fundfenhong.html 等）。
 */

/** 分红查询排序字段（与东方财富接口 `rank` 参数一一对应） */
export type FundDividendRank =
  | 'BZDM' // 基金代码
  | 'ABBNAME' // 基金简称
  | 'DJR' // 权益登记日
  | 'FSRQ' // 除息日期
  | 'FHFCZ' // 分红(元/份)
  | 'FFR'; // 分红发放日

/** 通用排序方向（升序 / 降序） */
export type FundSortDirection = 'asc' | 'desc';

/** 基金分红查询选项 */
export interface FundDividendListOptions {
  /** 查询年份；默认当前年（Asia/Shanghai） */
  year?: number | string;
  /**
   * 页码：从 1 开始；默认 `1`。
   * 设为 `'all'` 时自动翻完该年份所有页面并聚合结果。
   */
  page?: number | 'all';
  /**
   * 基金类型筛选，空 / undefined 表示全部。
   * 例如 `'股票型'`、`'指数型-股票'`、`'混合型-偏股'`、`'REITs'` 等
   * （字符串与东方财富接口 `ftype` 参数原样对应）。
   */
  fundType?: string;
  /** 排序字段，默认 `'FSRQ'`（除息日期） */
  rank?: FundDividendRank;
  /** 排序方向，默认 `'desc'` */
  sort?: FundSortDirection;
  /**
   * 按基金代码过滤（客户端过滤，因为接口本身不支持按代码精确查）。
   * 一般搭配 `page: 'all'` 使用，否则可能因目标记录不在当前页而无结果。
   */
  code?: string;
}

/** 一条基金分红记录 */
export interface FundDividend {
  /** 基金代码 */
  code: string;
  /** 基金简称 */
  name: string;
  /** 权益登记日（`YYYY-MM-DD`），无则 `null` */
  equityRecordDate: string | null;
  /** 除息日期（`YYYY-MM-DD`），无则 `null` */
  exDividendDate: string | null;
  /** 分红金额（元/份），无则 `null` */
  dividendPerShare: number | null;
  /** 分红发放日（`YYYY-MM-DD`），无则 `null` */
  payDate: string | null;
  /**
   * 原始字段数组（含 7 项）：
   * `[code, name, 权益登记日, 除息日, 分红元/份, 发放日, 类型代码]`
   */
  raw: string[];
}

/** 基金分红查询结果 */
export interface FundDividendListResult {
  /** 当前页（或聚合后）的分红记录 */
  items: FundDividend[];
  /** 数据源汇报的总页数 */
  totalPages: number;
  /** 数据源汇报的每页条数 */
  pageSize: number;
  /** 当前页码；`page: 'all'` 模式下为 `-1` 表示已聚合 */
  currentPage: number;
}

/** 单条历史净值点 */
export interface FundNavPoint {
  /** 净值日期 `YYYY-MM-DD`（与时间戳的 UTC 日期一致，对应 A 股交易日） */
  date: string;
  /** 净值日期对应的毫秒时间戳（数据源原值，UTC 当日 00:00） */
  timestamp: number;
  /** 单位净值 */
  nav: number;
  /** 累计净值；与单位净值数组按 timestamp 对齐，无法对齐时为 `null` */
  accNav: number | null;
  /** 日增长率（%）；无值时为 `null` */
  dailyReturn: number | null;
  /** 每万份收益（货币 / 短债基金有意义，其余通常为空串） */
  unitMoney: string;
}

/** 基金历史净值查询结果 */
export interface FundNavHistory {
  /** 基金代码（来自 pingzhongdata 的 `fS_code`，若缺失则回填入参） */
  code: string;
  /** 基金简称（来自 pingzhongdata 的 `fS_name`，无则 `null`） */
  name: string | null;
  /** 历史净值序列；按日期升序（与数据源一致） */
  items: FundNavPoint[];
}

/**
 * 基金当日实时估值（来自天天基金 fundgz 接口）。
 *
 * 含两类净值：
 * - `nav` / `navDate`：最新已结算的单位净值（T-1 或当日盘后）
 * - `estimatedNav` / `estimatedChangePercent` / `estimateTime`：盘中实时估值
 */
export interface FundEstimate {
  /** 基金代码 */
  code: string;
  /** 基金简称 */
  name: string | null;
  /** 最新已结算单位净值的日期 `YYYY-MM-DD`，无则 `null` */
  navDate: string | null;
  /** 最新已结算单位净值，无则 `null` */
  nav: number | null;
  /** 当日实时估值（盘中刷新），无则 `null`（如非交易日、QDII 等） */
  estimatedNav: number | null;
  /** 估算涨跌幅 `%`，无则 `null` */
  estimatedChangePercent: number | null;
  /** 估算时间原始字符串（如 `"2026-05-26 15:00"`，A 股时区），无则 `null` */
  estimateTime: string | null;
}

/** 单条同类排名点（与 `Data_rateInSimilarType` 一一对应） */
export interface FundRankPoint {
  /** 报告日期 `YYYY-MM-DD` */
  date: string;
  /** 报告日期对应的毫秒时间戳（数据源原值） */
  timestamp: number;
  /** 同类近三月排名（数字越小越靠前），无值时为 `null` */
  rank: number | null;
  /** 同类基金总数，无值时为 `null` */
  total: number | null;
  /**
   * 同类近三月排名百分位（%，越小越好），按 timestamp 与 rank 对齐；
   * 无对应数据时为 `null`
   */
  percentile: number | null;
}

/** 基金同类排名走势查询结果 */
export interface FundRankHistory {
  /** 基金代码（来自 pingzhongdata 的 `fS_code`，若缺失则回填入参） */
  code: string;
  /** 基金简称（来自 pingzhongdata 的 `fS_name`，无则 `null`） */
  name: string | null;
  /** 排名走势序列；按日期升序 */
  items: FundRankPoint[];
}
