/**
 * 东方财富 - 港股 K 线
 */
import {
  RequestClient,
  EM_HK_KLINE_URL,
  assertKlinePeriod,
  assertAdjustType,
  toNumber,
} from '../../core';
import type { HKUSHistoryKline } from '../../types';

export interface HKKlineOptions {
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
 * 获取港股历史 K 线（日/周/月）
 */
export async function getHKHistoryKline(
  client: RequestClient,
  symbol: string,
  options: HKKlineOptions = {}
): Promise<HKUSHistoryKline[]> {
  const {
    period = 'daily',
    adjust = 'hfq',
    startDate = '19700101',
    endDate = '20500101',
  } = options;
  assertKlinePeriod(period);
  assertAdjustType(adjust);

  // 移除可能的 hk 前缀，确保是 5 位数字
  const pureSymbol = symbol.replace(/^hk/i, '').padStart(5, '0');

  const periodMap = { daily: '101', weekly: '102', monthly: '103' } as const;
  const adjustMap = { '': '0', qfq: '1', hfq: '2' } as const;
  const secid = `116.${pureSymbol}`;

  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    klt: periodMap[period],
    fqt: adjustMap[adjust],
    secid,
    beg: startDate,
    end: endDate,
    lmt: '1000000',
  });

  const url = `${EM_HK_KLINE_URL}?${params.toString()}`;
  const json = await client.get<any>(url, { responseType: 'json' });

  const klines: string[] | undefined = json?.data?.klines;
  const stockName: string = json?.data?.name || '';

  if (!Array.isArray(klines) || klines.length === 0) {
    return [];
  }

  return klines.map((line) => {
    const [
      date,
      open,
      close,
      high,
      low,
      volume,
      amount,
      amplitude,
      changePercent,
      change,
      turnoverRate,
    ] = line.split(',');
    return {
      date,
      code: pureSymbol,
      name: stockName,
      open: toNumber(open),
      close: toNumber(close),
      high: toNumber(high),
      low: toNumber(low),
      volume: toNumber(volume),
      amount: toNumber(amount),
      amplitude: toNumber(amplitude),
      changePercent: toNumber(changePercent),
      change: toNumber(change),
      turnoverRate: toNumber(turnoverRate),
    };
  });
}
