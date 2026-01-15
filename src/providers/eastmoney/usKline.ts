/**
 * 东方财富 - 美股 K 线
 */
import {
  RequestClient,
  EM_US_KLINE_URL,
  assertKlinePeriod,
  assertAdjustType,
  getPeriodCode,
  getAdjustCode,
} from '../../core';
import type { HKUSHistoryKline } from '../../types';
import { fetchEmHistoryKline, parseEmKlineCsv } from './utils';

export interface USKlineOptions {
  /** K 线周期 */
  period?: 'daily' | 'weekly' | 'monthly';
  /** 复权类型 */
  adjust?: '' | 'qfq' | 'hfq';
  /** 开始日期 YYYYMMDD */
  startDate?: string;
  /** 结束日期 YYYYMMDD */
  endDate?: string;
}

/**
 * 获取美股历史 K 线（日/周/月）
 * @param symbol 美股代码，格式：'{market}.{ticker}'（如 '105.MSFT'、'106.BABA'）
 */
export async function getUSHistoryKline(
  client: RequestClient,
  symbol: string,
  options: USKlineOptions = {}
): Promise<HKUSHistoryKline[]> {
  const {
    period = 'daily',
    adjust = 'qfq',
    startDate = '19700101',
    endDate = '20500101',
  } = options;
  assertKlinePeriod(period);
  assertAdjustType(adjust);

  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    klt: getPeriodCode(period),
    fqt: getAdjustCode(adjust),
    secid: symbol,
    beg: startDate,
    end: endDate,
    lmt: '1000000',
  });

  const url = EM_US_KLINE_URL;
  
  const { klines, name, code } = await fetchEmHistoryKline(client, url, params);
  
  const stockCode = code || symbol.split('.')[1] || symbol;
  const stockName = name || '';

  if (klines.length === 0) {
    return [];
  }

  return klines.map((line) => {
    const item = parseEmKlineCsv(line);
    return {
      ...item,
      code: stockCode,
      name: stockName,
    };
  });
}
