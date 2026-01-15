/**
 * 东方财富 - A 股 K 线
 */
import {
  RequestClient,
  EM_KLINE_URL,
  EM_TRENDS_URL,
  getMarketCode,
  assertKlinePeriod,
  assertMinutePeriod,
  assertAdjustType,
  toNumber,
  getPeriodCode,
  getAdjustCode,
} from '../../core';
import type { HistoryKline, MinuteTimeline, MinuteKline } from '../../types';
import { fetchEmHistoryKline, parseEmKlineCsv } from './utils';

export interface HistoryKlineOptions {
  /** K 线周期 */
  period?: 'daily' | 'weekly' | 'monthly';
  /** 复权类型 */
  adjust?: '' | 'qfq' | 'hfq';
  /** 开始日期 YYYYMMDD */
  startDate?: string;
  /** 结束日期 YYYYMMDD */
  endDate?: string;
}

export interface MinuteKlineOptions {
  /** K 线周期 */
  period?: '1' | '5' | '15' | '30' | '60';
  /** 复权类型（仅 5/15/30/60 分钟有效） */
  adjust?: '' | 'qfq' | 'hfq';
  /** 开始时间 */
  startDate?: string;
  /** 结束时间 */
  endDate?: string;
}

/**
 * 获取 A 股历史 K 线（日/周/月）
 */
export async function getHistoryKline(
  client: RequestClient,
  symbol: string,
  options: HistoryKlineOptions = {}
): Promise<HistoryKline[]> {
  const {
    period = 'daily',
    adjust = 'qfq',
    startDate = '19700101',
    endDate = '20500101',
  } = options;
  assertKlinePeriod(period);
  assertAdjustType(adjust);

  // 移除可能的交易所前缀
  const pureSymbol = symbol.replace(/^(sh|sz|bj)/, '');

  const secid = `${getMarketCode(symbol)}.${pureSymbol}`;

  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f116',
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    klt: getPeriodCode(period),
    fqt: getAdjustCode(adjust),
    secid,
    beg: startDate,
    end: endDate,
  });

  const url = EM_KLINE_URL;
  
  const { klines } = await fetchEmHistoryKline(client, url, params);

  if (klines.length === 0) {
    return [];
  }

  return klines.map((line) => {
    const item = parseEmKlineCsv(line);
    return {
      ...item,
      code: pureSymbol,
      // A 股历史 K 线接口返回的 CSV 中没有 name，需要自己补充或者忽略
      // HistoryKline 类型中也没有 name 字段，所以直接复用解析结果
    };
  });
}

/**
 * 获取 A 股分钟 K 线或分时数据
 */
export async function getMinuteKline(
  client: RequestClient,
  symbol: string,
  options: MinuteKlineOptions = {}
): Promise<MinuteTimeline[] | MinuteKline[]> {
  const {
    period = '1',
    adjust = 'qfq',
    startDate = '1979-09-01 09:32:00',
    endDate = '2222-01-01 09:32:00',
  } = options;
  assertMinutePeriod(period);
  assertAdjustType(adjust);

  // 移除可能的交易所前缀
  const pureSymbol = symbol.replace(/^(sh|sz|bj)/, '');
  const secid = `${getMarketCode(symbol)}.${pureSymbol}`;

  if (period === '1') {
    // 1 分钟分时数据，使用 trends2/get 接口
    const params = new URLSearchParams({
      fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
      ut: '7eea3edcaed734bea9cbfc24409ed989',
      ndays: '5',
      iscr: '0',
      secid,
    });

    const url = `${EM_TRENDS_URL}?${params.toString()}`;
    const json = await client.get<any>(url, { responseType: 'json' });

    const trends: string[] | undefined = json?.data?.trends;
    if (!Array.isArray(trends) || trends.length === 0) {
      return [];
    }

    // 时间范围过滤
    const start = startDate.replace('T', ' ').slice(0, 16);
    const end = endDate.replace('T', ' ').slice(0, 16);

    return trends
      .map((line) => {
        const [time, open, close, high, low, volume, amount, avgPrice] =
          line.split(',');
        return {
          time,
          open: toNumber(open),
          close: toNumber(close),
          high: toNumber(high),
          low: toNumber(low),
          volume: toNumber(volume),
          amount: toNumber(amount),
          avgPrice: toNumber(avgPrice),
        } as MinuteTimeline;
      })
      .filter((row) => row.time >= start && row.time <= end);
  } else {
    // 5/15/30/60 分钟 K 线，使用 kline/get 接口
    const params = new URLSearchParams({
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      ut: '7eea3edcaed734bea9cbfc24409ed989',
      klt: period,
      fqt: getAdjustCode(adjust || ''), // 分钟线如果不传 adjust，默认为不复权？这里原代码 adjust 可选
      secid,
      beg: '0',
      end: '20500000',
    });

    const url = EM_KLINE_URL;
    const { klines } = await fetchEmHistoryKline(client, url, params);

    if (klines.length === 0) {
      return [];
    }

    // 时间范围过滤
    const start = startDate.replace('T', ' ').slice(0, 16);
    const end = endDate.replace('T', ' ').slice(0, 16);

    return klines
      .map((line) => {
        const item = parseEmKlineCsv(line);
        return {
          ...item,
          time: item.date, // 分钟线的第一列是时间
        } as MinuteKline;
      })
      .filter((row) => row.time >= start && row.time <= end);
  }
}
