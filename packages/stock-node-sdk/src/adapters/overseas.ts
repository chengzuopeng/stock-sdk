/**
 * 海外数据源适配器包（CNBC / Nasdaq 官方 API / SEC EDGAR）：
 * - 默认开启，优先级低于中国大陆主力源（平时毫秒级走国内源，国内源不可用或查询美股 SEC 公告 / 显式指定源时触发）；
 * - 中国大陆无代理直连环境可通过 `new StockNodeSDK({ overseas: false })` 或 CLI `--overseas=false` 一键关闭。
 */
import {
  addDays,
  asyncPool,
  buildTimeMeta,
  getClientScopedCache,
  MARKET_TZ,
  todayInTz,
  toNumberSafe,
  UpstreamEmptyError,
  UpstreamError,
} from '@stock-sdk/core/core';
import { normalizeSymbol } from '@stock-sdk/core/symbols';
import type { SourceAdapter } from '@stock-sdk/core/router';
import type {
  AnnouncementQueryOptions,
  BalanceSheet,
  CashFlowStatement,
  DividendDetail,
  HKHistoryKline,
  HKQuote,
  IncomeStatement,
  StockAnnouncement,
  USHistoryKline,
  USQuote,
} from '@stock-sdk/core/types';
import type { NodeHttpClient } from '../transport/nodeHttpClient';
import type { QuoteBatchInput } from './quotes';
import type { HKHistoryKlineInput, USHistoryKlineInput } from './kline';
import type { SymbolFinancialInput } from './financial';

/**
 * 归属于海外增强包的数据源标识列表。
 * 在 `StockNodeSDK({ overseas: false })` 时会自动加入路由器 `disabledProviders`。
 */
export const OVERSEAS_PROVIDERS = ['cnbc', 'nasdaq', 'sec'] as const;

export type OverseasProviderId = (typeof OVERSEAS_PROVIDERS)[number];

const CNBC_QUOTE_URL =
  'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol';
const CNBC_CHART_BASE = 'https://ts-api.cnbc.com/harmony/app/charts';
const NASDAQ_API_BASE = 'https://api.nasdaq.com/api';
const NASDAQ_HISTORY_PAGE_SIZE = 500;
const NASDAQ_HISTORY_MAX_PAGES = 100;
const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_SUBMISSIONS_BASE = 'https://data.sec.gov/submissions';

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function parseFormattedNumber(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .trim()
    .replace(/^\$/, '')
    .replace(/^-\$/, '-')
    .replace(/^\+\$/, '')
    .replace(/,/g, '')
    .replace(/%$/, '')
    .replace(/^\+/, '');
  if (!cleaned || cleaned === '--' || cleaned.toUpperCase() === 'N/A') return null;
  return toNumberSafe(cleaned);
}

/** 将 `"5.073T"` / `"310.6B"` / `"500M"` 解析为以「亿」为单位的数值 */
function parseCompactCapTo100M(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const m = /^([\d.,]+)\s*([TBMK])?$/i.exec(raw.trim());
  if (!m) return null;
  const base = toNumberSafe(m[1].replace(/,/g, ''));
  if (base === null) return null;
  const unit = (m[2] ?? '').toUpperCase();
  if (unit === 'T') return round2(base * 10_000);
  if (unit === 'B') return round2(base * 10);
  if (unit === 'M') return round2(base / 100);
  if (unit === 'K') return round2(base / 100_000);
  return round2(base / 1e8);
}

/** 将 `MM/DD/YYYY` 或 `M/D/YYYY` 转为 `YYYY-MM-DD` */
function parseUsDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

