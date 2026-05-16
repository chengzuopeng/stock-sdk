/**
 * 东方财富 - 美股 K 线
 */
import {
  RequestClient,
  EM_US_KLINE_URL,
  MARKET_TZ,
} from '../../core';
import type { USHistoryKline } from '../../types';
import {
  createHistoryKlineProvider,
  type HistoryKlineRequestOptions,
} from './historyKlineFactory';

export interface USKlineOptions extends HistoryKlineRequestOptions {}

const getUSHistoryKlineByFactory = createHistoryKlineProvider<USHistoryKline>({
  url: EM_US_KLINE_URL,
  tz: MARKET_TZ.US,
  normalizeSymbol: (symbol) => ({
    secid: symbol,
    fallbackCode: symbol.split('.')[1] || symbol,
  }),
  resolveResultMeta: (symbol, normalizedSymbol, response) => ({
    code: response.code || normalizedSymbol.fallbackCode,
    name: response.name || '',
  }),
  enrichItem: (base) => ({
    ...base,
    currency: 'USD',
  }),
});

/**
 * 获取美股历史 K 线（日/周/月）。
 *
 * **复权默认值:`adjust='qfq'`(前复权)。** 详见
 * [复权说明](https://stock-sdk.linkdiary.cn/guide/dividend-adjustment.html)。
 *
 * @param symbol 美股代码,格式:`{market}.{ticker}`(如 `'105.MSFT'`、`'106.BABA'`)
 */
export async function getUSHistoryKline(
  client: RequestClient,
  symbol: string,
  options: USKlineOptions = {}
): Promise<USHistoryKline[]> {
  return getUSHistoryKlineByFactory(client, symbol, options);
}
