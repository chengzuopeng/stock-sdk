/**
 * 东方财富 - A 股 K 线
 */
import {
  RequestClient,
  EM_KLINE_URL,
  EM_TRENDS_URL,
  EM_PUSH_TOKEN,
  getMarketCode,
  assertKlinePeriod,
  assertMinutePeriod,
  assertAdjustType,
  toNumber,
  getPeriodCode,
  getAdjustCode,
  buildTimeMeta,
  MARKET_TZ,
} from '../../core';
import type { HistoryKline, MinuteTimeline, MinuteKline } from '../../types';
import { fetchEmHistoryKline, parseEmKlineCsv } from './utils';

export interface HistoryKlineOptions {
  /** K 线周期 @default 'daily' */
  period?: 'daily' | 'weekly' | 'monthly';
  /**
   * 复权类型
   *
   * - `'qfq'` 前复权(默认):用最新一次分红送股调整历史价格,适合看走势
   * - `'hfq'` 后复权:固定历史价格,把分红送股摊到当下,适合长期收益率/复利计算
   * - `''` 不复权:返回交易所原始价格
   *
   * **未传时默认使用 `'qfq'`**。如果做回测、计算分红再投资收益,请显式传 `'hfq'` 或 `''`。
   *
   * @default 'qfq'
   */
  adjust?: '' | 'qfq' | 'hfq';
  /** 开始日期 YYYYMMDD */
  startDate?: string;
  /** 结束日期 YYYYMMDD */
  endDate?: string;
}

export interface MinuteKlineOptions {
  /** K 线周期 @default '1' */
  period?: '1' | '5' | '15' | '30' | '60';
  /**
   * 复权类型(仅 5/15/30/60 分钟有效;1 分钟分时不支持复权)
   *
   * - `'qfq'` 前复权(默认)
   * - `'hfq'` 后复权
   * - `''` 不复权
   *
   * @default 'qfq'
   */
  adjust?: '' | 'qfq' | 'hfq';
  /** 开始时间 */
  startDate?: string;
  /** 结束时间 */
  endDate?: string;
}

/**
 * 获取 A 股历史 K 线(日/周/月)。
 *
 * **复权说明:** 默认 `adjust='qfq'`(前复权)。回测、收益率计算请显式传 `'hfq'` 或 `''`。
 * 详见 [复权说明](https://stock-sdk.linkdiary.cn/guide/dividend-adjustment.html)。
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
    ut: EM_PUSH_TOKEN,
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
    const meta = buildTimeMeta(item.date, MARKET_TZ.CN);
    return {
      ...item,
      timestamp: meta.timestamp,
      tz: meta.tz,
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
      ut: EM_PUSH_TOKEN,
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
        const meta = buildTimeMeta(time, MARKET_TZ.CN);
        return {
          time,
          timestamp: meta.timestamp,
          tz: meta.tz,
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
      ut: EM_PUSH_TOKEN,
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
        const meta = buildTimeMeta(item.date, MARKET_TZ.CN);
        return {
          ...item,
          time: item.date, // 分钟线的第一列是时间
          timestamp: meta.timestamp,
          tz: meta.tz,
        } as MinuteKline;
      })
      .filter((row) => row.time >= start && row.time <= end);
  }
}
