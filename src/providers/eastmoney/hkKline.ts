/**
 * 东方财富 - 港股 K 线
 */
import {
  RequestClient,
  EM_HK_KLINE_URL,
  MARKET_TZ,
} from '../../core';
import type { HKHistoryKline } from '../../types';
import {
  createHistoryKlineProvider,
  type HistoryKlineRequestOptions,
} from './historyKlineFactory';

export interface HKKlineOptions extends HistoryKlineRequestOptions {}

const getHKHistoryKlineByFactory = createHistoryKlineProvider<HKHistoryKline>({
  url: EM_HK_KLINE_URL,
  tz: MARKET_TZ.HK,
  normalizeSymbol: (symbol) => {
    const pureSymbol = symbol.replace(/^hk/i, '').padStart(5, '0');
    return {
      secid: `116.${pureSymbol}`,
      fallbackCode: pureSymbol,
    };
  },
  enrichItem: (base) => ({
    ...base,
    currency: 'HKD',
    // 港股每手股数在 K 线接口中不返回,如需该字段请用 `getHKQuotes`
    lotSize: null,
  }),
});

/**
 * 获取港股历史 K 线（日/周/月）。
 *
 * **复权默认值:`adjust='qfq'`(前复权)。** 详见
 * [复权说明](https://stock-sdk.linkdiary.cn/guide/dividend-adjustment.html)。
 */
export async function getHKHistoryKline(
  client: RequestClient,
  symbol: string,
  options: HKKlineOptions = {}
): Promise<HKHistoryKline[]> {
  return getHKHistoryKlineByFactory(client, symbol, options);
}
