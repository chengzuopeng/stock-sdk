/**
 * Node 端批量全市场行情与个股分红多源适配器：
 * - `batch.cn` / `batch.hk` / `batch.us`：腾讯分批（主源） ↔ 东财 clist 全市场分页（备源）
 * - `reference.dividendDetail`：东财数据中心（主源） ↔ 新浪个股分红页 HTML 表格（零依赖解析备源）
 */
import {
  EM_CLIST_URL,
  EM_PUSH_TOKEN,
  formatInTz,
  MARKET_TZ,
  toNumberSafe,
  UpstreamEmptyError,
} from '@stock-sdk/core/core';
import { eastmoney, tencent } from '@stock-sdk/core/providers';
import { normalizeSymbol } from '@stock-sdk/core/symbols';
import type { SourceAdapter } from '@stock-sdk/core/router';
import type { DividendDetail, FullQuote, HKQuote, USQuote } from '@stock-sdk/core/types';
import type {
  AShareMarket,
  GetAllAShareQuotesOptions,
  GetAllHKQuotesOptions,
  GetAllUSQuotesOptions,
  USMarket,
} from '@stock-sdk/core/providers/tencent/batch';
import type { NodeHttpClient } from '../transport/nodeHttpClient';

const EM_CLIST_FIELDS =
  'f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f38,f39,f124';
const SINA_DIVIDEND_URL =
  'https://vip.stock.finance.sina.com.cn/corp/go.php/vISSUE_ShareBonus/stockid/';

interface EmClistRow {
  f2?: unknown;
  f3?: unknown;
  f4?: unknown;
  f5?: unknown;
  f6?: unknown;
  f7?: unknown;
  f8?: unknown;
  f9?: unknown;
  f10?: unknown;
  f12?: unknown;
  f13?: unknown;
  f14?: unknown;
  f15?: unknown;
  f16?: unknown;
  f17?: unknown;
  f18?: unknown;
  f20?: unknown;
  f21?: unknown;
  f23?: unknown;
  f38?: unknown;
  f39?: unknown;
  f124?: unknown;
}

interface EmClistResponse {
  data?: {
    total?: number;
    diff?: EmClistRow[];
  } | null;
}

const CN_MARKET_FS: Record<AShareMarket | 'all', string> = {
  all: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048',
  sh: 'm:1+t:2,m:1+t:23',
  sz: 'm:0+t:6,m:0+t:80',
  kc: 'm:1+t:23',
  cy: 'm:0+t:80',
  bj: 'm:0+t:81+s:2048',
};

const US_MARKET_FS: Record<USMarket | 'all', string> = {
  all: 'm:105,m:106,m:107',
  NASDAQ: 'm:105',
  NYSE: 'm:106',
  AMEX: 'm:107',
};

const HK_MARKET_FS = 'm:128+t:3,m:128+t:4,m:128+t:1,m:128+t:2';

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function num(v: unknown): number {
  return toNumberSafe(v) ?? 0;
}

function emEpochMeta(f124: unknown, tz: (typeof MARKET_TZ)[keyof typeof MARKET_TZ]) {
  const sec = toNumberSafe(f124);
  if (sec === null || sec <= 0) return { time: '', timestamp: null, tz };
  const ms = sec * 1000;
  return { time: formatInTz(ms, tz), timestamp: ms, tz };
}

