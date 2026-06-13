/**
 * 东方财富 - 美股 K 线
 */
import {
  RequestClient,
  EM_US_KLINE_URL,
  EM_US_TRENDS_URL,
  EM_PUSH_TOKEN,
  MARKET_TZ,
  assertMinutePeriod,
  assertAdjustType,
  parseMarketTime,
  toNullableEpoch,
  formatInTz,
  getAdjustCode,
  toNumber,
} from '../../core';
import type {
  USHistoryKline,
  USMinuteKline,
  USMinuteTimeline,
} from '../../types';
import {
  createHistoryKlineProvider,
  type HistoryKlineRequestOptions,
} from './historyKlineFactory';
import {
  fetchEmHistoryKline,
  parseEmKlineCsv,
  normalizeMinuteWindow,
  resolveMinuteBegEnd,
} from './utils';

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

// ============================================================
// 美股分钟 K 线 / 当日分时（v1.10.0+）
// ============================================================

export interface USMinuteKlineOptions {
  /** K 线周期 @default '1' */
  period?: '1' | '5' | '15' | '30' | '60';
  /**
   * 复权类型（仅 5/15/30/60 分钟有效；1 分钟分时不支持复权）
   * @default 'qfq'
   */
  adjust?: '' | 'qfq' | 'hfq';
  /** 开始时间 `YYYY-MM-DD HH:mm`（美东时区 `America/New_York`，自动 DST） */
  startDate?: string;
  /** 结束时间 `YYYY-MM-DD HH:mm`（美东时区） */
  endDate?: string;
  /**
   * 仅 `period='1'` 生效：返回最近 N 个交易日的分时。
   * 默认 `1`（当日分时）。可设为 `5` 拿近 5 日分时。
   */
  ndays?: number;
}

/**
 * 获取美股分钟 K 线（5/15/30/60 分钟）或当日分时（1 分钟）。
 *
 * 不含盘前 / 盘后数据，仅常规交易时段。
 *
 * `period='1'` 时走 `trends2/get`，返回 {@link USMinuteTimeline}[]；
 * `period='5'|'15'|'30'|'60'` 时走 `kline/get`，返回 {@link USMinuteKline}[]。
 *
 * @param symbol 美股代码，格式 `{market}.{ticker}`（如 `'105.AAPL'`、`'106.BABA'`）
 */
export async function getUSMinuteKline(
  client: RequestClient,
  symbol: string,
  options: USMinuteKlineOptions = {}
): Promise<USMinuteTimeline[] | USMinuteKline[]> {
  const {
    period = '1',
    adjust = 'qfq',
    startDate = '1979-09-01 09:32:00',
    endDate = '2222-01-01 09:32:00',
    ndays = 1,
  } = options;
  assertMinutePeriod(period);
  assertAdjustType(adjust);

  const secid = symbol;
  const code = symbol.split('.')[1] || symbol;

  // 东方财富 trends2 / kline 返回的 time 字符串以 +08:00 (Asia/Shanghai) 表示。
  // 美股本地时区为 America/New_York（带夏令时），与北京时间差 12-13 小时；
  // 因此必须：先按 Asia/Shanghai 解 epoch，再 format 到 America/New_York。
  // 若直接用 buildTimeMeta(rawTime, MARKET_TZ.US) 会把北京时间当 NYC 时间，
  // timestamp 偏 12-13 小时、startDate/endDate 过滤也会错。
  const toLocal = (timeStr: string) => {
    const epoch = parseMarketTime(timeStr, MARKET_TZ.CN);
    return {
      time: formatInTz(epoch, MARKET_TZ.US) || timeStr,
      // NaN→null 归一:本文件是全库仅有的两处绕过 buildTimeMeta 直落 timestamp
      // 的调用,不归一会让 NaN 流进 `number | null` 字段(违反 v2 契约)
      timestamp: toNullableEpoch(epoch),
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
    const url = `${EM_US_TRENDS_URL}?${params.toString()}`;
    const json = await client.get<{ data?: { trends?: string[] } }>(url, {
      responseType: 'json',
    });
    const trends = json?.data?.trends;
    if (!Array.isArray(trends) || trends.length === 0) {
      return [];
    }
    const { start, end } = normalizeMinuteWindow(startDate, endDate);
    return trends
      .map<USMinuteTimeline>((line) => {
        const [rawTime, open, close, high, low, volume, amount, avgPrice] =
          line.split(',');
        const { time, timestamp } = toLocal(rawTime);
        return {
          time,
          timestamp,
          tz: MARKET_TZ.US,
          open: toNumber(open),
          close: toNumber(close),
          high: toNumber(high),
          low: toNumber(low),
          volume: toNumber(volume),
          amount: toNumber(amount),
          avgPrice: toNumber(avgPrice),
          currency: 'USD',
          code,
        };
      })
      .filter((row) => row.time >= start && row.time <= end);
  }

  // 5/15/30/60 分钟 K 线
  // F34:调用方传了 startDate/endDate 时把日期部分下推为 beg/end 做服务端裁剪,
  // 不再硬编码 beg=0&end=20500000 全量下载数年历史再本地过滤。
  // 上游 beg/end 按北京时间日期裁剪,而本函数的 startDate/endDate 是美东时区:
  // NY 交易日 D 的下午盘对应北京时间 D+1 凌晨,end 取当天会把这些行裁掉,
  // 故 end 加 1 天(endExtraDays=1)保证服务端窗口是目标数据的超集;
  // beg 无此问题(NY 日期 D 的行其北京日期只会是 D 或 D+1)。
  // 多拉的边缘行仍由下方 NY 本地时间过滤兜底,语义不变。
  const serverWindow = resolveMinuteBegEnd(options.startDate, options.endDate, 1);
  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    ut: EM_PUSH_TOKEN,
    klt: period,
    fqt: getAdjustCode(adjust),
    secid,
    beg: serverWindow.beg,
    end: serverWindow.end,
  });
  const { klines } = await fetchEmHistoryKline(client, EM_US_KLINE_URL, params);
  if (klines.length === 0) {
    return [];
  }
  const { start, end } = normalizeMinuteWindow(startDate, endDate);
  return klines
    .map<USMinuteKline>((line) => {
      const item = parseEmKlineCsv(line);
      const { time, timestamp } = toLocal(item.date);
      return {
        time,
        timestamp,
        tz: MARKET_TZ.US,
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
        currency: 'USD',
        code,
      };
    })
    .filter((row) => row.time >= start && row.time <= end);
}
