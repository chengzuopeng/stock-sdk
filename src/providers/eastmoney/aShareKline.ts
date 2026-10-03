/**
 * 东方财富 - A 股 K 线
 */
import {
  RequestClient,
  EM_KLINE_URL,
  EM_TRENDS_URL,
  EM_PUSH_TOKEN,
  assertKlinePeriod,
  assertMinutePeriod,
  assertAdjustType,
  getPeriodCode,
  getAdjustCode,
  getSdkErrorCode,
  buildTimeMeta,
  MARKET_TZ,
  UpstreamEmptyError,
  type SdkErrorCode,
} from '../../core';
import type { HistoryKline, MinuteTimeline, MinuteKline } from '../../types';
import { normalizeSymbol, toEastmoneySecid } from '../../symbols';
import { createMinuteKlineProvider } from './minuteKlineFactory';
import {
  fetchEmHistoryKline,
  parseEmKlineCsv,
  type EmKlineRequestOptions,
} from './utils';
import {
  getTencentHistoryKline,
  getTencentMinuteKline,
} from '../tencent/kline';
import { getSinaHistoryKline, getSinaMinuteKline } from '../sina/kline';

const KLINE_FALLBACK_ERROR_CODES: ReadonlySet<SdkErrorCode> = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'HTTP_ERROR',
  'RATE_LIMITED',
  'CIRCUIT_OPEN',
  'UPSTREAM_EMPTY',
  'UPSTREAM_ERROR',
  'PARSE_ERROR',
]);

function shouldUseKlineFallback(error: unknown): boolean {
  const code = getSdkErrorCode(error);
  return code !== undefined && KLINE_FALLBACK_ERROR_CODES.has(code);
}

/**
 * A 股 K 线的数据源策略，由 SDK 构造参数 `klineFallback` 决定，不属于单次调用参数。
 */
export interface KlineSourceOptions {
  /**
   * 东方财富失败时是否按腾讯、新浪顺序切换备用源 @default true
   *
   * 关闭后只请求东方财富，断连 / 超时等按 `retry` / `providerPolicies.eastmoney` 重试；
   * 软限流返回的 `data:null` 是 HTTP 200，不会重试，直接抛 `UPSTREAM_EMPTY`。
   */
  fallback?: boolean;
}

// push2his 的所有数字子域实际落到同一出口，遭频控时逐域重试只会放大请求，
// 所以两种模式都只请求主域名。开启备用源时东财只探测一次，失败即切腾讯；
// 关闭时没有备用源可切，按 retry / providerPolicies 的配置重试。
const EM_PROBE_ONCE: EmKlineRequestOptions = {
  retry: { maxRetries: 0 },
  hostFallback: false,
};
const EM_POLICY_RETRY: EmKlineRequestOptions = { hostFallback: false };

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
 *
 * 东方财富失败时默认按腾讯、新浪顺序切换备用源；`source.fallback=false` 时只请求东方财富。
 */
export async function getHistoryKline(
  client: RequestClient,
  symbol: string,
  options: HistoryKlineOptions = {},
  source: KlineSourceOptions = {}
): Promise<HistoryKline[]> {
  const useFallback = source.fallback !== false;
  const {
    period = 'daily',
    adjust = 'qfq',
    startDate = '19700101',
    endDate = '20500101',
  } = options;
  assertKlinePeriod(period);
  assertAdjustType(adjust);

  const ns = normalizeSymbol(symbol, { market: 'CN' });
  const secid = toEastmoneySecid(ns);

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

  let klines: string[];
  try {
    const response = await fetchEmHistoryKline(
      client,
      EM_KLINE_URL,
      params,
      useFallback ? EM_PROBE_ONCE : EM_POLICY_RETRY
    );
    if (!response.dataPresent) {
      throw new UpstreamEmptyError(
        'Eastmoney K-line response has no data payload',
        'eastmoney',
        EM_KLINE_URL
      );
    }
    klines = response.klines;
  } catch (primaryError) {
    if (!useFallback || !shouldUseKlineFallback(primaryError)) throw primaryError;
    try {
      return await getTencentHistoryKline(client, symbol, options);
    } catch (tencentError) {
      if (!shouldUseKlineFallback(tencentError)) throw primaryError;
      try {
        return await getSinaHistoryKline(client, symbol, options);
      } catch {
        // 所有备用源均不可用时保留原始东财错误，避免掩盖主因。
        throw primaryError;
      }
    }
  }

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
      code: ns.code,
      // A 股历史 K 线接口返回的 CSV 中没有 name，需要自己补充或者忽略
      // HistoryKline 类型中也没有 name 字段，所以直接复用解析结果
    };
  });
}

// F45:分钟K线流程收编进 createMinuteKlineProvider 工厂,A 股差异点:
// secid 走 symbols 层 CN 归一、ndays 固定 '5'、行时间即北京时间
// (buildTimeMeta CN 解析,F34 的 beg/end 日期可整天直推,无需 endExtraDays)。
const getMinuteKlineByFactory = createMinuteKlineProvider<
  MinuteTimeline,
  MinuteKline
>({
  trendsUrl: EM_TRENDS_URL,
  klineUrl: EM_KLINE_URL,
  resolveTarget: (symbol) => {
    const ns = normalizeSymbol(symbol, { market: 'CN' });
    return { secid: toEastmoneySecid(ns), code: ns.code };
  },
  defaultPeriod: '1',
  ndays: { fixed: '5' },
  fqt: 'option',
  includeUt: true,
  requireKlineData: true,
  window: { mode: 'filter' },
  mapTrendRow: ({ time, ...nums }) => {
    const meta = buildTimeMeta(time, MARKET_TZ.CN);
    return { time, timestamp: meta.timestamp, tz: meta.tz, ...nums };
  },
  mapKlineRow: (item) => {
    const meta = buildTimeMeta(item.date, MARKET_TZ.CN);
    return {
      ...item,
      time: item.date, // 分钟线的第一列是时间
      timestamp: meta.timestamp,
      tz: meta.tz,
    } as MinuteKline;
  },
});

/**
 * 获取 A 股分钟 K 线或分时数据
 *
 * 5/15/30/60 分钟 K 线在东方财富失败时默认按腾讯、新浪顺序切换备用源；
 * `source.fallback=false` 时只请求东方财富。1 分钟分时没有备用源。
 */
export async function getMinuteKline(
  client: RequestClient,
  symbol: string,
  options: MinuteKlineOptions = {},
  source: KlineSourceOptions = {}
): Promise<MinuteTimeline[] | MinuteKline[]> {
  const useFallback = source.fallback !== false;
  const period = options.period ?? '1';
  assertMinutePeriod(period);
  if (period !== '1') {
    assertAdjustType(options.adjust ?? 'qfq');
  }

  try {
    return await getMinuteKlineByFactory(
      client,
      symbol,
      options,
      useFallback ? EM_PROBE_ONCE : EM_POLICY_RETRY
    );
  } catch (primaryError) {
    if (!useFallback || period === '1' || !shouldUseKlineFallback(primaryError)) {
      throw primaryError;
    }
    try {
      return await getTencentMinuteKline(client, symbol, {
        period,
        startDate: options.startDate,
        endDate: options.endDate,
      });
    } catch (tencentError) {
      if (!shouldUseKlineFallback(tencentError)) throw primaryError;
      try {
        return await getSinaMinuteKline(client, symbol, {
          period,
          startDate: options.startDate,
          endDate: options.endDate,
        });
      } catch {
        throw primaryError;
      }
    }
  }
}
