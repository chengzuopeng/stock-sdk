/**
 * 东方财富 - 港股 K 线
 */
import {
  RequestClient,
  EM_HK_KLINE_URL,
} from '../../core';
import type { HKUSHistoryKline } from '../../types';
import {
  createHistoryKlineProvider,
  type HistoryKlineRequestOptions,
} from './historyKlineFactory';

export interface HKKlineOptions extends HistoryKlineRequestOptions {}

const getHKHistoryKlineByFactory = createHistoryKlineProvider({
  url: EM_HK_KLINE_URL,
  normalizeSymbol: (symbol) => {
    const pureSymbol = symbol.replace(/^hk/i, '').padStart(5, '0');
    return {
      secid: `116.${pureSymbol}`,
      fallbackCode: pureSymbol,
    };
  },
});

/**
 * 获取港股历史 K 线（日/周/月）
 */
export async function getHKHistoryKline(
  client: RequestClient,
  symbol: string,
  options: HKKlineOptions = {}
): Promise<HKUSHistoryKline[]> {
  return getHKHistoryKlineByFactory(client, symbol, options);
}
