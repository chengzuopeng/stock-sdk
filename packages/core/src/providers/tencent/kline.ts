/**
 * 腾讯 K 线备用源。
 *
 * 东方财富 push2his 被频控时，A 股历史 K 线降级到腾讯 fqkline。腾讯行只含
 * OHLCV，因此成交额/换手率无法补齐；涨跌额、涨跌幅和振幅由相邻收盘价计算。
 */
import {
  type RequestClient,
  TENCENT_KLINE_URL,
  TENCENT_MINUTE_KLINE_URL,
  addDays,
  buildTimeMeta,
  MARKET_TZ,
  toNumberSafe,
  UpstreamEmptyError,
  UpstreamError,
} from '../../core';
import type { HistoryKline, MinuteKline } from '../../types';
import { normalizeSymbol, toTencentSymbol } from '../../symbols';

/** 腾讯历史 K 线备用源参数。 */
export interface TencentHistoryKlineOptions {
  period?: 'daily' | 'weekly' | 'monthly';
  adjust?: '' | 'qfq' | 'hfq';
  startDate?: string;
  endDate?: string;
}

/** 腾讯分钟 K 线备用源参数。 */
export interface TencentMinuteKlineOptions {
  period: '5' | '15' | '30' | '60';
  startDate?: string;
  endDate?: string;
}

interface TencentKlineResponse {
  code?: number;
  msg?: string;
  data?: Record<string, unknown>;
}

