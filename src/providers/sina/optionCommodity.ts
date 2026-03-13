/**
 * 新浪财经 - 商品期权
 */
import {
  jsonpRequest,
  SINA_OPTION_API_URL,
  SINA_OPTION_DAYLINE_URL,
  COMMODITY_OPTION_MAP,
} from '../../core';
import { toNumberSafe } from '../../core/parser';
import type { OptionTQuote, OptionTQuoteResult, OptionKline } from '../../types';

interface SinaOptionResponse {
  result?: {
    status?: { code: number };
    data?: {
      up?: string[][];
      down?: string[][];
    };
  };
}

function parseCallQuote(row: string[]): OptionTQuote {
  return {
    buyVolume: toNumberSafe(row[0]),
    buyPrice: toNumberSafe(row[1]),
    price: toNumberSafe(row[2]),
    askPrice: toNumberSafe(row[3]),
    askVolume: toNumberSafe(row[4]),
    openInterest: toNumberSafe(row[5]),
    change: toNumberSafe(row[6]),
    strikePrice: toNumberSafe(row[7]),
    symbol: row[8] ?? '',
  };
}

function parsePutQuote(row: string[]): OptionTQuote {
  return {
    buyVolume: toNumberSafe(row[0]),
    buyPrice: toNumberSafe(row[1]),
    price: toNumberSafe(row[2]),
    askPrice: toNumberSafe(row[3]),
    askVolume: toNumberSafe(row[4]),
    openInterest: toNumberSafe(row[5]),
    change: toNumberSafe(row[6]),
    strikePrice: null,
    symbol: row[7] ?? '',
  };
}

/**
 * 获取商品期权 T 型报价
 * @param variety - 品种代码（如 'au', 'cu', 'SR'），需在 COMMODITY_OPTION_MAP 中存在
 * @param contract - 合约代码，如 'au2506', 'm2505'
 * @returns T 型报价（看涨 + 看跌）
 */
export async function getCommodityOptionSpot(
  variety: string,
  contract: string
): Promise<OptionTQuoteResult> {
  const mapping = COMMODITY_OPTION_MAP[variety];
  if (!mapping) {
    throw new RangeError(
      `Unknown commodity option variety: "${variety}". Available: ${Object.keys(COMMODITY_OPTION_MAP).join(', ')}`
    );
  }

  const url =
    `${SINA_OPTION_API_URL}?type=futures` +
    `&product=${mapping.product}` +
    `&exchange=${mapping.exchange}` +
    `&pinzhong=${contract}`;

  const data = await jsonpRequest<SinaOptionResponse>(url);

  const up = data?.result?.data?.up ?? [];
  const down = data?.result?.data?.down ?? [];

  return {
    calls: up.map(parseCallQuote),
    puts: down.map(parsePutQuote),
  };
}

interface SinaKlineItem {
  d: string;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}

/**
 * 获取商品期权合约日 K 线
 * @param symbol - 合约代码（含看涨/看跌标识），如 'm2409C3200', 'au2412C580'
 * @returns 日 K 线数据
 */
export async function getCommodityOptionKline(
  symbol: string
): Promise<OptionKline[]> {
  const url = `${SINA_OPTION_DAYLINE_URL}?symbol=${symbol}`;
  const data = await jsonpRequest<SinaKlineItem[] | null>(url, {
    callbackMode: 'path',
  });

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    date: item.d,
    open: toNumberSafe(item.o),
    high: toNumberSafe(item.h),
    low: toNumberSafe(item.l),
    close: toNumberSafe(item.c),
    volume: toNumberSafe(item.v),
  }));
}
