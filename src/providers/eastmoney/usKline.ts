/**
 * 东方财富 - 美股 K 线
 */
import {
  RequestClient,
  EM_US_KLINE_URL,
  EM_US_TRENDS_URL,
  MARKET_TZ,
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
  createMinuteKlineProvider,
  createOverseasMinuteRowMappers,
} from './minuteKlineFactory';

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

// F45:分钟K线流程收编进 createMinuteKlineProvider 工厂,美股差异点:
// - secid 直传(格式 `{market}.{ticker}`),行的 code 取 ticker 部分
// - 行时间走 createOverseasMinuteRowMappers:上游 time 是北京时间字符串,
//   必须先按 Asia/Shanghai 解 epoch 再 format 到 America/New_York(带夏令时,
//   与北京差 12-13 小时;若直接当 NYC 时间解析,timestamp 与窗口过滤都会错)
// - F34 beg/end 下推:上游按【北京时间】日期裁剪,而本函数的 startDate/endDate
//   是美东时区 —— NY 交易日 D 的下午盘对应北京时间 D+1 凌晨,end 取当天会把
//   这些行裁掉,故 endExtraDays=1 给 end 加 1 天保证服务端窗口是目标数据的
//   超集;beg 无此问题(NY 日期 D 的行其北京日期只会是 D 或 D+1)。
//   多拉的边缘行仍由工厂的 NY 本地时间过滤兜底,语义不变。
const getUSMinuteKlineByFactory = createMinuteKlineProvider<
  USMinuteTimeline,
  USMinuteKline
>({
  trendsUrl: EM_US_TRENDS_URL,
  klineUrl: EM_US_KLINE_URL,
  resolveTarget: (symbol) => ({
    secid: symbol,
    code: symbol.split('.')[1] || symbol,
  }),
  defaultPeriod: '1',
  ndays: 'option',
  fqt: 'option',
  includeUt: true,
  window: { mode: 'filter', endExtraDays: 1 },
  ...createOverseasMinuteRowMappers(MARKET_TZ.US, 'USD'),
});

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
  return getUSMinuteKlineByFactory(client, symbol, options);
}
