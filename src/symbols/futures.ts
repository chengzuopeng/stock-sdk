/**
 * 期货交易所映射与品种提取（A1 基础版）
 */
import type { Market, Exchange } from './types';

/** 期货交易所代码 → { market, exchange } */
export const FUTURES_EXCHANGES: Record<
  string,
  { market: Market; exchange: Exchange }
> = {
  SHFE: { market: 'CN', exchange: 'SHFE' },
  DCE: { market: 'CN', exchange: 'DCE' },
  CZCE: { market: 'CN', exchange: 'CZCE' },
  INE: { market: 'CN', exchange: 'INE' },
  CFFEX: { market: 'CN', exchange: 'CFFEX' },
  GFEX: { market: 'CN', exchange: 'GFEX' },
  COMEX: { market: 'GLOBAL', exchange: 'COMEX' },
  NYMEX: { market: 'GLOBAL', exchange: 'NYMEX' },
  CBOT: { market: 'GLOBAL', exchange: 'CBOT' },
  LME: { market: 'GLOBAL', exchange: 'LME' },
};

/** 从期货合约代码提取品种字母，如 rb2510 → RB、IF2412 → IF、RBM → RB */
export function extractVariety(contract: string): string {
  const m = contract.match(/^([A-Za-z]+)/);
  return (m ? m[1] : contract).toUpperCase();
}
