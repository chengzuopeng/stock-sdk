/**
 * 东方财富 - 港股 K 线
 */
import {
  RequestClient,
  EM_HK_KLINE_URL,
  EM_HK_TRENDS_URL,
  MARKET_TZ,
} from '../../core';
import type {
  HKHistoryKline,
  HKMinuteKline,
  HKMinuteTimeline,
} from '../../types';
import { normalizeSymbol, toEastmoneySecid } from '../../symbols';
import {
  createHistoryKlineProvider,
  type HistoryKlineRequestOptions,
} from './historyKlineFactory';
import {
  createMinuteKlineProvider,
  createOverseasMinuteRowMappers,
} from './minuteKlineFactory';

export interface HKKlineOptions extends HistoryKlineRequestOptions {}

const getHKHistoryKlineByFactory = createHistoryKlineProvider<HKHistoryKline>({
  url: EM_HK_KLINE_URL,
  tz: MARKET_TZ.HK,
  normalizeSymbol: (symbol) => {
    // F39: 收编到 v2 symbols 层(对照 aShareKline 已迁移范式),不再手拼
    // `116.${...}` —— '116.00700' / '00700.HK' 等 symbols 层支持的输入形式
    // 从此对 kline.hk 同样可用,且 symbols 的后续修复自动生效。
    const ns = normalizeSymbol(symbol, { market: 'HK' });
    return {
      secid: toEastmoneySecid(ns),
      fallbackCode: ns.code,
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

// F45:分钟K线流程收编进 createMinuteKlineProvider 工厂,港股差异点:
// - secid 经 symbols 层归一(F39:'00700' / 'hk00700' / '0700' / '700' →
//   116.00700),行的 code 字段回填归一结果的 code
// - 行时间走 createOverseasMinuteRowMappers(北京时间解析 → HK 时区格式化;
//   HKT 与 CST 同为 UTC+8,数值上无偏移,统一流程见工厂注释)
// - F34 beg/end 下推:港股 HKT 与上游北京时间同为 UTC+8(双方均无夏令时),
//   本地日期 == 北京日期,可整天直推,无需像美股那样给 end 加一天
const getHKMinuteKlineByFactory = createMinuteKlineProvider<
  HKMinuteTimeline,
  HKMinuteKline
>({
  trendsUrl: EM_HK_TRENDS_URL,
  klineUrl: EM_HK_KLINE_URL,
  resolveTarget: (symbol) => {
    const ns = normalizeSymbol(symbol, { market: 'HK' });
    return { secid: toEastmoneySecid(ns), code: ns.code };
  },
  defaultPeriod: '1',
  ndays: 'option',
  fqt: 'option',
  includeUt: true,
  window: { mode: 'filter' },
  ...createOverseasMinuteRowMappers(MARKET_TZ.HK, 'HKD'),
});

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
  return getHKMinuteKlineByFactory(client, symbol, options);
}