function toIsoDate(raw?: string): string {
  if (!raw) return '';
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(raw.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : raw.slice(0, 10);
}

function detectMarketSafe(symbol?: string): 'CN' | 'HK' | 'US' | null {
  if (!symbol) return null;
  try {
    const ns = normalizeSymbol(symbol);
    return ns.market === 'CN' || ns.market === 'HK' || ns.market === 'US' ? ns.market : null;
  } catch {
    return null;
  }
}

/** 港股代码转为 CNBC 支持的 4+ 位 `.HK` 形式（实测 `00700` → `0700.HK`, `09988` → `9988.HK`） */
function toCnbcHkSymbol(code: string): string {
  const ns = normalizeSymbol(code, { market: 'HK' });
  const stripped = ns.code.replace(/^0+/, '') || '0';
  return `${stripped.padStart(4, '0')}.HK`;
}

// ============================================================
// 1. CNBC 实时报价与历史 K 线（覆盖美股 + 港股）
// ============================================================

interface CnbcFormattedQuote {
  symbol?: string;
  name?: string;
  shortName?: string;
  last?: string;
  previous_day_closing?: string;
  open?: string;
  high?: string;
  low?: string;
  change?: string;
  change_pct?: string;
  volume?: string;
  mktcapView?: string;
  pe?: string;
  yrhiprice?: string;
  yrloprice?: string;
  last_time?: string;
  currencyCode?: string;
}

interface CnbcQuoteResponse {
  FormattedQuoteResult?: {
    FormattedQuote?: CnbcFormattedQuote | CnbcFormattedQuote[];
  };
}

async function fetchCnbcQuotesRaw(
  client: NodeHttpClient,
  symbols: string[]
): Promise<CnbcFormattedQuote[]> {
  if (symbols.length === 0) return [];
  const params = new URLSearchParams({
    symbols: symbols.join('|'),
    requestMethod: 'itv',
    noform: '1',
    exthrs: '1',
    output: 'json',
  });
  const url = `${CNBC_QUOTE_URL}?${params.toString()}`;
  const json = await client.get<CnbcQuoteResponse>(url, {
    responseType: 'json',
    provider: 'cnbc',
    hostFallback: false,
  });
  const raw = json?.FormattedQuoteResult?.FormattedQuote;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const valid = list.filter((q) => parseFormattedNumber(q.last) !== null);
  if (valid.length === 0) {
    throw new UpstreamEmptyError('CNBC quote response returned no valid rows', 'cnbc', url);
  }
  return valid;
}

async function fetchCnbcHkQuotes(client: NodeHttpClient, codes: string[]): Promise<HKQuote[]> {
  const pairs: Array<{ code5: string; cnbcSym: string }> = [];
  for (const c of codes) {
    try {
      const ns = normalizeSymbol(c, { market: 'HK' });
      pairs.push({ code5: ns.code.padStart(5, '0'), cnbcSym: toCnbcHkSymbol(c) });
    } catch {
      // 忽略非法代码
    }
  }
  if (pairs.length === 0) return [];
  const rows = await fetchCnbcQuotesRaw(
    client,
    Array.from(new Set(pairs.map((p) => p.cnbcSym)))
  );
  const bySym = new Map(rows.map((r) => [String(r.symbol ?? '').toUpperCase(), r]));

  const out: HKQuote[] = [];
  for (const { code5, cnbcSym } of pairs) {
    const q = bySym.get(cnbcSym.toUpperCase());
    if (!q) continue;
    const price = parseFormattedNumber(q.last) ?? 0;
    const prevClose = parseFormattedNumber(q.previous_day_closing) ?? price;
    const change = parseFormattedNumber(q.change) ?? round2(price - prevClose);
    const changePercent =
      parseFormattedNumber(q.change_pct) ??
      (prevClose > 0 ? round2((change / prevClose) * 100) : 0);
    const ts = q.last_time ? Date.parse(q.last_time) : NaN;
    out.push({
      marketId: '128',
      name: q.name ?? q.shortName ?? code5,
      code: code5,
      price,
      prevClose,
      open: parseFormattedNumber(q.open) ?? price,
      volume: parseFormattedNumber(q.volume) ?? 0,
      time: q.last_time ?? '',
      timestamp: Number.isFinite(ts) ? ts : null,
      tz: MARKET_TZ.HK,
      change,
      changePercent,
      high: parseFormattedNumber(q.high) ?? price,
      low: parseFormattedNumber(q.low) ?? price,
      amount: 0,
      lotSize: null,
      circulatingMarketCap: null,
      totalMarketCap: parseCompactCapTo100M(q.mktcapView),
      currency: q.currencyCode || 'HKD',
      market: 'HK',
      assetType: 'stock',
      source: 'cnbc',
    });
  }
  if (out.length === 0) {
    throw new UpstreamEmptyError('CNBC HK quotes matched 0 symbols', 'cnbc', CNBC_QUOTE_URL);
  }
  return out;
}

async function fetchCnbcUsQuotes(client: NodeHttpClient, codes: string[]): Promise<USQuote[]> {
  const symbols: string[] = [];
  for (const c of codes) {
    try {
      symbols.push(normalizeSymbol(c, { market: 'US' }).code.toUpperCase());
    } catch {
      // 忽略非法代码
    }
  }
  const unique = Array.from(new Set(symbols));
  if (unique.length === 0) return [];
  const rows = await fetchCnbcQuotesRaw(client, unique);

  return rows.map((q): USQuote => {
    const code = String(q.symbol ?? '').toUpperCase();
    const price = parseFormattedNumber(q.last) ?? 0;
    const prevClose = parseFormattedNumber(q.previous_day_closing) ?? price;
    const change = parseFormattedNumber(q.change) ?? round2(price - prevClose);
    const changePercent =
      parseFormattedNumber(q.change_pct) ??
      (prevClose > 0 ? round2((change / prevClose) * 100) : 0);
    const high = parseFormattedNumber(q.high) ?? price;
    const low = parseFormattedNumber(q.low) ?? price;
    const ts = q.last_time ? Date.parse(q.last_time) : NaN;
    return {
      marketId: '105',
      name: q.name ?? q.shortName ?? code,
      code,
      price,
      prevClose,
      open: parseFormattedNumber(q.open) ?? price,
      volume: parseFormattedNumber(q.volume) ?? 0,
      time: q.last_time ?? '',
      timestamp: Number.isFinite(ts) ? ts : null,
      tz: MARKET_TZ.US,
      change,
      changePercent,
      high,
      low,
      amount: 0,
      turnoverRate: null,
      pe: parseFormattedNumber(q.pe),
      amplitude: prevClose > 0 && high > 0 && low > 0 ? round2(((high - low) / prevClose) * 100) : null,
      totalMarketCap: parseCompactCapTo100M(q.mktcapView),
      pb: null,
      high52w: parseFormattedNumber(q.yrhiprice),
      low52w: parseFormattedNumber(q.yrloprice),
      market: 'US',
      assetType: 'stock',
      source: 'cnbc',
    };
  });
}

interface CnbcPriceBar {
  open?: string | number;
  high?: string | number;
  low?: string | number;
  close?: string | number;
  volume?: string | number;
  tradeTime?: string;
}

interface CnbcChartResponse {
  barData?: {
    priceBars?: CnbcPriceBar[];
  };
}

function chooseCnbcSpan(startDate?: string): '1Y' | '5Y' {
  if (!startDate) return '1Y';
  const iso = toIsoDate(startDate);
  const startMs = Date.parse(iso);
  if (!Number.isFinite(startMs)) return '1Y';
  const ageDays = (Date.now() - startMs) / (24 * 3600 * 1000);
  return ageDays > 340 ? '5Y' : '1Y';
}

async function fetchCnbcChartBars(
  client: NodeHttpClient,
  cnbcSym: string,
  options: HKHistoryKlineInput['options'] | USHistoryKlineInput['options'],
  strict: boolean
): Promise<Array<{ date: string; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null }>> {
  const span = chooseCnbcSpan(options.startDate);
  const url = `${CNBC_CHART_BASE}/${span}.json?symbol=${encodeURIComponent(cnbcSym)}`;
  const json = await client.get<CnbcChartResponse>(url, {
    responseType: 'json',
    provider: 'cnbc',
    hostFallback: false,
  });
  const bars = json?.barData?.priceBars;
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new UpstreamEmptyError(`CNBC chart returned empty for ${cnbcSym}`, 'cnbc', url);
  }
  const startIso = toIsoDate(options.startDate);
  const endIso = toIsoDate(options.endDate);

  const out: Array<{ date: string; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null }> = [];
  let coversStart = false;
  for (const b of bars) {
    const rawTime = String(b.tradeTime ?? '');
    if (!/^\d{8}/.test(rawTime)) continue;
    const date = `${rawTime.slice(0, 4)}-${rawTime.slice(4, 6)}-${rawTime.slice(6, 8)}`;
    if (date <= startIso) coversStart = true;
    if (startIso && date < startIso) continue;
    if (endIso && date > endIso) continue;
    out.push({
      date,
      open: parseFormattedNumber(b.open),
      high: parseFormattedNumber(b.high),
      low: parseFormattedNumber(b.low),
      close: parseFormattedNumber(b.close),
      volume: parseFormattedNumber(b.volume),
    });
  }
  if (strict && !coversStart) {
    throw new UpstreamError(`CNBC chart does not cover the requested start date ${startIso}`, 'cnbc', url);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function enrichForeignBars<T extends { date: string; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null }>(
  bars: T[],
  code: string,
  tz: (typeof MARKET_TZ)[keyof typeof MARKET_TZ]
) {
  let prevClose: number | null = null;
  return bars.map((b) => {
    const change = prevClose !== null && b.close !== null ? round2(b.close - prevClose) : null;
    const changePercent =
      prevClose !== null && prevClose > 0 && change !== null ? round2((change / prevClose) * 100) : null;
    const amplitude =
      prevClose !== null && prevClose > 0 && b.high !== null && b.low !== null
        ? round2(((b.high - b.low) / prevClose) * 100)
        : null;
    prevClose = b.close;
    const meta = buildTimeMeta(b.date, tz);
    return {
      date: b.date,
      timestamp: meta.timestamp,
      tz: meta.tz,
      code,
      name: code,
      open: b.open,
      close: b.close,
      high: b.high,
      low: b.low,
      volume: b.volume,
      amount: null,
      amplitude,
      changePercent,
      change,
      turnoverRate: null,
    };
  });
}

// ============================================================
// 2. Nasdaq 官方 API（美股报价 / K 线 / 分红 / 财报三大表）
// ============================================================

interface NasdaqQuoteInfoResponse {
  data?: {
    symbol?: string;
    companyName?: string;
    primaryData?: {
      lastSalePrice?: string;
      netChange?: string;
      percentageChange?: string;
      lastTradeTimestamp?: string;
      volume?: string;
    };
    keyStats?: {
      fiftyTwoWeekHighLow?: { value?: string };
      dayrange?: { value?: string };
    };
  } | null;
}

function parseHighLowRange(raw?: string): { high: number | null; low: number | null } {
  if (!raw) return { high: null, low: null };
  const parts = raw.split(/\s*-\s*/);
  if (parts.length !== 2) return { high: null, low: null };
  const a = parseFormattedNumber(parts[0]);
  const b = parseFormattedNumber(parts[1]);
  if (a === null || b === null) return { high: null, low: null };
  return { high: Math.max(a, b), low: Math.min(a, b) };
}

async function fetchNasdaqSingleQuote(
  client: NodeHttpClient,
  symbol: string
): Promise<USQuote | null> {
  const code = normalizeSymbol(symbol, { market: 'US' }).code.toUpperCase();
  const tryAssetClass = async (assetClass: 'stocks' | 'etf'): Promise<NasdaqQuoteInfoResponse | null> => {
    const url = `${NASDAQ_API_BASE}/quote/${encodeURIComponent(code)}/info?assetclass=${assetClass}`;
    try {
      const json = await client.get<NasdaqQuoteInfoResponse>(url, {
        responseType: 'json',
        provider: 'nasdaq',
        hostFallback: false,
      });
      return json?.data?.primaryData ? json : null;
    } catch {
      return null;
    }
  };

  const json = (await tryAssetClass('stocks')) ?? (await tryAssetClass('etf'));
  const d = json?.data;
  const p = d?.primaryData;
  if (!d || !p) return null;

  const price = parseFormattedNumber(p.lastSalePrice) ?? 0;
  const change = parseFormattedNumber(p.netChange) ?? 0;
  const prevClose = round2(price - change);
  const changePercent =
    parseFormattedNumber(p.percentageChange) ??
    (prevClose > 0 ? round2((change / prevClose) * 100) : 0);
  const dayRange = parseHighLowRange(d.keyStats?.dayrange?.value);
  const week52 = parseHighLowRange(d.keyStats?.fiftyTwoWeekHighLow?.value);
  const high = dayRange.high ?? price;
  const low = dayRange.low ?? price;
  const parsedTs = p.lastTradeTimestamp ? Date.parse(p.lastTradeTimestamp) : NaN;

  return {
    marketId: '105',
    name: d.companyName ?? code,
    code,
    price,
    prevClose,
    open: prevClose,
    volume: Math.round(parseFormattedNumber(p.volume) ?? 0),
    time: p.lastTradeTimestamp ?? '',
    timestamp: Number.isFinite(parsedTs) ? parsedTs : null,
    tz: MARKET_TZ.US,
    change,
    changePercent,
    high,
    low,
    amount: 0,
    turnoverRate: null,
    pe: null,
    amplitude:
      dayRange.high !== null && dayRange.low !== null && prevClose > 0
        ? round2(((dayRange.high - dayRange.low) / prevClose) * 100)
        : null,
    totalMarketCap: null,
    pb: null,
    high52w: week52.high,
    low52w: week52.low,
    market: 'US',
    assetType: 'stock',
    source: 'nasdaq',
  };
}

async function fetchNasdaqUsKline(
  client: NodeHttpClient,
  input: USHistoryKlineInput,
  strict: boolean
): Promise<USHistoryKline[]> {
  const code = normalizeSymbol(input.symbol, { market: 'US' }).code.toUpperCase();
  const end = toIsoDate(input.options.endDate) || todayInTz(MARKET_TZ.US);
  const start = toIsoDate(input.options.startDate) || '1970-01-01';
  // 留出起始日前的交易日，用来验证周末或节假日开头的窗口。
  const queryStart = strict ? addDays(start, -7) : start;
  const endpoint = `${NASDAQ_API_BASE}/quote/${encodeURIComponent(code)}/historical`;
  type NasdaqHistoryResponse = {
    data?: {
      totalRecords?: number | string | null;
      tradesTable?: {
        rows?: Array<{
          date?: string;
          close?: string;
          volume?: string;
          open?: string;
          high?: string;
          low?: string;
        }> | null;
      } | null;
    } | null;
  };
  const bars = new Map<string, {
    date: string;
    open: number | null;
    close: number | null;
    high: number | null;
    low: number | null;
    volume: number | null;
  }>();
  let total: number | null = null;
  for (let page = 0; page < NASDAQ_HISTORY_MAX_PAGES; page++) {
    const params = new URLSearchParams({
      assetclass: 'stocks',
      fromdate: queryStart,
      todate: end,
      limit: String(NASDAQ_HISTORY_PAGE_SIZE),
      offset: String(bars.size),
    });
    const url = `${endpoint}?${params.toString()}`;
    const json = await client.get<NasdaqHistoryResponse>(url, {
      responseType: 'json', provider: 'nasdaq', hostFallback: false,
    });
    if (!json?.data) {
      throw new UpstreamEmptyError(`Nasdaq historical kline missing payload for ${code}`, 'nasdaq', url);
    }
    const pageTotal = parseFormattedNumber(json.data.totalRecords);
    if (total === null) total = pageTotal;
    if (pageTotal !== null && pageTotal !== total) {
      throw new UpstreamError(`Nasdaq reported inconsistent historical K-line counts for ${code}`, 'nasdaq', url);
    }
    const rows = json.data.tradesTable?.rows ?? (pageTotal === 0 ? [] : undefined);
    if (!Array.isArray(rows)) {
      throw new UpstreamError(`Nasdaq historical K-line page missing rows for ${code}`, 'nasdaq', url);
    }
    for (const row of rows) {
      const date = parseUsDate(row?.date);
      if (!date || date < queryStart || date > end || bars.has(date)) {
        throw new UpstreamError(`Nasdaq historical K-line page contains invalid or duplicate dates for ${code}`, 'nasdaq', url);
      }
      bars.set(date, {
        date,
        open: parseFormattedNumber(row.open),
        close: parseFormattedNumber(row.close),
        high: parseFormattedNumber(row.high),
        low: parseFormattedNumber(row.low),
        volume: parseFormattedNumber(row.volume),
      });
    }

    if (total !== null && (bars.size > total || (rows.length === 0 && bars.size < total))) {
      throw new UpstreamError(`Nasdaq returned an incomplete historical K-line window for ${code}`, 'nasdaq', url, {
        totalRecords: total, returnedRecords: bars.size,
      });
    }
    const complete = total === null ? rows.length < NASDAQ_HISTORY_PAGE_SIZE : bars.size === total;
    if (complete) {
      const sorted = [...bars.values()].sort((a, b) => a.date.localeCompare(b.date));
      if (strict && sorted.length === 0) {
        throw new UpstreamEmptyError(`Nasdaq returned no historical K-lines for ${code}`, 'nasdaq', url);
      }
      if (strict && sorted[0].date > start) {
        throw new UpstreamError(`Nasdaq historical K-lines do not cover the requested start date ${start}`, 'nasdaq', url);
      }
      const selected = sorted.filter((bar) => bar.date >= start);
      return enrichForeignBars(selected, code, MARKET_TZ.US).map((bar) => ({
        ...bar,
        currency: 'USD' as const,
      }));
    }
  }
  throw new UpstreamError(`Nasdaq historical K-line page limit reached for ${code}`, 'nasdaq', endpoint);
}

async function fetchNasdaqDividends(
  client: NodeHttpClient,
  symbol: string
): Promise<DividendDetail[]> {
  const code = normalizeSymbol(symbol, { market: 'US' }).code.toUpperCase();
  const url = `${NASDAQ_API_BASE}/quote/${encodeURIComponent(code)}/dividends?assetclass=stocks`;
  const json = await client.get<{
    data?: {
      dividends?: {
        rows?: Array<{
          exOrEffDate?: string;
          type?: string;
          amount?: string;
          declarationDate?: string;
          recordDate?: string;
          paymentDate?: string;
          currency?: string;
        }>;
      };
    } | null;
  }>(url, { responseType: 'json', provider: 'nasdaq', hostFallback: false });

  if (!json?.data) {
    throw new UpstreamEmptyError(`Nasdaq dividends payload missing for ${code}`, 'nasdaq', url);
  }
  const rows = json.data.dividends?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }
  return rows.map((r): DividendDetail => {
    const amount = parseFormattedNumber(r.amount);
    const noticeDate = parseUsDate(r.declarationDate);
    const currency = r.currency || 'USD';
    return {
      code,
      name: code,
      reportDate: null,
      planNoticeDate: noticeDate,
      disclosureDate: noticeDate,
      assignTransferRatio: null,
      bonusRatio: null,
      transferRatio: null,
      dividendPretax: amount,
      dividendPerShare: amount,
      shareUnit: 1,
      currency,
      dividendDesc: amount !== null ? `${currency} ${amount} / share (${r.type ?? 'Cash'})` : null,
      dividendYield: null,
      eps: null,
      bps: null,
      capitalReserve: null,
      unassignedProfit: null,
      netProfitYoy: null,
      totalShares: null,
      equityRecordDate: parseUsDate(r.recordDate),
      exDividendDate: parseUsDate(r.exOrEffDate),
      payDate: parseUsDate(r.paymentDate),
      assignProgress: r.type ?? null,
      noticeDate,
    };
  });
}

interface NasdaqFinancialTable {
  headers?: Record<string, string>;
  rows?: Array<Record<string, string>>;
}

interface NasdaqFinancialsResponse {
  data?: {
    symbol?: string;
    incomeStatementTable?: NasdaqFinancialTable;
    balanceSheetTable?: NasdaqFinancialTable;
    cashFlowTable?: NasdaqFinancialTable;
  } | null;
}

/**
 * 解析 Nasdaq 财报横向表格（headers.value2..value5 为报告期，金额单位为千美元 → ×1000 统一换算为美元）。
 */
function parseNasdaqFinancialTable(
  table: NasdaqFinancialTable | undefined
): Array<{ reportDate: string; values: Map<string, number | null> }> {
  if (!table?.headers || !Array.isArray(table.rows)) return [];
  const periodCols: Array<{ col: string; reportDate: string }> = [];
  for (const [col, label] of Object.entries(table.headers)) {
    if (col === 'value1') continue;
    const date = parseUsDate(label);
    if (date) periodCols.push({ col, reportDate: date });
  }
  return periodCols
    .map(({ col, reportDate }) => {
      const values = new Map<string, number | null>();
      for (const row of table.rows ?? []) {
        const label = (row.value1 ?? '').trim();
        if (!label) continue;
        const val = parseFormattedNumber(row[col]);
        // Nasdaq 财报表格金额以「千美元」展示，统一 ×1000 换算为美元（与东财美股财报一致）
        values.set(label, val === null ? null : val * 1000);
      }
      return { reportDate, values };
    })
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
}

async function fetchNasdaqFinancialsPayload(
  client: NodeHttpClient,
  symbol: string
): Promise<{ code: string; data: NonNullable<NasdaqFinancialsResponse['data']> }> {
  const code = normalizeSymbol(symbol, { market: 'US' }).code.toUpperCase();
  const url = `${NASDAQ_API_BASE}/company/${encodeURIComponent(code)}/financials?frequency=1`;
  const json = await client.get<NasdaqFinancialsResponse>(url, {
    responseType: 'json',
    provider: 'nasdaq',
    hostFallback: false,
  });
  if (!json?.data) {
    throw new UpstreamEmptyError(`Nasdaq financials empty for ${code}`, 'nasdaq', url);
  }
  return { code, data: json.data };
}

// ============================================================
// 3. SEC EDGAR 官方公告（美股 10-K / 10-Q / 8-K 等）
// ============================================================

interface SecTickerEntry {
  cik_str?: number;
  ticker?: string;
  title?: string;
}

interface SecSubmissionsResponse {
  cik?: string;
  name?: string;
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      form?: string[];
      primaryDocument?: string[];
      primaryDocDescription?: string[];
    };
  };
}

