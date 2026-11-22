/**
 * 新浪财经 - A 股 K 线备用源。
 *
 * 使用跨域可加载的 JSONP 接口，Node.js 端复用 RequestClient，浏览器端通过
 * script 注入。新浪数据为不复权 OHLCV；日线可返回完整上市历史，分钟线最多
 * 约 5000 根。
 */
import {
  type RequestClient,
  SINA_CN_KLINE_URL,
  SINA_CN_KLINE_JSONP_URL,
  jsonpRequest,
  buildTimeMeta,
  MARKET_TZ,
  toNumberSafe,
  UpstreamEmptyError,
  UpstreamError,
} from '../../core';
import type { HistoryKline, MinuteKline } from '../../types';
import { normalizeSymbol } from '../../symbols';

/** 新浪历史 K 线备用源参数。 */
export interface SinaHistoryKlineOptions {
  period?: 'daily' | 'weekly' | 'monthly';
  /** 新浪备用源不支持复权；保留字段用于与统一 K 线 options 对齐。 */
  adjust?: '' | 'qfq' | 'hfq';
  startDate?: string;
  endDate?: string;
}

/** 新浪分钟 K 线备用源参数。 */
export interface SinaMinuteKlineOptions {
  period: '5' | '15' | '30' | '60';
  startDate?: string;
  endDate?: string;
}

interface SinaKlineRaw {
  day?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
  volume?: unknown;
  amount?: unknown;
}

interface ParsedSinaRow {
  time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  amount: number | null;
}

interface SinaErrorPayload {
  __ERROR?: unknown;
  __ERRORMSG?: unknown;
}

const HISTORY_DATA_LEN = 10_000;
const MINUTE_DATA_LEN = 5_000;
const BROWSER_DATA_LEN = 1_023;

