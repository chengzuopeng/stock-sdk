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