async function resolveSecCompany(
  client: NodeHttpClient,
  ticker: string,
  signal?: AbortSignal
): Promise<{ cik10: string; cikNum: string; title: string }> {
  const cache = getClientScopedCache<Map<string, { cik10: string; cikNum: string; title: string }>>(
    client,
    'sec:company-tickers',
    { defaultTTL: 24 * 3_600_000, maxSize: 2 }
  );
  const map = await cache.getOrFetch('all', async () => {
    const json = await client.get<Record<string, SecTickerEntry>>(SEC_TICKERS_URL, {
      responseType: 'json',
      provider: 'sec',
      hostFallback: false,
      headers: {
        'User-Agent': client.secUserAgent,
        Accept: 'application/json',
      },
    });
    const next = new Map<string, { cik10: string; cikNum: string; title: string }>();
    for (const item of Object.values(json ?? {})) {
      if (!item?.ticker || item.cik_str == null) continue;
      const cikNum = String(item.cik_str);
      next.set(item.ticker.toUpperCase(), {
        cik10: cikNum.padStart(10, '0'),
        cikNum,
        title: item.title ?? item.ticker,
      });
    }
    if (next.size === 0) {
      throw new UpstreamEmptyError('SEC company_tickers.json returned empty', 'sec', SEC_TICKERS_URL);
    }
    return next;
  }, undefined, signal);

  const hit = map.get(ticker.toUpperCase());
  if (!hit) {
    throw new UpstreamEmptyError(`SEC CIK not found for US ticker ${ticker}`, 'sec', SEC_TICKERS_URL);
  }
  return hit;
}