async function fetchEmClistAllPages(
  client: NodeHttpClient,
  fs: string,
  options: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<EmClistRow[]> {
  const pageSize = Math.max(20, Math.min(options.batchSize ?? 100, 100));
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, 8));

  const fetchPage = async (pn: number): Promise<{ total: number; rows: EmClistRow[] }> => {
    const params = new URLSearchParams({
      ut: EM_PUSH_TOKEN,
      pn: String(pn),
      pz: String(pageSize),
      po: '1',
      np: '1',
      fltt: '2',
      invt: '2',
      fid: 'f3',
      fs,
      fields: EM_CLIST_FIELDS,
    });
    const url = `${EM_CLIST_URL}?${params.toString()}`;
    const json = await client.get<EmClistResponse>(url, {
      responseType: 'json',
      provider: 'eastmoney',
    });
    const diff = json?.data?.diff;
    if (!Array.isArray(diff)) {
      throw new UpstreamEmptyError('Eastmoney clist response has no diff payload', 'eastmoney', url);
    }
    return { total: json?.data?.total ?? diff.length, rows: diff };
  };

  const first = await fetchPage(1);
  if (first.rows.length === 0) {
    throw new UpstreamEmptyError('Eastmoney clist returned empty rows', 'eastmoney', EM_CLIST_URL);
  }
  const actualPageSize = first.rows.length;
  const totalPages = Math.max(1, Math.ceil(first.total / actualPageSize));
  const allRows: EmClistRow[] = [...first.rows];
  let completed = 1;
  options.onProgress?.(completed, totalPages);

  for (let start = 2; start <= totalPages; start += concurrency) {
    const waveEnd = Math.min(totalPages, start + concurrency - 1);
    const pages = Array.from({ length: waveEnd - start + 1 }, (_, i) => start + i);
    const waveResults = await Promise.all(pages.map((p) => fetchPage(p)));
    for (const res of waveResults) {
      allRows.push(...res.rows);
      completed += 1;
      options.onProgress?.(completed, totalPages);
    }
  }

  return allRows;
}

function mapEmRowToFullQuote(r: EmClistRow): FullQuote {
  const volume = num(r.f5);
  const amountYuan = num(r.f6);
  const totalCap = toNumberSafe(r.f20);
  const circCap = toNumberSafe(r.f21);
  const meta = emEpochMeta(r.f124, MARKET_TZ.CN);
  return {
    marketId: String(r.f13 ?? '1'),
    name: String(r.f14 ?? ''),
    code: String(r.f12 ?? ''),
    price: num(r.f2),
    prevClose: num(r.f18),
    open: num(r.f17),
    volume,
    outerVolume: 0,
    innerVolume: 0,
    bid: [],
    ask: [],
    time: meta.time,
    timestamp: meta.timestamp,
    tz: meta.tz,
    change: num(r.f4),
    changePercent: num(r.f3),
    high: num(r.f15),
    low: num(r.f16),
    volume2: volume,
    amount: round2(amountYuan / 10_000),
    turnoverRate: toNumberSafe(r.f8),
    pe: toNumberSafe(r.f9),
    amplitude: toNumberSafe(r.f7),
    circulatingMarketCap: circCap === null ? null : round2(circCap / 1e8),
    totalMarketCap: totalCap === null ? null : round2(totalCap / 1e8),
    pb: toNumberSafe(r.f23),
    limitUp: null,
    limitDown: null,
    volumeRatio: toNumberSafe(r.f10),
    avgPrice: volume > 0 ? round2(amountYuan / (volume * 100)) : null,
    peStatic: null,
    peDynamic: toNumberSafe(r.f9),
    high52w: null,
    low52w: null,
    circulatingShares: toNumberSafe(r.f39),
    totalShares: toNumberSafe(r.f38),
    market: 'CN',
    assetType: 'stock',
    source: 'eastmoney',
  };
}

function mapEmRowToHKQuote(r: EmClistRow): HKQuote {
  const totalCap = toNumberSafe(r.f20);
  const circCap = toNumberSafe(r.f21);
  const meta = emEpochMeta(r.f124, MARKET_TZ.HK);
  return {
    marketId: String(r.f13 ?? '128'),
    name: String(r.f14 ?? ''),
    code: String(r.f12 ?? ''),
    price: num(r.f2),
    prevClose: num(r.f18),
    open: num(r.f17),
    volume: num(r.f5),
    time: meta.time,
    timestamp: meta.timestamp,
    tz: meta.tz,
    change: num(r.f4),
    changePercent: num(r.f3),
    high: num(r.f15),
    low: num(r.f16),
    amount: num(r.f6),
    lotSize: null,
    circulatingMarketCap: circCap === null ? null : round2(circCap / 1e8),
    totalMarketCap: totalCap === null ? null : round2(totalCap / 1e8),
    currency: 'HKD',
    market: 'HK',
    assetType: 'stock',
    source: 'eastmoney',
  };
}

