/**
 * 东方财富 - 美股 K 线
 */
import {
  RequestClient,
  EM_US_KLINE_URL,
} from '../../core';
import type { HKUSHistoryKline } from '../../types';
import {
  createHistoryKlineProvider,
  type HistoryKlineRequestOptions,
} from './historyKlineFactory';

export interface USKlineOptions extends HistoryKlineRequestOptions {}

const getUSHistoryKlineByFactory = createHistoryKlineProvider({
  url: EM_US_KLINE_URL,
  normalizeSymbol: (symbol) => ({
    secid: symbol,
    fallbackCode: symbol.split('.')[1] || symbol,
  }),
  resolveResultMeta: (symbol, normalizedSymbol, response) => ({
    code: response.code || normalizedSymbol.fallbackCode,
    name: response.name || '',
  }),
});

/**
 * 获取美股历史 K 线（日/周/月）
 * @param symbol 美股代码，格式：'{market}.{ticker}'（如 '105.MSFT'、'106.BABA'）
 */
export async function getUSHistoryKline(
  client: RequestClient,
  symbol: string,
  options: USKlineOptions = {}
): Promise<HKUSHistoryKline[]> {
  return getUSHistoryKlineByFactory(client, symbol, options);
}