async function fetchSecAnnouncements(
  client: NodeHttpClient,
  options: AnnouncementQueryOptions,
  signal?: AbortSignal
): Promise<StockAnnouncement[]> {
  if (!options.symbol) {
    throw new UpstreamEmptyError('SEC announcements require a US symbol', 'sec', SEC_SUBMISSIONS_BASE);
  }
  const code = normalizeSymbol(options.symbol, { market: 'US' }).code.toUpperCase();
  const company = await resolveSecCompany(client, code, signal);
  const url = `${SEC_SUBMISSIONS_BASE}/CIK${company.cik10}.json`;
  const json = await client.get<SecSubmissionsResponse>(url, {
    responseType: 'json',
    provider: 'sec',
    hostFallback: false,
    headers: {
      'User-Agent': client.secUserAgent,
      Accept: 'application/json',
    },
  });

  const rec = json?.filings?.recent;
  const forms = rec?.form ?? [];
  const dates = rec?.filingDate ?? [];
  const accs = rec?.accessionNumber ?? [];
  const docs = rec?.primaryDocument ?? [];
  const descs = rec?.primaryDocDescription ?? [];
  const companyName = json?.name ?? company.title;
  const kw = options.keyword?.trim().toLowerCase();

  const matched: StockAnnouncement[] = [];
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i] ?? '';
    const desc = descs[i] ?? '';
    const title = desc && desc.toUpperCase() !== form.toUpperCase() ? `${form} - ${desc}` : form;
    if (kw && !title.toLowerCase().includes(kw) && !form.toLowerCase().includes(kw)) {
      continue;
    }
    const acc = accs[i] ?? '';
    const doc = docs[i] ?? '';
    const publishedAt = dates[i] ?? '';
    const meta = buildTimeMeta(publishedAt, MARKET_TZ.US);
    const accClean = acc.replace(/-/g, '');
    const fileUrl =
      accClean && doc
        ? `https://www.sec.gov/Archives/edgar/data/${company.cikNum}/${accClean}/${doc}`
        : null;
    const ext = doc.includes('.') ? doc.slice(doc.lastIndexOf('.') + 1).toUpperCase() : null;
    matched.push({
      id: acc || `${code}-${i}`,
      code,
      name: companyName,
      title,
      category: form || null,
      publishedAt,
      timestamp: meta.timestamp,
      url: fileUrl,
      fileType: ext,
      source: 'sec',
    });
  }

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 20, 100));
  return matched.slice((page - 1) * pageSize, page * pageSize);
}

