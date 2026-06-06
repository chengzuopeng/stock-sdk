/**
 * 统一符号模型类型（v2 A1）
 *
 * 设计要点：
 * - `string` 是一等公民，`SymbolRef` 是「带提示的 string」（其 code 也走 normalizeSymbol）
 * - `NormalizedSymbol` 是 SDK 内部唯一表示，各 provider 适配器只认它
 */

/** 交易区域 / 体系（GLOBAL = 海外期货/商品） */
export type Market = 'CN' | 'HK' | 'US' | 'GLOBAL';

/** 资产类型 */
export type AssetType =
  | 'stock'
  | 'index'
  | 'fund'
  | 'bond'
  | 'futures'
  | 'option'
  | 'board';

/**
 * 交易所 / 市场强判别字段。
 * 股票：SSE/SZSE/BSE/HKEX/NASDAQ/NYSE/AMEX；
 * 国内期货：SHFE/DCE/CZCE/INE/CFFEX/GFEX；海外期货：COMEX/NYMEX/CBOT/LME。
 * 允许 string 兜底以容纳未来扩展。
 */
export type Exchange =
  | 'SSE'
  | 'SZSE'
  | 'BSE'
  | 'HKEX'
  | 'NASDAQ'
  | 'NYSE'
  | 'AMEX'
  | 'US'
  | 'SHFE'
  | 'DCE'
  | 'CZCE'
  | 'INE'
  | 'CFFEX'
  | 'GFEX'
  | 'COMEX'
  | 'NYMEX'
  | 'CBOT'
  | 'LME'
  | (string & {});

/** 用户入参：裸 string，或「带提示的 string」对象 */
export interface SymbolRef {
  code: string;
  market?: Market;
  assetType?: AssetType;
  exchange?: Exchange;
}

/** SDK 内部统一表示 */
export interface NormalizedSymbol {
  market: Market;
  assetType: AssetType;
  exchange: Exchange;
  /** 纯代码，无前缀（如 '600519' / '00700' / 'AAPL' / 'IF2412'） */
  code: string;
  /** 期货品种（如 'IF' / 'RB'） */
  variety?: string;
  /** 原始入参，便于报错与调试 */
  input: string;
}

/** API 接受的符号入参类型 */
export type SymbolInput = string | SymbolRef;
