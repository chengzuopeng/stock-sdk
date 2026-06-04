/**
 * 东方财富 - 港股 K 线
 */
import {
  RequestClient,
  EM_HK_KLINE_URL,
  EM_HK_TRENDS_URL,
  EM_PUSH_TOKEN,
  MARKET_TZ,
  assertMinutePeriod,
  assertAdjustType,
  parseMarketTime,
  formatInTz,
  getAdjustCode,
  toNumber,
} from '../../core';
import type {
  HKHistoryKline,
  HKMinuteKline,
  HKMinuteTimeline,
} from '../../types';
import {
  createHistoryKlineProvider,
  type HistoryKlineRequestOptions,
} from './historyKlineFactory';
import { fetchEmHistoryKline, parseEmKlineCsv } from './utils';

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

// ============================================================
// 港股分钟 K 线 / 当日分时（v1.10.0+）
// ============================================================

export interface HKMinuteKlineOptions {
  /** K 线周期 @default '1' */
  period?: '1' | '5' | '15' | '30' | '60';
  /**
   * 复权类型（仅 5/15/30/60 分钟有效；1 分钟分时不支持复权）
   * @default 'qfq'
   */
  adjust?: '' | 'qfq' | 'hfq';
  /** 开始时间 `YYYY-MM-DD HH:mm`（港股本地时区 `Asia/Hong_Kong`） */
  startDate?: string;
  /** 结束时间 `YYYY-MM-DD HH:mm`（港股本地时区） */
  endDate?: string;
  /**
   * 仅 `period='1'` 生效：返回最近 N 个交易日的分时。
   * 默认 `1`（当日分时）。可设为 `5` 拿近 5 日分时。
   */
  ndays?: number;
}

/**
 * 获取港股分钟 K 线（5/15/30/60 分钟）或当日分时（1 分钟）。
 *
 * `period='1'` 时走 `trends2/get`，返回 {@link HKMinuteTimeline}[]；
 * `period='5'|'15'|'30'|'60'` 时走 `kline/get`，返回 {@link HKMinuteKline}[]。
 *
 * @param symbol 港股代码，纯数字或带 `hk` 前缀均可（如 `'00700'`、`'hk00700'`）
 */
export async function getHKMinuteKline(
  client: RequestClient,
  symbol: string,
  options: HKMinuteKlineOptions = {}
): Promise<HKMinuteTimeline[] | HKMinuteKline[]> {
  const {
    period = '1',
    adjust = 'qfq',
    startDate = '1979-09-01 09:32:00',
    endDate = '2222-01-01 09:32:00',
    ndays = 1,
  } = options;
  assertMinutePeriod(period);
  assertAdjustType(adjust);

  const pureSymbol = symbol.replace(/^hk/i, '').padStart(5, '0');
  const secid = `116.${pureSymbol}`;

  // 东方财富 trends2 / kline 返回的 time 字符串以 +08:00 (CST) 表示。
  // 港股 HKT 与 CST 同为 UTC+8 → 数值上 HK 没有偏移问题，但为统一处理风格
  // 与未来兼容性，仍走 "先 CN 解析得 epoch、再 format 到目标 tz" 流程。
  const toLocal = (timeStr: string) => {
    const epoch = parseMarketTime(timeStr, MARKET_TZ.CN);
    return {
      time: formatInTz(epoch, MARKET_TZ.HK) || timeStr,
      timestamp: epoch,
    };
  };

  if (period === '1') {
    const params = new URLSearchParams({
      fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
      ut: EM_PUSH_TOKEN,
      ndays: String(ndays),
      iscr: '0',
      secid,
    });
    const url = `${EM_HK_TRENDS_URL}?${params.toString()}`;
    const json = await client.get<{ data?: { trends?: string[] } }>(url, {
      responseType: 'json',
    });
    const trends = json?.data?.trends;
    if (!Array.isArray(trends) || trends.length === 0) {
      return [];
    }
    const start = startDate.replace('T', ' ').slice(0, 16);
    let end = endDate.replace('T', ' ').slice(0, 16);
    // 仅日期（YYYY-MM-DD，10 位）时补到当天 23:59，避免把当天所有分钟行整天误过滤
    if (end.length === 10) end += ' 23:59';
    return trends
      .map<HKMinuteTimeline>((line) => {
        const [rawTime, open, close, high, low, volume, amount, avgPrice] =
          line.split(',');
        const { time, timestamp } = toLocal(rawTime);
        return {
          time,
          timestamp,
          tz: MARKET_TZ.HK,
          open: toNumber(open),
          close: toNumber(close),
          high: toNumber(high),
          low: toNumber(low),
          volume: toNumber(volume),
          amount: toNumber(amount),
          avgPrice: toNumber(avgPrice),
          currency: 'HKD',
          code: pureSymbol,
        };
      })
      .filter((row) => row.time >= start && row.time <= end);
  }

  // 5/15/30/60 分钟 K 线
  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    ut: EM_PUSH_TOKEN,
    klt: period,
    fqt: getAdjustCode(adjust),
    secid,
    beg: '0',
    end: '20500000',
  });
  const { klines } = await fetchEmHistoryKline(client, EM_HK_KLINE_URL, params);
  if (klines.length === 0) {
    return [];
  }
  const start = startDate.replace('T', ' ').slice(0, 16);
  let end = endDate.replace('T', ' ').slice(0, 16);
  // 仅日期（YYYY-MM-DD，10 位）时补到当天 23:59，避免把当天所有分钟行整天误过滤
  if (end.length === 10) end += ' 23:59';
  return klines
    .map<HKMinuteKline>((line) => {
      const item = parseEmKlineCsv(line);
      const { time, timestamp } = toLocal(item.date);
      return {
        time,
        timestamp,
        tz: MARKET_TZ.HK,
        open: item.open,
        close: item.close,
        high: item.high,
        low: item.low,
        volume: item.volume,
        amount: item.amount,
        amplitude: item.amplitude,
        changePercent: item.changePercent,
        change: item.change,
        turnoverRate: item.turnoverRate,
        currency: 'HKD',
        code: pureSymbol,
      };
    })
    .filter((row) => row.time >= start && row.time <= end);
}