function mapEmRowToUSQuote(r: EmClistRow): USQuote {
  const totalCap = toNumberSafe(r.f20);
  const meta = emEpochMeta(r.f124, MARKET_TZ.US);
  return {
    marketId: String(r.f13 ?? '105'),
    name: String(r.f14 ?? ''),
    code: String(r.f12 ?? ''),
    price: num(r.f2),
    prevClose: num(r.f18),
    open: num(r.f17),
    volume: num(r.f5),
    time: meta.time,
    timestamp: meta.timestamp,
    tz: meta.tz,
    change: num(r.f4),
    changePercent: num(r.f3),
    high: num(r.f15),
    low: num(r.f16),
    amount: num(r.f6),
    turnoverRate: toNumberSafe(r.f8),
    pe: toNumberSafe(r.f9),
    amplitude: toNumberSafe(r.f7),
    totalMarketCap: totalCap === null ? null : round2(totalCap / 1e8),
    pb: toNumberSafe(r.f23),
    high52w: null,
    low52w: null,
    market: 'US',
    assetType: 'stock',
    source: 'eastmoney',
  };
}

function cleanCell(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function nullableDateCell(val: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : null;
}

/**
 * 解析新浪个股分红页 HTML 的 `#sharebonus_1` 表格（纯文本提取，零外部依赖）。
 */
export function parseSinaDividendHtml(html: string, code: string): DividendDetail[] {
  const titleMatch = /<title>([^<(]+)\(/i.exec(html);
  const name = titleMatch ? titleMatch[1].trim() : '';

  const tableMatch = /<table[^>]*id=["']sharebonus_1["'][^>]*>([\s\S]*?)<\/table>/i.exec(html);
  if (!tableMatch) {
    throw new UpstreamEmptyError(
      `Sina dividend table not found for ${code}`,
      'sina',
      `${SINA_DIVIDEND_URL}${code}.phtml`
    );
  }
  const tbodyMatch = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(tableMatch[1]);
  const body = tbodyMatch ? tbodyMatch[1] : tableMatch[1];

  const rows: DividendDetail[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(body)) !== null) {
    const tds = Array.from(tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi), (m) =>
      cleanCell(m[1])
    );
    if (tds.length < 8) continue;
    const noticeDate = nullableDateCell(tds[0]);
    if (!noticeDate) continue;

    const bonusRatio = toNumberSafe(tds[1]);
    const transferRatio = toNumberSafe(tds[2]);
    const dividendPretax = toNumberSafe(tds[3]);
    const assignTransferRatio =
      bonusRatio !== null || transferRatio !== null
        ? (bonusRatio ?? 0) + (transferRatio ?? 0)
        : null;
    const progress = tds[4] && tds[4] !== '--' ? tds[4] : null;
    const exDividendDate = nullableDateCell(tds[5]);
    const equityRecordDate = nullableDateCell(tds[6]);
    const payDate = nullableDateCell(tds[7]);

    const parts: string[] = [];
    if (bonusRatio && bonusRatio > 0) parts.push(`送${bonusRatio}股`);
    if (transferRatio && transferRatio > 0) parts.push(`转${transferRatio}股`);
    if (dividendPretax && dividendPretax > 0) parts.push(`派${dividendPretax}元`);
    const dividendDesc = parts.length > 0 ? `10${parts.join('')}` : null;

    rows.push({
      code,
      name,
      reportDate: null,
      planNoticeDate: noticeDate,
      disclosureDate: noticeDate,
      assignTransferRatio,
      bonusRatio,
      transferRatio,
      dividendPretax,
      dividendPerShare:
        dividendPretax !== null
          ? Math.round((dividendPretax / 10) * 1_000_000) / 1_000_000
          : null,
      shareUnit: 10,
      currency: 'CNY',
      dividendDesc,
      dividendYield: null,
      eps: null,
      bps: null,
      capitalReserve: null,
      unassignedProfit: null,
      netProfitYoy: null,
      totalShares: null,
      equityRecordDate,
      exDividendDate,
      payDate,
      assignProgress: progress,
      noticeDate,
    });
  }

  return rows;
}

function extractPerShareDividend(planExplain: string | null): number | null {
  if (!planExplain) return null;
  const m = /派[^\d]*(\d+(?:\.\d+)?)/.exec(planExplain);
  return m ? toNumberSafe(m[1]) : null;
}

function safeDetectMarket(symbol: string): 'CN' | 'HK' | 'US' | null {
  try {
    const ns = normalizeSymbol(symbol);
    return ns.market === 'CN' || ns.market === 'HK' || ns.market === 'US' ? ns.market : null;
  } catch {
    return null;
  }
}

async function fetchEmMultiMarketDividend(
  client: NodeHttpClient,
  symbol: string
): Promise<DividendDetail[]> {
  const ns = normalizeSymbol(symbol);
  if (ns.market === 'HK') {
    const code = ns.code.padStart(5, '0');
    const res = await eastmoney.fetchDatacenter<DividendDetail>(
      client,
      {
        reportName: 'RPT_HKF10_INFO_DIVIDEND',
        filter: `(SECURITY_CODE="${code}")`,
        sortColumns: 'EX_DIVIDEND_DATE',
        sortTypes: '-1',
        startPage: 1,
        pageSize: 50,
        fetchAllPages: false,
      },
      (r): DividendDetail => {
        const desc = typeof r.PLAN_EXPLAIN === 'string' && r.PLAN_EXPLAIN.trim() ? r.PLAN_EXPLAIN.trim() : null;
        const noticeDate = typeof r.NOTICE_DATE === 'string' ? r.NOTICE_DATE.slice(0, 10) : null;
        const perShare = extractPerShareDividend(desc);
        return {
          code: String(r.SECURITY_CODE ?? code),
          name: String(r.SECURITY_NAME_ABBR ?? ''),
          reportDate: typeof r.ASSIGN_PERIOD === 'string' ? r.ASSIGN_PERIOD : null,
          planNoticeDate: noticeDate,
          disclosureDate: noticeDate,
          assignTransferRatio: null,
          bonusRatio: null,
          transferRatio: null,
          dividendPretax: perShare,
          dividendPerShare: perShare,
          shareUnit: 1,
          currency: 'HKD',
          dividendDesc: desc,
          dividendYield: null,
          eps: null,
          bps: null,
          capitalReserve: null,
          unassignedProfit: null,
          netProfitYoy: null,
          totalShares: null,
          equityRecordDate: typeof r.RECORD_DATE === 'string' ? r.RECORD_DATE.slice(0, 10) : null,
          exDividendDate: typeof r.EX_DIVIDEND_DATE === 'string' ? r.EX_DIVIDEND_DATE.slice(0, 10) : null,
          payDate: typeof r.DIVIDEND_DATE === 'string' ? r.DIVIDEND_DATE.slice(0, 10) : null,
          assignProgress: typeof r.ASSIGN_PROGRESS === 'string' ? r.ASSIGN_PROGRESS : null,
          noticeDate,
        };
      }
    );
    return res.data;
  }

  if (ns.market === 'US') {
    const code = ns.code.toUpperCase();
    const res = await eastmoney.fetchDatacenter<DividendDetail>(
      client,
      {
        reportName: 'RPT_USF10_INFO_DIVIDEND',
        filter: `(SECURITY_CODE="${code}")`,
        sortColumns: 'EX_DIVIDEND_DATE',
        sortTypes: '-1',
        startPage: 1,
        pageSize: 50,
        fetchAllPages: false,
      },
      (r): DividendDetail => {
        const desc = typeof r.PLAN_EXPLAIN === 'string' && r.PLAN_EXPLAIN.trim() ? r.PLAN_EXPLAIN.trim() : null;
        const noticeDate = typeof r.NOTICE_DATE === 'string' ? r.NOTICE_DATE.slice(0, 10) : null;
        const perShare = extractPerShareDividend(desc);
        return {
          code: String(r.SECURITY_CODE ?? code),
          name: String(r.SECURITY_NAME_ABBR ?? ''),
          reportDate: typeof r.ASSIGN_PERIOD === 'string' ? r.ASSIGN_PERIOD : null,
          planNoticeDate: noticeDate,
          disclosureDate: noticeDate,
          assignTransferRatio: null,
          bonusRatio: null,
          transferRatio: null,
          dividendPretax: perShare,
          dividendPerShare: perShare,
          shareUnit: 1,
          currency: 'USD',
          dividendDesc: desc,
          dividendYield: null,
          eps: null,
          bps: null,
          capitalReserve: null,
          unassignedProfit: null,
          netProfitYoy: null,
          totalShares: null,
          equityRecordDate: typeof r.EQUITY_RECORD_DATE === 'string' ? r.EQUITY_RECORD_DATE.slice(0, 10) : null,
          exDividendDate: typeof r.EX_DIVIDEND_DATE === 'string' ? r.EX_DIVIDEND_DATE.slice(0, 10) : null,
          payDate: typeof r.BONUS_PAY_DATE === 'string' ? r.BONUS_PAY_DATE.slice(0, 10) : null,
          assignProgress: typeof r.ASSIGN_TYPE === 'string' ? r.ASSIGN_TYPE : null,
          noticeDate,
        };
      }
    );
    return res.data;
  }

  return eastmoney.getDividendDetail(client, symbol);
}

async function fetchSinaDividendDetail(
  client: NodeHttpClient,
  symbol: string
): Promise<DividendDetail[]> {
  const ns = normalizeSymbol(symbol, { market: 'CN' });
  const url = `${SINA_DIVIDEND_URL}${ns.code}.phtml`;
  const html = await client.getGBK(url, {
    provider: 'sina',
    hostFallback: false,
  });
  return parseSinaDividendHtml(html, ns.code);
}

/**
 * 创建全市场批量快照（batch.cn/hk/us）与个股分红（reference.dividendDetail）双源适配器。
 */
export function createNodeBatchAndReferenceAdapters(
  client: NodeHttpClient
): SourceAdapter<unknown, unknown>[] {
  const batchCnTencent: SourceAdapter<GetAllAShareQuotesOptions, FullQuote[]> = {
    id: 'tencent:batch.cn',
    capability: 'batch.cn',
    provider: 'tencent',
    priority: 10,
    providedFields: new Set(['price', 'volume', 'amount', 'bid', 'ask', 'pe', 'pb']),
    supports: () => true,
    fetch: async (opts) => {
      const { market, ...batchOptions } = opts;
      const codes = await tencent.getAShareCodeList(client, { market });
      return tencent.getAllQuotesByCodes(client, codes, batchOptions);
    },
  };

  const batchCnEastmoney: SourceAdapter<GetAllAShareQuotesOptions, FullQuote[]> = {
    id: 'eastmoney:batch.cn',
    capability: 'batch.cn',
    provider: 'eastmoney',
    priority: 20,
    providedFields: new Set(['price', 'volume', 'amount', 'pe', 'pb', 'turnoverRate']),
    supports: () => true,
    fetch: async (opts) => {
      const fs = CN_MARKET_FS[opts.market ?? 'all'] ?? CN_MARKET_FS.all;
      const rows = await fetchEmClistAllPages(client, fs, opts);
      return rows.map(mapEmRowToFullQuote);
    },
  };

  const batchHkTencent: SourceAdapter<GetAllHKQuotesOptions, HKQuote[]> = {
    id: 'tencent:batch.hk',
    capability: 'batch.hk',
    provider: 'tencent',
    priority: 10,
    providedFields: new Set(['price', 'volume', 'amount', 'lotSize']),
    supports: () => true,
    fetch: async (opts) => {
      const codes = await tencent.getHKCodeList(client);
      return tencent.getAllHKQuotesByCodes(client, codes, opts);
    },
  };

  const batchHkEastmoney: SourceAdapter<GetAllHKQuotesOptions, HKQuote[]> = {
    id: 'eastmoney:batch.hk',
    capability: 'batch.hk',
    provider: 'eastmoney',
    priority: 20,
    providedFields: new Set(['price', 'volume', 'amount', 'totalMarketCap']),
    supports: () => true,
    fetch: async (opts) => {
      const rows = await fetchEmClistAllPages(client, HK_MARKET_FS, opts);
      return rows.map(mapEmRowToHKQuote);
    },
  };

  const batchUsTencent: SourceAdapter<GetAllUSQuotesOptions, USQuote[]> = {
    id: 'tencent:batch.us',
    capability: 'batch.us',
    provider: 'tencent',
    priority: 10,
    providedFields: new Set(['price', 'volume', 'amount', 'pe', 'pb']),
    supports: () => true,
    fetch: async (opts) => {
      const { market, ...restOptions } = opts;
      const codes = await tencent.getUSCodeList(client, { simple: true, market });
      return tencent.getAllUSQuotesByCodes(client, codes, restOptions);
    },
  };

  const batchUsEastmoney: SourceAdapter<GetAllUSQuotesOptions, USQuote[]> = {
    id: 'eastmoney:batch.us',
    capability: 'batch.us',
    provider: 'eastmoney',
    priority: 20,
    providedFields: new Set(['price', 'volume', 'amount', 'pe', 'pb']),
    supports: () => true,
    fetch: async (opts) => {
      const fs = US_MARKET_FS[opts.market ?? 'all'] ?? US_MARKET_FS.all;
      const rows = await fetchEmClistAllPages(client, fs, opts);
      return rows.map(mapEmRowToUSQuote);
    },
  };

  const dividendEastmoney: SourceAdapter<{ symbol: string }, DividendDetail[]> = {
    id: 'eastmoney:reference.dividendDetail',
    capability: 'reference.dividendDetail',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set([
      'dividendPretax',
      'dividendPerShare',
      'exDividendDate',
      'equityRecordDate',
      'dividendDesc',
    ]),
    probeFallbackOnEmpty: true,
    supports: () => true,
    fetch: ({ symbol }) => fetchEmMultiMarketDividend(client, symbol),
  };

  const dividendSina: SourceAdapter<{ symbol: string }, DividendDetail[]> = {
    id: 'sina:reference.dividendDetail',
    capability: 'reference.dividendDetail',
    provider: 'sina',
    priority: 20,
    providedFields: new Set([
      'dividendPretax',
      'dividendPerShare',
      'bonusRatio',
      'transferRatio',
      'exDividendDate',
      'equityRecordDate',
    ]),
    supports: ({ symbol }) => safeDetectMarket(symbol) === 'CN',
    fetch: ({ symbol }) => fetchSinaDividendDetail(client, symbol),
  };

  return [
    batchCnTencent,
    batchCnEastmoney,
    batchHkTencent,
    batchHkEastmoney,
    batchUsTencent,
    batchUsEastmoney,
    dividendEastmoney,
    dividendSina,
  ] as SourceAdapter<unknown, unknown>[];
}
