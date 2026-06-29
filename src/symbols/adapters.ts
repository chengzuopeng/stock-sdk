/**
 * Provider 符号适配器：NormalizedSymbol → 各数据源原生格式（纯函数）
 *
 * 仅覆盖股票/指数/基金/板块这类有明确 secid 体系的资产；期货/期权的 secid
 * 体系不同（且由各自 provider 内联处理），这里对它们显式抛错而非静默兜底，
 * 避免把海外期货误拼成美股 secid（105.xxx）这类隐蔽错误。
 */
import type { NormalizedSymbol } from './types';
import { InvalidArgumentError } from '../core/errors';

/**
 * 交易所 → 东财 secid 数字市场前缀（仅股票类）。
 * F41: 导出供 providers 复用（tencent/batch 的美股代码列表按前缀过滤），
 * 不再在各处重复声明 NASDAQ/NYSE/AMEX → 105/106/107 映射。
 */
export const EXCHANGE_TO_SECID_PREFIX: Record<string, string> = {
  SSE: '1',
  SZSE: '0',
  BSE: '0',
  HKEX: '116',
  NASDAQ: '105',
  NYSE: '106',
  AMEX: '107',
  US: '105',
};

const SPECIAL_CODE_TO_SECID: Record<string, string> = {
  H30533: '2.H30533',
  H11136: '2.H11136',
  HSHCI: '124.HSHCI',
  GDAXI: '100.GDAXI',
  '932000': '2.932000',
  '930955': '2.930955',
};

/** 交易所 → 腾讯前缀（A 股） */
const EXCHANGE_TO_TENCENT_PREFIX: Record<string, string> = {
  SSE: 'sh',
  SZSE: 'sz',
  BSE: 'bj',
};

/**
 * → 腾讯行情格式：sh600519 / sz000001 / bj920819 / hk00700 / usAAPL
 */
export function toTencentSymbol(ns: NormalizedSymbol): string {
  if (
    ns.assetType === 'board' ||
    ns.assetType === 'futures' ||
    ns.assetType === 'option'
  ) {
    throw new InvalidArgumentError(
      `Tencent quote symbol does not support assetType '${ns.assetType}'`,
      { assetType: ns.assetType, code: ns.code }
    );
  }
  switch (ns.market) {
    case 'CN': {
      const prefix = EXCHANGE_TO_TENCENT_PREFIX[ns.exchange];
      if (!prefix) {
        throw new InvalidArgumentError(
          `Cannot map to Tencent symbol: unsupported CN exchange '${ns.exchange}'`,
          { exchange: ns.exchange, code: ns.code }
        );
      }
      return `${prefix}${ns.code}`;
    }
    case 'HK':
      return `hk${ns.code.padStart(5, '0')}`;
    case 'US':
      return `us${ns.code}`;
    default:
      throw new InvalidArgumentError(
        `Cannot map to Tencent symbol: unsupported market '${ns.market}'`,
        { market: ns.market, code: ns.code }
      );
  }
}

/**
 * → 东财 secid：1.600519 / 0.000001 / 116.00700 / 105.AAPL / 90.BK0475（板块）
 */
export function toEastmoneySecid(ns: NormalizedSymbol): string {
  if (ns.assetType === 'board') {
    return `90.${ns.code}`;
  }
  if (ns.assetType === 'futures' || ns.assetType === 'option') {
    throw new InvalidArgumentError(
      `Eastmoney secid for assetType '${ns.assetType}' uses a separate scheme; ` +
        `use the dedicated futures/options provider instead of toEastmoneySecid`,
      { assetType: ns.assetType, exchange: ns.exchange, code: ns.code }
    );
  }
  if (ns.market === 'HK') {
    return `116.${ns.code.padStart(5, '0')}`;
  }
  const specialSecid = SPECIAL_CODE_TO_SECID[ns.code.toUpperCase()];
  if (specialSecid) {
    return specialSecid;
  }
  const prefix = EXCHANGE_TO_SECID_PREFIX[ns.exchange];
  if (!prefix) {
    throw new InvalidArgumentError(
      `Cannot map to Eastmoney secid: unsupported exchange '${ns.exchange}' (market=${ns.market})`,
      { exchange: ns.exchange, market: ns.market, code: ns.code }
    );
  }
  return `${prefix}.${ns.code}`;
}

/** → 纯代码（去前缀） */
export function toPlainCode(ns: NormalizedSymbol): string {
  return ns.code;
}
