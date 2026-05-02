/**
 * 东方财富 - 国内期货 K 线
 */
import {
  RequestClient,
  EM_FUTURES_KLINE_URL,
  EM_PUSH_TOKEN,
  FUTURES_EXCHANGE_MAP,
  FUTURES_VARIETY_EXCHANGE,
  assertKlinePeriod,
  getPeriodCode,
  toNumber,
} from '../../core';
import type { FuturesKline } from '../../types';
import { fetchEmHistoryKline, parseEmKlineCsv } from './utils';

export interface FuturesKlineOptions {
  /** K 线周期 */
  period?: 'daily' | 'weekly' | 'monthly';
  /** 开始日期 YYYYMMDD */
  startDate?: string;
  /** 结束日期 YYYYMMDD */
  endDate?: string;
}

/**
 * 从合约代码中提取品种前缀
 * 如 rb2605 -> rb, RBM -> RB, IF2604 -> IF, T2609 -> T
 */
export function extractVariety(symbol: string): string {
  const match = symbol.match(/^([a-zA-Z]+)/);
  if (!match) {
    throw new RangeError(
      `Invalid futures symbol: "${symbol}". Expected format: variety + contract (e.g., rb2605, RBM, IF2604)`
    );
  }
  return match[1];
}

/**
 * 从映射表中查找品种对应的交易所（含大小写容错）
 */
function lookupExchange(variety: string): string | undefined {
  return (
    FUTURES_VARIETY_EXCHANGE[variety] ??
    FUTURES_VARIETY_EXCHANGE[variety.toLowerCase()] ??
    FUTURES_VARIETY_EXCHANGE[variety.toUpperCase()]
  );
}

/**
 * 获取期货品种对应的东方财富 market code
 * 支持品种代码（如 rb, IF, TA）和带主连后缀 M 的格式（如 RBM, IFM）
 * @param variety - 品种代码
 * @returns market code，如 113, 220, 115
 */
export function getFuturesMarketCode(variety: string): number {
  let exchange = lookupExchange(variety);

  // 主连合约（如 RBM, IFM）：剥离尾部 'M' 再查表
  if (!exchange && variety.length > 1 && variety.endsWith('M')) {
    exchange = lookupExchange(variety.slice(0, -1));
  }

  if (!exchange) {
    const supported = Object.keys(FUTURES_VARIETY_EXCHANGE).join(', ');
    throw new RangeError(
      `Unknown futures variety: "${variety}". Supported varieties: ${supported}`
    );
  }

  const marketCode = FUTURES_EXCHANGE_MAP[exchange];
  if (marketCode === undefined) {
    throw new RangeError(`No market code found for exchange: ${exchange}`);
  }
  return marketCode;
}

/**
 * 解析期货 K 线 CSV（14 列），扩展基础 parseEmKlineCsv 提取持仓量
 */
function parseFuturesKlineCsv(line: string): Omit<FuturesKline, 'code' | 'name'> {
  const base = parseEmKlineCsv(line);
  const parts = line.split(',');
  return {
    ...base,
    openInterest: parts.length > 12 ? toNumber(parts[12]) : null,
  };
}

/**
 * 获取国内期货历史 K 线（日/周/月）
 * @param client - 请求客户端
 * @param symbol - 合约代码，如 'rb2605'（具体合约）或 'RBM'（主连）
 * @param options - 配置选项
 * @returns 期货 K 线数据数组
 */
export async function getFuturesHistoryKline(
  client: RequestClient,
  symbol: string,
  options: FuturesKlineOptions = {}
): Promise<FuturesKline[]> {
  const {
    period = 'daily',
    startDate = '19700101',
    endDate = '20500101',
  } = options;
  assertKlinePeriod(period);

  const variety = extractVariety(symbol);
  const marketCode = getFuturesMarketCode(variety);
  const secid = `${marketCode}.${symbol}`;

  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64',
    ut: EM_PUSH_TOKEN,
    klt: getPeriodCode(period),
    fqt: '0',
    secid,
    beg: startDate,
    end: endDate,
  });

  const { klines, name, code } = await fetchEmHistoryKline(
    client,
    EM_FUTURES_KLINE_URL,
    params
  );

  if (klines.length === 0) {
    return [];
  }

  return klines.map((line) => {
    const item = parseFuturesKlineCsv(line);
    return {
      ...item,
      code: code || symbol,
      name: name || '',
    };
  });
}
