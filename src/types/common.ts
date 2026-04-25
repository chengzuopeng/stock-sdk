/**
 * 标准化的搜索结果资产分类
 * - 由 `SearchResult.type` 原始字符串归一化得到
 * - 用于跨数据源做统一的资产类型判断
 */
export type SearchResultType =
  | 'stock'
  | 'index'
  | 'fund'
  | 'bond'
  | 'futures'
  | 'option'
  | 'other';

/**
 * 搜索结果
 *
 * @remarks
 * `type` 字段保留上游原始资产类型字符串（如 `'GP-A'`、`'ZS'`、`'KJ'` 等），
 * 以保持向后兼容；如需基于统一分类做判断，请使用 `category`。
 */
export interface SearchResult {
  /** 股票代码（完整，如 `sh600519`） */
  code: string;
  /** 名称 */
  name: string;
  /** 市场标识，如 `sh` / `sz` / `hk` / `us` */
  market: string;
  /** 上游原始资产类型字符串，如 `'GP-A'` / `'ZS'` / `'KJ'` */
  type: string;
  /**
   * 标准化后的资产分类（在原始 `type` 基础上做归一化）
   * - 不影响 `type` 原值，可放心用于 `switch` 等场景
   */
  category?: SearchResultType;
}

/**
 * 分红派送详情
 */
export interface DividendDetail {
  code: string;
  name: string;
  reportDate: string | null;
  planNoticeDate: string | null;
  disclosureDate: string | null;
  assignTransferRatio: number | null;
  bonusRatio: number | null;
  transferRatio: number | null;
  dividendPretax: number | null;
  dividendDesc: string | null;
  dividendYield: number | null;
  eps: number | null;
  bps: number | null;
  capitalReserve: number | null;
  unassignedProfit: number | null;
  netProfitYoy: number | null;
  totalShares: number | null;
  equityRecordDate: string | null;
  exDividendDate: string | null;
  payDate: string | null;
  assignProgress: string | null;
  noticeDate: string | null;
}
