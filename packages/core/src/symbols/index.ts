/**
 * 统一符号模型（v2 A1）
 */
export type {
  Market,
  AssetType,
  Exchange,
  SymbolRef,
  NormalizedSymbol,
  SymbolInput,
} from './types';
export { normalizeSymbol, marketOf } from './normalize';
export {
  toTencentSymbol,
  toEastmoneySecid,
  toPlainCode,
  tryToTencentSymbols,
  type TencentSymbolBatch,
  EXCHANGE_TO_SECID_PREFIX,
} from './adapters';
export { inferAShareExchange } from './infer';
export { extractVariety, FUTURES_EXCHANGES } from './futures';
