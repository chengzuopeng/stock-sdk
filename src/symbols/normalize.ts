/**
 * normalizeSymbol：把各种用户写法容错解析为统一的 NormalizedSymbol
 *
 * 解析优先级（命中即停）：
 *  1) 点分形式：东财 secid（1.600519 / 116.00700 / 105.AAPL）、后缀（600519.SH）、
 *     期货交易所（CFFEX.IF2412）、板块（90.BK0475）
 *  2) 字母前缀：sh / sz / bj / hk / us
 *  3) 纯数字：6 位→CN（按首位推断交易所）、5/4 位→HK（补零到 5 位）
 *  4) 带 hint 的期货裸合约
 *  5) 纯字母→US
 *  6) 失败抛 InvalidSymbolError
 *
 * `hint` 与 `SymbolRef` 字段冲突时，显式入参（SymbolRef）优先。
 */
import { InvalidSymbolError } from '../core/errors';
import type {
  SymbolInput,
  SymbolRef,
  NormalizedSymbol,
  Market,
  AssetType,
  Exchange,
} from './types';
import { inferAShareExchange } from './infer';
import { FUTURES_EXCHANGES, extractVariety } from './futures';

const PREFIX_MAP: Record<string, { market: Market; exchange: Exchange }> = {
  sh: { market: 'CN', exchange: 'SSE' },
  sz: { market: 'CN', exchange: 'SZSE' },
  bj: { market: 'CN', exchange: 'BSE' },
  hk: { market: 'HK', exchange: 'HKEX' },
  us: { market: 'US', exchange: 'US' },
};
const PREFIXES = ['sh', 'sz', 'bj', 'hk', 'us'] as const;

const SUFFIX_MAP: Record<string, { market: Market; exchange: Exchange }> = {
  SH: { market: 'CN', exchange: 'SSE' },
  SZ: { market: 'CN', exchange: 'SZSE' },
  BJ: { market: 'CN', exchange: 'BSE' },
  HK: { market: 'HK', exchange: 'HKEX' },
  US: { market: 'US', exchange: 'US' },
};

/** 东财 secid 数字市场前缀 → { market, exchange } */
const SECID_MAP: Record<string, { market: Market; exchange: Exchange }> = {
  '0': { market: 'CN', exchange: 'SZSE' },
  '1': { market: 'CN', exchange: 'SSE' },
  '116': { market: 'HK', exchange: 'HKEX' },
  '105': { market: 'US', exchange: 'NASDAQ' },
  '106': { market: 'US', exchange: 'NYSE' },
  '107': { market: 'US', exchange: 'AMEX' },
};

export function normalizeSymbol(
  input: SymbolInput,
  hint?: Partial<SymbolRef>
): NormalizedSymbol {
  const ref: SymbolRef =
    typeof input === 'string' ? { code: input } : { ...input };
  const rawInput = typeof input === 'string' ? input : input.code;
  const code0 = String(ref.code ?? '').trim();

  const hintMarket = ref.market ?? hint?.market;
  const hintAsset = ref.assetType ?? hint?.assetType;
  const hintExchange = ref.exchange ?? hint?.exchange;

  if (!code0) {
    throw new InvalidSymbolError(String(rawInput));
  }

  const finish = (
    market: Market,
    exchange: Exchange,
    code: string,
    assetType: AssetType,
    variety?: string
  ): NormalizedSymbol => ({
    market: hintMarket ?? market,
    exchange: hintExchange ?? exchange,
    assetType: hintAsset ?? assetType,
    code,
    variety,
    input: rawInput,
  });

  // 1) 点分形式
  if (code0.includes('.')) {
    const dot = code0.indexOf('.');
    const left = code0.slice(0, dot);
    const right = code0.slice(dot + 1);
    const upperLeft = left.toUpperCase();
    const upperRight = right.toUpperCase();

    if (/^\d+$/.test(left) && SECID_MAP[left]) {
      const s = SECID_MAP[left];
      return finish(s.market, s.exchange, right, 'stock');
    }
    if (SUFFIX_MAP[upperRight]) {
      const s = SUFFIX_MAP[upperRight];
      return finish(s.market, s.exchange, left, 'stock');
    }
    if (FUTURES_EXCHANGES[upperLeft]) {
      const fx = FUTURES_EXCHANGES[upperLeft];
      return finish(fx.market, fx.exchange, upperRight, 'futures', extractVariety(right));
    }
    if (left === '90') {
      return finish('CN', 'SSE', right, 'board');
    }
  }

  // 2) 字母前缀
  const lower = code0.toLowerCase();
  for (const p of PREFIXES) {
    if (lower.startsWith(p) && code0.length > p.length) {
      const rest = code0.slice(p.length);
      const s = PREFIX_MAP[p];
      // A 股代码无字母：CN 系前缀(sh/sz/bj)要求 rest 全数字，否则不当作前缀
      // （如 'SHW'/'SHOP' 是美股 ticker，不应被 'sh' 前缀吞成 A 股）；hk/us 允许字母
      const restOk =
        s.market === 'CN' ? /^\d+$/.test(rest) : /^[0-9A-Za-z]+$/.test(rest);
      if (restOk) {
        const code =
          s.market === 'HK'
            ? rest.padStart(5, '0')
            : s.market === 'US'
              ? rest.toUpperCase()
              : rest;
        return finish(s.market, s.exchange, code, 'stock');
      }
    }
  }

  // 3) 纯数字
  if (/^\d+$/.test(code0)) {
    if (hintMarket === 'US') {
      return finish('US', 'US', code0, 'stock');
    }
    if (hintMarket === 'HK' || code0.length === 5 || code0.length === 4) {
      return finish('HK', 'HKEX', code0.padStart(5, '0'), 'stock');
    }
    // 默认 6 位及其它 → A 股
    return finish('CN', inferAShareExchange(code0), code0, 'stock');
  }

  // 4) 带 hint 的期货裸合约（如 rb2510 + assetType:'futures'）
  if (
    (hintAsset === 'futures' || hintMarket === 'GLOBAL') &&
    /[A-Za-z]/.test(code0)
  ) {
    const futExchange = hintExchange as Exchange | undefined;
    if (!futExchange && hintMarket === 'GLOBAL') {
      // 海外期货必须显式 exchange(COMEX/NYMEX/CBOT/LME...)，不能默认国内 SHFE
      throw new InvalidSymbolError(
        `${rawInput} (GLOBAL futures require an explicit exchange, e.g. { exchange: 'COMEX' })`
      );
    }
    return finish(
      hintMarket ?? 'CN',
      futExchange ?? 'SHFE',
      code0.toUpperCase(),
      'futures',
      extractVariety(code0)
    );
  }

  // 5) 纯字母 → 美股
  if (/^[A-Za-z][A-Za-z.\-]*$/.test(code0)) {
    return finish('US', 'US', code0.toUpperCase(), 'stock');
  }

  throw new InvalidSymbolError(String(rawInput));
}
