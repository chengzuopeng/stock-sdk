/**
 * 新浪财经 - 中金所股指期权（上证50 / 沪深300 / 中证1000）
 */
import { jsonpRequest, SINA_OPTION_API_URL, SINA_OPTION_DAYLINE_URL } from '../../core';
import { toNumberSafe } from '../../core/parser';
import type {
  IndexOptionProduct,
  OptionTQuote,
  OptionTQuoteResult,
  OptionKline,
} from '../../types';

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
 * 获取中金所股指期权 T 型报价
 * @param product - 品种代码 'ho'(上证50) / 'io'(沪深300) / 'mo'(中证1000)
 * @param contract - 合约代码，如 'io2504'
 * @returns T 型报价（看涨 + 看跌）
 */
export async function getIndexOptionSpot(
  product: IndexOptionProduct,
  contract: string
): Promise<OptionTQuoteResult> {
  const url = `${SINA_OPTION_API_URL}?type=futures&product=${product}&exchange=cffex&pinzhong=${contract}`;
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
 * 获取中金所股指期权合约日 K 线
 * @param symbol - 合约代码（含看涨/看跌标识），如 'io2504C3600'
 * @returns 日 K 线数据
 */
export async function getIndexOptionKline(
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