/**
 * 创建全部海外数据源适配器（CNBC / Nasdaq / SEC EDGAR）。
 */
export function createOverseasAdapters(
  client: NodeHttpClient
): SourceAdapter<unknown, unknown>[] {
  const hkQuotesCnbc: SourceAdapter<QuoteBatchInput, HKQuote[]> = {
    id: 'cnbc:quotes.hk',
    capability: 'quotes.hk',
    provider: 'cnbc',
    priority: 30,
    providedFields: new Set(['price', 'change', 'changePercent', 'volume', 'totalMarketCap']),
    supports: (input) => input.codes.length > 0,
    fetch: (input) => fetchCnbcHkQuotes(client, input.codes),
  };

  const usQuotesCnbc: SourceAdapter<QuoteBatchInput, USQuote[]> = {
    id: 'cnbc:quotes.us',
    capability: 'quotes.us',
    provider: 'cnbc',
    priority: 30,
    providedFields: new Set(['price', 'change', 'changePercent', 'volume', 'pe', 'totalMarketCap', 'high52w', 'low52w']),
    supports: (input) => input.codes.length > 0,
    fetch: (input) => fetchCnbcUsQuotes(client, input.codes),
  };

  const usQuotesNasdaq: SourceAdapter<QuoteBatchInput, USQuote[]> = {
    id: 'nasdaq:quotes.us',
    capability: 'quotes.us',
    provider: 'nasdaq',
    priority: 40,
    providedFields: new Set(['price', 'change', 'changePercent', 'volume']),
    supports: (input) => input.codes.length > 0,
    fetch: async (input) => {
      const settled = await asyncPool(
        input.codes.map((c) => () => fetchNasdaqSingleQuote(client, c)),
        5,
        true
      );
      const valid = settled.filter((q): q is USQuote => q !== null);
      if (valid.length === 0) {
        throw new UpstreamEmptyError('Nasdaq quotes matched 0 symbols', 'nasdaq', NASDAQ_API_BASE);
      }
      return valid;
    },
  };

  // CNBC 与 Nasdaq 日 K 使用拆股调整价，严格模式只接受前复权请求。
  const hkKlineCnbc: SourceAdapter<HKHistoryKlineInput, HKHistoryKline[]> = {
    id: 'cnbc:kline.hk.history',
    capability: 'kline.hk.history',
    provider: 'cnbc',
    priority: 30,
    providedFields: new Set(['open', 'close', 'high', 'low', 'volume']),
    supports: (input) =>
      (input.options.period ?? 'daily') === 'daily' &&
      (input.options.adjust ?? 'qfq') === 'qfq' &&
      Boolean(input.options.startDate),
    fetch: async (input, ctx) => {
      const ns = normalizeSymbol(input.symbol, { market: 'HK' });
      const code5 = ns.code.padStart(5, '0');
      const bars = await fetchCnbcChartBars(
        client,
        toCnbcHkSymbol(input.symbol),
        input.options,
        ctx.strictCapabilities !== false
      );
      return enrichForeignBars(bars, code5, MARKET_TZ.HK).map((b) => ({
        ...b,
        currency: 'HKD' as const,
        lotSize: null,
      }));
    },
  };

  const usKlineCnbc: SourceAdapter<USHistoryKlineInput, USHistoryKline[]> = {
    id: 'cnbc:kline.us.history',
    capability: 'kline.us.history',
    provider: 'cnbc',
    priority: 30,
    providedFields: new Set(['open', 'close', 'high', 'low', 'volume']),
    supports: (input) =>
      (input.options.period ?? 'daily') === 'daily' &&
      (input.options.adjust ?? 'qfq') === 'qfq' &&
      Boolean(input.options.startDate),
    fetch: async (input, ctx) => {
      const code = normalizeSymbol(input.symbol, { market: 'US' }).code.toUpperCase();
      const bars = await fetchCnbcChartBars(
        client,
        code,
        input.options,
        ctx.strictCapabilities !== false
      );
      return enrichForeignBars(bars, code, MARKET_TZ.US).map((b) => ({
        ...b,
        currency: 'USD' as const,
      }));
    },
  };

  const usKlineNasdaq: SourceAdapter<USHistoryKlineInput, USHistoryKline[]> = {
    id: 'nasdaq:kline.us.history',
    capability: 'kline.us.history',
    provider: 'nasdaq',
    priority: 40,
    providedFields: new Set(['open', 'close', 'high', 'low', 'volume']),
    supports: (input) =>
      (input.options.period ?? 'daily') === 'daily' &&
      (input.options.adjust ?? 'qfq') === 'qfq' &&
      Boolean(input.options.startDate),
    fetch: (input, ctx) => fetchNasdaqUsKline(client, input, ctx.strictCapabilities !== false),
  };

  const usDividendNasdaq: SourceAdapter<{ symbol: string }, DividendDetail[]> = {
    id: 'nasdaq:reference.dividendDetail',
    capability: 'reference.dividendDetail',
    provider: 'nasdaq',
    priority: 20,
    providedFields: new Set(['dividendPretax', 'dividendPerShare', 'exDividendDate', 'equityRecordDate', 'payDate']),
    supports: ({ symbol }) => detectMarketSafe(symbol) === 'US',
    fetch: ({ symbol }) => fetchNasdaqDividends(client, symbol),
  };

  const usIncomeNasdaq: SourceAdapter<SymbolFinancialInput, IncomeStatement[]> = {
    id: 'nasdaq:financial.income',
    capability: 'financial.income',
    provider: 'nasdaq',
    priority: 20,
    providedFields: new Set(['totalRevenue', 'operatingCost', 'operatingProfit', 'netProfit']),
    supports: ({ symbol }) => detectMarketSafe(symbol) === 'US',
    fetch: async ({ symbol, options }) => {
      const { code, data } = await fetchNasdaqFinancialsPayload(client, symbol);
      const periods = parseNasdaqFinancialTable(data.incomeStatementTable);
      if (periods.length === 0) {
        return [];
      }
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 20);
      return periods.slice((page - 1) * pageSize, page * pageSize).map(
        ({ reportDate, values }): IncomeStatement => ({
          code,
          name: code,
          reportDate,
          noticeDate: null,
          totalRevenue: values.get('Total Revenue') ?? null,
          revenueYoy: null,
          totalOperatingCost: null,
          operatingCost: values.get('Cost of Revenue') ?? null,
          sellingExpense: values.get('Sales, General and Admin.') ?? null,
          adminExpense: null,
          financeExpense: values.get('Interest Expense') ?? null,
          operatingProfit: values.get('Operating Income') ?? null,
          totalProfit: values.get('Earnings Before Tax') ?? null,
          incomeTax: values.get('Income Tax') ?? null,
          netProfit: values.get('Net Income') ?? null,
          netProfitYoy: null,
          deductedNetProfit: null,
          currency: 'USD',
          source: 'nasdaq',
        })
      );
    },
  };

  const usBalanceNasdaq: SourceAdapter<SymbolFinancialInput, BalanceSheet[]> = {
    id: 'nasdaq:financial.balance',
    capability: 'financial.balance',
    provider: 'nasdaq',
    priority: 20,
    providedFields: new Set(['totalAssets', 'totalLiabilities', 'totalEquity', 'monetaryFunds']),
    supports: ({ symbol }) => detectMarketSafe(symbol) === 'US',
    fetch: async ({ symbol, options }) => {
      const { code, data } = await fetchNasdaqFinancialsPayload(client, symbol);
      const periods = parseNasdaqFinancialTable(data.balanceSheetTable);
      if (periods.length === 0) {
        return [];
      }
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 20);
      return periods.slice((page - 1) * pageSize, page * pageSize).map(
        ({ reportDate, values }): BalanceSheet => {
          const totalAssets = values.get('Total Assets') ?? null;
          const totalLiabilities = values.get('Total Liabilities') ?? null;
          const curAssets = values.get('Total Current Assets') ?? null;
          const curLiab = values.get('Total Current Liabilities') ?? null;
          return {
            code,
            name: code,
            reportDate,
            noticeDate: null,
            totalAssets,
            totalAssetsYoy: null,
            monetaryFunds: values.get('Cash and Cash Equivalents') ?? null,
            accountsReceivable: values.get('Net Receivables') ?? null,
            inventory: values.get('Inventory') ?? null,
            fixedAssets: values.get('Fixed Assets') ?? null,
            totalLiabilities,
            accountsPayable: values.get('Accounts Payable') ?? null,
            totalEquity: values.get('Total Equity') ?? null,
            debtToAssetRatio:
              totalAssets && totalLiabilities !== null
                ? round2((totalLiabilities / totalAssets) * 100)
                : null,
            currentRatio: curAssets !== null && curLiab && curLiab !== 0 ? round2(curAssets / curLiab) : null,
            currency: 'USD',
            source: 'nasdaq',
          };
        }
      );
    },
  };

  const usCashflowNasdaq: SourceAdapter<SymbolFinancialInput, CashFlowStatement[]> = {
    id: 'nasdaq:financial.cashflow',
    capability: 'financial.cashflow',
    provider: 'nasdaq',
    priority: 20,
    providedFields: new Set(['operatingCashFlow', 'investingCashFlow', 'financingCashFlow']),
    supports: ({ symbol }) => detectMarketSafe(symbol) === 'US',
    fetch: async ({ symbol, options }) => {
      const { code, data } = await fetchNasdaqFinancialsPayload(client, symbol);
      const periods = parseNasdaqFinancialTable(data.cashFlowTable);
      if (periods.length === 0) {
        return [];
      }
      const page = Math.max(1, options.page ?? 1);
      const pageSize = Math.max(1, options.pageSize ?? 20);
      return periods.slice((page - 1) * pageSize, page * pageSize).map(
        ({ reportDate, values }): CashFlowStatement => ({
          code,
          name: code,
          reportDate,
          noticeDate: null,
          operatingCashFlow: values.get('Net Cash Flow-Operating') ?? null,
          operatingCashFlowYoy: null,
          cashFromSales: null,
          investingCashFlow: values.get('Net Cash Flows-Investing') ?? null,
          financingCashFlow: values.get('Net Cash Flows-Financing') ?? null,
          netCashIncrease: values.get('Net Cash Flow') ?? null,
          currency: 'USD',
          source: 'nasdaq',
        })
      );
    },
  };

  const usAnnouncementsSec: SourceAdapter<AnnouncementQueryOptions, StockAnnouncement[]> = {
    id: 'sec:news.announcements',
    capability: 'news.announcements',
    provider: 'sec',
    priority: 10,
    providedFields: new Set(['id', 'code', 'name', 'title', 'category', 'publishedAt', 'url', 'fileType']),
    supports: (opts) => Boolean(opts.symbol) && detectMarketSafe(opts.symbol) === 'US',
    fetch: (opts, { signal }) => fetchSecAnnouncements(client, opts, signal),
  };

  return [
    hkQuotesCnbc,
    usQuotesCnbc,
    usQuotesNasdaq,
    hkKlineCnbc,
    usKlineCnbc,
    usKlineNasdaq,
    usDividendNasdaq,
    usIncomeNasdaq,
    usBalanceNasdaq,
    usCashflowNasdaq,
    usAnnouncementsSec,
  ] as SourceAdapter<unknown, unknown>[];
}