interface TencentKlineRawRow {
  date: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

interface TencentMinuteKlineRawRow extends Omit<TencentKlineRawRow, 'date'> {
  rawTime: string;
  time: string;
}

const PAGE_SIZE = 640;
const MAX_PAGES = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toIsoDate(value: string): string {
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  return compact
    ? `${compact[1]}-${compact[2]}-${compact[3]}`
    : value.slice(0, 10);
}

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPrice(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function parseRows(value: unknown): TencentKlineRawRow[] {
  if (!Array.isArray(value)) return [];
  const rows: TencentKlineRawRow[] = [];
  for (const raw of value) {
    if (!Array.isArray(raw) || typeof raw[0] !== 'string') continue;
    rows.push({
      date: raw[0],
      open: toNumberSafe(raw[1]),
      close: toNumberSafe(raw[2]),
      high: toNumberSafe(raw[3]),
      low: toNumberSafe(raw[4]),
      volume: toNumberSafe(raw[5]),
    });
  }
  return rows;
}

function formatMinuteTime(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}`;
}

function parseMinuteRows(value: unknown): TencentMinuteKlineRawRow[] {
  if (!Array.isArray(value)) return [];
  const rows: TencentMinuteKlineRawRow[] = [];
  for (const raw of value) {
    if (!Array.isArray(raw) || typeof raw[0] !== 'string' || !/^\d{12}$/.test(raw[0])) {
      continue;
    }
    rows.push({
      rawTime: raw[0],
      time: formatMinuteTime(raw[0]),
      open: toNumberSafe(raw[1]),
      close: toNumberSafe(raw[2]),
      high: toNumberSafe(raw[3]),
      low: toNumberSafe(raw[4]),
      volume: toNumberSafe(raw[5]),
    });
  }
  return rows;
}

function resultKey(
  period: NonNullable<TencentHistoryKlineOptions['period']>,
  adjust: NonNullable<TencentHistoryKlineOptions['adjust']>
): string {
  const periodKey = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
  return adjust ? `${adjust}${periodKey}` : periodKey;
}

function queryLookbackDays(
  period: NonNullable<TencentHistoryKlineOptions['period']>
): number {
  return period === 'monthly' ? 45 : period === 'weekly' ? 14 : 10;
}

async function fetchPage(
  client: RequestClient,
  symbol: string,
  period: NonNullable<TencentHistoryKlineOptions['period']>,
  adjust: NonNullable<TencentHistoryKlineOptions['adjust']>,
  startDate: string,
  endDate: string
): Promise<TencentKlineRawRow[]> {
  const periodParam = period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
  const params = new URLSearchParams({
    param: [symbol, periodParam, startDate, endDate, String(PAGE_SIZE), adjust].join(','),
  });
  const url = `${TENCENT_KLINE_URL}?${params.toString()}`;
  const json = await client.get<TencentKlineResponse>(url, {
    responseType: 'json',
    provider: 'tencent',
  });

  if (json.code !== undefined && json.code !== 0) {
    throw new UpstreamError(
      `Tencent K-line request failed: ${json.msg || `code=${json.code}`}`,
      'tencent',
      url,
      { code: json.code }
    );
  }
  const node = json.data?.[symbol];
  if (!isRecord(node)) {
    throw new UpstreamEmptyError('Tencent K-line response has no symbol payload', 'tencent', url);
  }
  return parseRows(node[resultKey(period, adjust)] ?? node[periodParam]);
}

async function fetchAllPages(
  client: RequestClient,
  tencentSymbol: string,
  period: NonNullable<TencentHistoryKlineOptions['period']>,
  adjust: NonNullable<TencentHistoryKlineOptions['adjust']>,
  queryStart: string,
  requestedEnd: string
): Promise<TencentKlineRawRow[]> {
  const byDate = new Map<string, TencentKlineRawRow>();
  let cursorEnd = requestedEnd;

  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = await fetchPage(
      client,
      tencentSymbol,
      period,
      adjust,
      queryStart,
      cursorEnd
    );
    for (const row of rows) byDate.set(row.date, row);
    if (rows.length === 0) break;

    const earliest = rows[0].date;
    if (rows.length < PAGE_SIZE || earliest <= queryStart) break;
    cursorEnd = addDays(earliest, -1);
    // 避免全量历史翻页形成瞬时突发，给腾讯备用源留出轻量请求间隔。
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function scaleHfqToQfq(
  client: RequestClient,
  tencentSymbol: string,
  period: NonNullable<TencentHistoryKlineOptions['period']>,
  rows: TencentKlineRawRow[]
): Promise<TencentKlineRawRow[]> {
  const anchor = [...rows].reverse().find((row) => row.close !== null && row.close !== 0);
  if (!anchor) {
    throw new UpstreamEmptyError(
      'Tencent hfq series has no usable close for qfq rescaling',
      'tencent'
    );
  }

  const rawRows = await fetchPage(
    client,
    tencentSymbol,
    period,
    '',
    addDays(anchor.date, -queryLookbackDays(period)),
    anchor.date
  );
  const rawAnchor = rawRows.find((row) => row.date === anchor.date);
  if (!rawAnchor || rawAnchor.close === null) {
    throw new UpstreamEmptyError(
      `Tencent unadjusted anchor missing for ${anchor.date}; cannot derive qfq`,
      'tencent'
    );
  }

  const scale = rawAnchor.close / (anchor.close as number);
  const apply = (value: number | null): number | null =>
    value === null ? null : roundPrice(value * scale);

  return rows.map((row) => ({
    ...row,
    open: apply(row.open),
    close: apply(row.close),
    high: apply(row.high),
    low: apply(row.low),
  }));
}

/**
 * 从腾讯备用源获取 A 股历史 K 线。
 *
 * 腾讯单次最多返回约 640 根，函数按最早一根日期向前翻页，并额外取一根窗口前
 * 数据用于计算首根的涨跌额/涨跌幅/振幅。
 */
export async function getTencentHistoryKline(
  client: RequestClient,
  symbol: string,
  options: TencentHistoryKlineOptions = {}
): Promise<HistoryKline[]> {
  const period = options.period ?? 'daily';
  const adjust = options.adjust ?? 'qfq';
  const requestedStart = toIsoDate(options.startDate ?? '19700101');
  const requestedEnd = toIsoDate(options.endDate ?? '20500101');
  const queryStart = addDays(requestedStart, -queryLookbackDays(period));
  const ns = normalizeSymbol(symbol, { market: 'CN' });
  const tencentSymbol = toTencentSymbol(ns);

  const fetchAdjust = adjust === 'qfq' ? 'hfq' : adjust;
  let rows = await fetchAllPages(
    client,
    tencentSymbol,
    period,
    fetchAdjust,
    queryStart,
    requestedEnd
  );
  if (adjust === 'qfq' && rows.length > 0) {
    rows = await scaleHfqToQfq(client, tencentSymbol, period, rows);
  }
  const result: HistoryKline[] = rows.map((row, index) => {
    const prevClose = index > 0 ? rows[index - 1].close : null;
    const change =
      row.close !== null && prevClose !== null
        ? roundPrice(row.close - prevClose)
        : null;
    const changePercent =
      change !== null && prevClose !== 0 && prevClose !== null
        ? roundPercent((change / prevClose) * 100)
        : null;
    const amplitude =
      row.high !== null && row.low !== null && prevClose !== 0 && prevClose !== null
        ? roundPercent(((row.high - row.low) / prevClose) * 100)
        : null;
    const meta = buildTimeMeta(row.date, MARKET_TZ.CN);
    return {
      ...row,
      timestamp: meta.timestamp,
      tz: meta.tz,
      code: ns.code,
      amount: null,
      amplitude,
      changePercent,
      change,
      turnoverRate: null,
    };
  });

  return result.filter(
    (row) => row.date >= requestedStart && row.date <= requestedEnd
  );
}

function normalizeMinuteBoundary(value: string, endOfDay: boolean): string {
  const match = /^(\d{4})-?(\d{2})-?(\d{2})(?:[ T]?(\d{2}):?(\d{2}))?/.exec(
    value.trim()
  );
  if (!match) return value;
  const hour = match[4] ?? (endOfDay ? '23' : '00');
  const minute = match[5] ?? (endOfDay ? '59' : '00');
  return `${match[1]}${match[2]}${match[3]}${hour}${minute}`;
}

async function fetchMinutePage(
  client: RequestClient,
  symbol: string,
  period: TencentMinuteKlineOptions['period'],
  cursor: string
): Promise<TencentMinuteKlineRawRow[]> {
  const params = new URLSearchParams({
    param: [symbol, `m${period}`, cursor, String(PAGE_SIZE)].join(','),
  });
  const url = `${TENCENT_MINUTE_KLINE_URL}?${params.toString()}`;
  const json = await client.get<TencentKlineResponse>(url, {
    responseType: 'json',
    provider: 'tencent',
  });
  if (json.code !== undefined && json.code !== 0) {
    throw new UpstreamError(
      `Tencent minute K-line request failed: ${json.msg || `code=${json.code}`}`,
      'tencent',
      url,
      { code: json.code }
    );
  }
  const node = json.data?.[symbol];
  if (!isRecord(node)) {
    throw new UpstreamEmptyError(
      'Tencent minute K-line response has no symbol payload',
      'tencent',
      url
    );
  }
  return parseMinuteRows(node[`m${period}`]);
}

/**
 * 从腾讯备用源获取 A 股 5/15/30/60 分钟 K 线。
 *
 * 未指定开始时间时返回最近最多 640 根；指定窗口时按最早时间向前翻页，直至
 * 覆盖 startDate。腾讯未返回成交额和换手率，对应字段保持 `null`。
 */
export async function getTencentMinuteKline(
  client: RequestClient,
  symbol: string,
  options: TencentMinuteKlineOptions
): Promise<MinuteKline[]> {
  const ns = normalizeSymbol(symbol, { market: 'CN' });
  const tencentSymbol = toTencentSymbol(ns);
  const start = options.startDate
    ? normalizeMinuteBoundary(options.startDate, false)
    : undefined;
  const end = options.endDate
    ? normalizeMinuteBoundary(options.endDate, true)
    : undefined;
  const byTime = new Map<string, TencentMinuteKlineRawRow>();
  let cursor = end ?? '';

  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = await fetchMinutePage(
      client,
      tencentSymbol,
      options.period,
      cursor
    );
    for (const row of rows) byTime.set(row.rawTime, row);
    if (rows.length === 0 || start === undefined) break;

    const earliest = rows[0].rawTime;
    if (rows.length < PAGE_SIZE || earliest <= start) break;
    cursor = earliest;
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }

  const rows = [...byTime.values()].sort((a, b) =>
    a.rawTime.localeCompare(b.rawTime)
  );
  const result: MinuteKline[] = rows.map((row, index) => {
    const prevClose = index > 0 ? rows[index - 1].close : null;
    const change =
      row.close !== null && prevClose !== null
        ? roundPrice(row.close - prevClose)
        : null;
    const changePercent =
      change !== null && prevClose !== 0 && prevClose !== null
        ? roundPercent((change / prevClose) * 100)
        : null;
    const amplitude =
      row.high !== null && row.low !== null && prevClose !== 0 && prevClose !== null
        ? roundPercent(((row.high - row.low) / prevClose) * 100)
        : null;
    const meta = buildTimeMeta(row.time, MARKET_TZ.CN);
    return {
      time: row.time,
      timestamp: meta.timestamp,
      tz: meta.tz,
      open: row.open,
      close: row.close,
      high: row.high,
      low: row.low,
      volume: row.volume,
      amount: null,
      amplitude,
      changePercent,
      change,
      turnoverRate: null,
    };
  });

  return result.filter((row) => {
    const compact = row.time.replace(/[- :]/g, '');
    return (start === undefined || compact >= start) && (end === undefined || compact <= end);
  });
}