function isBrowserEnv(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

function effectiveDataLen(dataLen: number): number {
  return isBrowserEnv() ? Math.min(dataLen, BROWSER_DATA_LEN) : dataLen;
}

function toSinaSymbol(exchange: string, code: string): string {
  const prefix =
    exchange === 'SSE'
      ? 'sh'
      : exchange === 'SZSE'
        ? 'sz'
        : exchange === 'BSE'
          ? 'bj'
          : undefined;
  if (!prefix) {
    throw new UpstreamEmptyError(
      `Sina has no CN K-line mapping for exchange: ${exchange}`,
      'sina'
    );
  }
  return `${prefix}${code}`;
}

function toIsoDate(value: string): string {
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  return compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}`
    : value.slice(0, 10);
}

function normalizeMinuteBoundary(value: string, endOfDay: boolean): string {
  const match =
    /^(\d{4})-?(\d{2})-?(\d{2})(?:[ T]?(\d{2}):?(\d{2}))?/.exec(
      value.trim()
    );
  if (!match) return value;
  const hour = match[4] ?? (endOfDay ? '23' : '00');
  const minute = match[5] ?? (endOfDay ? '59' : '00');
  return `${match[1]}-${match[2]}-${match[3]} ${hour}:${minute}`;
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPrice(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function parseRows(payload: unknown): ParsedSinaRow[] {
  if (!Array.isArray(payload)) {
    const error = payload as SinaErrorPayload | null;
    if (error && error.__ERROR !== undefined) {
      throw new UpstreamError(
        `Sina K-line request failed: ${String(error.__ERRORMSG ?? error.__ERROR)}`,
        'sina',
        SINA_CN_KLINE_URL
      );
    }
    throw new UpstreamEmptyError(
      'Sina K-line response is empty',
      'sina',
      SINA_CN_KLINE_URL
    );
  }

  const rows: ParsedSinaRow[] = [];
  for (const item of payload as SinaKlineRaw[]) {
    if (typeof item?.day !== 'string') continue;
    const volumeShares = toNumberSafe(item.volume);
    rows.push({
      time: item.day.slice(0, 16),
      open: toNumberSafe(item.open),
      high: toNumberSafe(item.high),
      low: toNumberSafe(item.low),
      close: toNumberSafe(item.close),
      // 新浪返回股数，SDK K 线与东财/腾讯保持“手”的单位。
      volume: volumeShares === null ? null : volumeShares / 100,
      amount: toNumberSafe(item.amount),
    });
  }
  return rows.sort((a, b) => a.time.localeCompare(b.time));
}

async function fetchSinaRows(
  client: RequestClient,
  symbol: string,
  scale: number,
  dataLen: number
): Promise<ParsedSinaRow[]> {
  const params = new URLSearchParams({
    symbol,
    scale: String(scale),
    ma: 'no',
    datalen: String(effectiveDataLen(dataLen)),
  });
  const payload = isBrowserEnv()
    ? await jsonpRequest<unknown>(
        `${SINA_CN_KLINE_JSONP_URL}?${params.toString()}`,
        { callbackMode: 'path' }
      )
    : await client.get<unknown>(`${SINA_CN_KLINE_URL}?${params.toString()}`, {
        responseType: 'json',
        provider: 'sina',
      });
  return parseRows(payload);
}

function weekBucket(date: string): string {
  const point = new Date(`${date}T00:00:00Z`);
  const offset = (point.getUTCDay() + 6) % 7;
  point.setUTCDate(point.getUTCDate() - offset);
  return point.toISOString().slice(0, 10);
}

function aggregateRows(
  rows: ParsedSinaRow[],
  period: NonNullable<SinaHistoryKlineOptions['period']>
): ParsedSinaRow[] {
  if (period === 'daily') return rows;
  const groups = new Map<string, ParsedSinaRow[]>();
  for (const row of rows) {
    const key =
      period === 'weekly' ? weekBucket(row.time) : row.time.slice(0, 7);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()].map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    const highs = group.flatMap((row) =>
      row.high === null ? [] : [row.high]
    );
    const lows = group.flatMap((row) =>
      row.low === null ? [] : [row.low]
    );
    const volumes = group.flatMap((row) =>
      row.volume === null ? [] : [row.volume]
    );
    return {
      time: last.time,
      open: first.open,
      high: highs.length > 0 ? Math.max(...highs) : null,
      low: lows.length > 0 ? Math.min(...lows) : null,
      close: last.close,
      volume:
        volumes.length > 0
          ? Math.round(
              volumes.reduce((sum, value) => sum + value, 0) * 100
            ) / 100
          : null,
      amount: null,
    };
  });
}

function derivedFields(
  row: ParsedSinaRow,
  prevClose: number | null
): {
  change: number | null;
  changePercent: number | null;
  amplitude: number | null;
} {
  const change =
    row.close !== null && prevClose !== null
      ? roundPrice(row.close - prevClose)
      : null;
  return {
    change,
    changePercent:
      change !== null && prevClose !== null && prevClose !== 0
        ? roundPercent((change / prevClose) * 100)
        : null,
    amplitude:
      row.high !== null &&
      row.low !== null &&
      prevClose !== null &&
      prevClose !== 0
        ? roundPercent(((row.high - row.low) / prevClose) * 100)
        : null,
  };
}

/** 从新浪备用源获取 A 股历史 K 线。 */
export async function getSinaHistoryKline(
  client: RequestClient,
  symbol: string,
  options: SinaHistoryKlineOptions = {}
): Promise<HistoryKline[]> {
  const ns = normalizeSymbol(symbol, { market: 'CN' });
  const sinaSymbol = toSinaSymbol(ns.exchange, ns.code);
  const period = options.period ?? 'daily';
  const start = toIsoDate(options.startDate ?? '19700101');
  const end = toIsoDate(options.endDate ?? '20500101');
  const dailyRows = await fetchSinaRows(
    client,
    sinaSymbol,
    240,
    HISTORY_DATA_LEN
  );
  if (
    dailyRows.length >= effectiveDataLen(HISTORY_DATA_LEN) &&
    dailyRows[0]?.time > start
  ) {
    throw new UpstreamEmptyError(
      'Sina history window exceeds the available fallback depth',
      'sina',
      SINA_CN_KLINE_URL
    );
  }
  const rows = aggregateRows(dailyRows, period);

  return rows
    .map((row, index): HistoryKline => {
      const meta = buildTimeMeta(row.time, MARKET_TZ.CN);
      return {
        date: row.time,
        timestamp: meta.timestamp,
        tz: meta.tz,
        code: ns.code,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        amount: null,
        ...derivedFields(row, index > 0 ? rows[index - 1].close : null),
        turnoverRate: null,
      };
    })
    .filter((row) => row.date >= start && row.date <= end);
}

/** 从新浪备用源获取 A 股 5/15/30/60 分钟 K 线。 */
export async function getSinaMinuteKline(
  client: RequestClient,
  symbol: string,
  options: SinaMinuteKlineOptions
): Promise<MinuteKline[]> {
  const ns = normalizeSymbol(symbol, { market: 'CN' });
  const sinaSymbol = toSinaSymbol(ns.exchange, ns.code);
  const start = options.startDate
    ? normalizeMinuteBoundary(options.startDate, false)
    : undefined;
  const end = options.endDate
    ? normalizeMinuteBoundary(options.endDate, true)
    : undefined;
  const rows = await fetchSinaRows(
    client,
    sinaSymbol,
    Number(options.period),
    MINUTE_DATA_LEN
  );
  if (
    start !== undefined &&
    rows.length >= effectiveDataLen(MINUTE_DATA_LEN) &&
    rows[0]?.time > start
  ) {
    throw new UpstreamEmptyError(
      'Sina minute window exceeds the available fallback depth',
      'sina',
      SINA_CN_KLINE_URL
    );
  }

  return rows
    .map((row, index): MinuteKline => {
      const meta = buildTimeMeta(row.time, MARKET_TZ.CN);
      return {
        time: row.time,
        timestamp: meta.timestamp,
        tz: meta.tz,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        amount: row.amount,
        ...derivedFields(row, index > 0 ? rows[index - 1].close : null),
        turnoverRate: null,
      };
    })
    .filter(
      (row) =>
        (start === undefined || row.time >= start) &&
        (end === undefined || row.time <= end)
    );
}
