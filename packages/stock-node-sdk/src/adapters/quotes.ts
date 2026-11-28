/**
 * Node 端多源实时行情适配器：腾讯（默认主源） + 新浪（hq.sinajs.cn + Referer） + 东财（push2 ulist）。
 *
 * 无论命中哪一个数据源，统一归一化为标准 FullQuote / SimpleQuote / HKQuote / USQuote Schema。
 */
import {
  buildTimeMeta,
  EM_PUSH_TOKEN,
  formatInTz,
  MARKET_TZ,
  toNumberSafe,
  UpstreamEmptyError,
} from '@stock-sdk/core/core';
import { tencent } from '@stock-sdk/core/providers';
import { normalizeSymbol, toEastmoneySecid } from '@stock-sdk/core/symbols';
import type { SourceAdapter } from '@stock-sdk/core/router';
import type { FullQuote, HKQuote, SimpleQuote, USQuote } from '@stock-sdk/core/types';
import type { NodeHttpClient } from '../transport/nodeHttpClient';

export interface QuoteBatchInput {
  codes: string[];
}

const SINA_HQ_URL = 'https://hq.sinajs.cn/list=';
const EM_ULIST_URL = 'https://push2.eastmoney.com/api/qt/ulist.np/get';
const EM_ULIST_FIELDS =
  'f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f38,f39,f124';

const FULL_QUOTE_FIELDS: ReadonlySet<string> = new Set([
  'price',
  'prevClose',
  'open',
  'high',
  'low',
  'volume',
  'amount',
  'change',
  'changePercent',
  'bid',
  'ask',
]);

const EM_QUOTE_FIELDS: ReadonlySet<string> = new Set([
  'price',
  'prevClose',
  'open',
  'high',
  'low',
  'volume',
  'amount',
  'change',
  'changePercent',
  'turnoverRate',
  'pe',
  'pb',
  'totalMarketCap',
  'circulatingMarketCap',
]);

const SIMPLE_QUOTE_FIELDS: ReadonlySet<string> = new Set([
  'price',
  'change',
  'changePercent',
  'volume',
  'amount',
]);

interface EmUlistRow {
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

interface EmUlistResponse {
  data?: {
    diff?: EmUlistRow[];
  } | null;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function safeNumber(v: unknown): number {
  return toNumberSafe(v) ?? 0;
}

function safeNumberOrNull(v: unknown): number | null {
  return toNumberSafe(v);
}

function parseSinaLines(raw: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const re = /var\s+hq_str_([A-Za-z0-9_]+)="([^"]*)";/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const key = m[1];
    const body = m[2].trim();
    if (!body) continue;
    map.set(key, body.split(','));
  }
  return map;
}

function toSinaCnKey(code: string): string | null {
  try {
    const ns = normalizeSymbol(code, { market: 'CN' });
    const prefix = ns.exchange === 'SSE' ? 'sh' : ns.exchange === 'SZSE' ? 'sz' : ns.exchange === 'BSE' ? 'bj' : '';
    return prefix ? `${prefix}${ns.code}` : null;
  } catch {
    return null;
  }
}

function toSinaHkKey(code: string): string | null {
  try {
    const ns = normalizeSymbol(code, { market: 'HK' });
    return `hk${ns.code.padStart(5, '0')}`;
  } catch {
    return null;
  }
}

function toSinaUsKey(code: string): string | null {
  try {
    const ns = normalizeSymbol(code, { market: 'US' });
    return `gb_${ns.code.toLowerCase().replace(/\./g, '$')}`;
  } catch {
    return null;
  }
}

async function fetchSinaCnQuotes(client: NodeHttpClient, codes: string[]): Promise<FullQuote[]> {
  if (codes.length === 0) return [];
  const keys = Array.from(new Set(codes.map(toSinaCnKey).filter((k): k is string => k !== null)));
  if (keys.length === 0) return [];

  const text = await client.getGBK(`${SINA_HQ_URL}${keys.join(',')}`, { provider: 'sina' });
  const rows = parseSinaLines(text);
  const result: FullQuote[] = [];

  for (const key of keys) {
    const f = rows.get(key);
    if (!f || f.length < 32) continue;
    const prefix = key.slice(0, 2);
    const code = key.slice(2);
    const open = safeNumber(f[1]);
    const prevClose = safeNumber(f[2]);
    const price = safeNumber(f[3]);
    const high = safeNumber(f[4]);
    const low = safeNumber(f[5]);
    // 新浪返回股数，统一换算为「手」（100 股 = 1 手）
    const volume = Math.round(safeNumber(f[8]) / 100);
    // 新浪返回元，FullQuote.amount 单位为「万元」
    const amount = round2(safeNumber(f[9]) / 10_000);
    const change = round2(price - prevClose);
    const changePercent = prevClose > 0 ? round2((change / prevClose) * 100) : 0;
    const amplitude = prevClose > 0 ? round2(((high - low) / prevClose) * 100) : null;

    const bid = [0, 1, 2, 3, 4].map((i) => ({
      volume: Math.round(safeNumber(f[10 + i * 2]) / 100),
      price: safeNumber(f[11 + i * 2]),
    }));
    const ask = [0, 1, 2, 3, 4].map((i) => ({
      volume: Math.round(safeNumber(f[20 + i * 2]) / 100),
      price: safeNumber(f[21 + i * 2]),
    }));

    const dateStr = (f[30] ?? '').trim();
    const timeStr = (f[31] ?? '').trim();
    const fullTime = dateStr && timeStr ? `${dateStr} ${timeStr}` : dateStr;
    const meta = buildTimeMeta(fullTime, MARKET_TZ.CN);

    result.push({
      marketId: prefix === 'sh' ? '1' : prefix === 'sz' ? '51' : '62',
      name: f[0] ?? '',
      code,
      price,
      prevClose,
      open,
      volume,
      outerVolume: 0,
      innerVolume: 0,
      bid,
      ask,
      time: fullTime,
      timestamp: meta.timestamp,
      tz: meta.tz,
      change,
      changePercent,
      high,
      low,
      volume2: volume,
      amount,
      turnoverRate: null,
      pe: null,
      amplitude,
      circulatingMarketCap: null,
      totalMarketCap: null,
      pb: null,
      limitUp: null,
      limitDown: null,
      volumeRatio: null,
      avgPrice: volume > 0 ? round2((amount * 10_000) / (volume * 100)) : null,
      peStatic: null,
      peDynamic: null,
      high52w: null,
      low52w: null,
      circulatingShares: null,
      totalShares: null,
      market: 'CN',
      assetType: 'stock',
      source: 'sina',
    });
  }

  if (result.length === 0) {
    throw new UpstreamEmptyError('Sina CN quote response is empty', 'sina', SINA_HQ_URL);
  }
  return result;
}

async function fetchEmUlistRows(
  client: NodeHttpClient,
  secids: string[]
): Promise<EmUlistRow[]> {
  if (secids.length === 0) return [];
  const params = new URLSearchParams({
    ut: EM_PUSH_TOKEN,
    fltt: '2',
    invt: '2',
    secids: secids.join(','),
    fields: EM_ULIST_FIELDS,
  });
  const url = `${EM_ULIST_URL}?${params.toString()}`;
  const json = await client.get<EmUlistResponse>(url, {
    responseType: 'json',
    provider: 'eastmoney',
  });
  const diff = json?.data?.diff;
  if (!Array.isArray(diff) || diff.length === 0) {
    throw new UpstreamEmptyError('Eastmoney ulist response has no data', 'eastmoney', url);
  }
  return diff;
}

function emEpochToMeta(f124: unknown, tz: (typeof MARKET_TZ)[keyof typeof MARKET_TZ]) {
  const sec = safeNumberOrNull(f124);
  if (sec === null || sec <= 0) {
    return { time: '', timestamp: null, tz };
  }
  const ms = sec * 1000;
  return {
    time: formatInTz(ms, tz),
    timestamp: ms,
    tz,
  };
}

async function fetchEmCnQuotes(client: NodeHttpClient, codes: string[]): Promise<FullQuote[]> {
  if (codes.length === 0) return [];
  const secids = Array.from(
    new Set(
      codes
        .map((c) => {
          try {
            return toEastmoneySecid(normalizeSymbol(c, { market: 'CN' }));
          } catch {
            return null;
          }
        })
        .filter((s): s is string => s !== null)
    )
  );
  const rows = await fetchEmUlistRows(client, secids);

  return rows.map((r): FullQuote => {
    const code = String(r.f12 ?? '');
    const price = safeNumber(r.f2);
    const prevClose = safeNumber(r.f18);
    const open = safeNumber(r.f17);
    const high = safeNumber(r.f15);
    const low = safeNumber(r.f16);
    const volume = safeNumber(r.f5);
    const amountYuan = safeNumber(r.f6);
    const amountWan = round2(amountYuan / 10_000);
    const meta = emEpochToMeta(r.f124, MARKET_TZ.CN);
    const totalCapYuan = safeNumberOrNull(r.f20);
    const circCapYuan = safeNumberOrNull(r.f21);

    return {
      marketId: String(r.f13 ?? '1'),
      name: String(r.f14 ?? ''),
      code,
      price,
      prevClose,
      open,
      volume,
      outerVolume: 0,
      innerVolume: 0,
      bid: [],
      ask: [],
      time: meta.time,
      timestamp: meta.timestamp,
      tz: meta.tz,
      change: safeNumber(r.f4),
      changePercent: safeNumber(r.f3),
      high,
      low,
      volume2: volume,
      amount: amountWan,
      turnoverRate: safeNumberOrNull(r.f8),
      pe: safeNumberOrNull(r.f9),
      amplitude: safeNumberOrNull(r.f7),
      circulatingMarketCap: circCapYuan === null ? null : round2(circCapYuan / 1e8),
      totalMarketCap: totalCapYuan === null ? null : round2(totalCapYuan / 1e8),
      pb: safeNumberOrNull(r.f23),
      limitUp: null,
      limitDown: null,
      volumeRatio: safeNumberOrNull(r.f10),
      avgPrice: volume > 0 ? round2(amountYuan / (volume * 100)) : null,
      peStatic: null,
      peDynamic: safeNumberOrNull(r.f9),
      high52w: null,
      low52w: null,
      circulatingShares: safeNumberOrNull(r.f39),
      totalShares: safeNumberOrNull(r.f38),
      market: 'CN',
      assetType: 'stock',
      source: 'eastmoney',
    };
  });
}

async function fetchEmHkQuotes(client: NodeHttpClient, codes: string[]): Promise<HKQuote[]> {
  if (codes.length === 0) return [];
  const secids = Array.from(
    new Set(
      codes
        .map((c) => {
          try {
            return toEastmoneySecid(normalizeSymbol(c, { market: 'HK' }));
          } catch {
            return null;
          }
        })
        .filter((s): s is string => s !== null)
    )
  );
  const rows = await fetchEmUlistRows(client, secids);
  return rows.map((r): HKQuote => {
    const meta = emEpochToMeta(r.f124, MARKET_TZ.HK);
    const totalCap = safeNumberOrNull(r.f20);
    const circCap = safeNumberOrNull(r.f21);
    return {
      marketId: String(r.f13 ?? '116'),
      name: String(r.f14 ?? ''),
      code: String(r.f12 ?? ''),
      price: safeNumber(r.f2),
      prevClose: safeNumber(r.f18),
      open: safeNumber(r.f17),
      volume: safeNumber(r.f5),
      time: meta.time,
      timestamp: meta.timestamp,
      tz: meta.tz,
      change: safeNumber(r.f4),
      changePercent: safeNumber(r.f3),
      high: safeNumber(r.f15),
      low: safeNumber(r.f16),
      amount: safeNumber(r.f6),
      lotSize: null,
      circulatingMarketCap: circCap === null ? null : round2(circCap / 1e8),
      totalMarketCap: totalCap === null ? null : round2(totalCap / 1e8),
      currency: 'HKD',
      market: 'HK',
      assetType: 'stock',
      source: 'eastmoney',
    };
  });
}

async function fetchSinaHkQuotes(client: NodeHttpClient, codes: string[]): Promise<HKQuote[]> {
  if (codes.length === 0) return [];
  const keys = Array.from(new Set(codes.map(toSinaHkKey).filter((k): k is string => k !== null)));
  if (keys.length === 0) return [];

  const text = await client.getGBK(`${SINA_HQ_URL}${keys.join(',')}`, { provider: 'sina' });
  const rows = parseSinaLines(text);
  const result: HKQuote[] = [];

  for (const key of keys) {
    const f = rows.get(key);
    if (!f || f.length < 19) continue;
    const dateNorm = (f[17] ?? '').replace(/\//g, '-');
    const timeStr = `${dateNorm} ${(f[18] ?? '').trim()}`.trim();
    const meta = buildTimeMeta(timeStr, MARKET_TZ.HK);
    result.push({
      marketId: '100',
      name: f[1] || f[0] || '',
      code: key.slice(2),
      price: safeNumber(f[6]),
      prevClose: safeNumber(f[3]),
      open: safeNumber(f[2]),
      volume: safeNumber(f[12]),
      time: timeStr,
      timestamp: meta.timestamp,
      tz: meta.tz,
      change: safeNumber(f[7]),
      changePercent: safeNumber(f[8]),
      high: safeNumber(f[4]),
      low: safeNumber(f[5]),
      amount: safeNumber(f[11]),
      lotSize: null,
      circulatingMarketCap: null,
      totalMarketCap: null,
      currency: 'HKD',
      market: 'HK',
      assetType: 'stock',
      source: 'sina',
    });
  }

  if (result.length === 0) {
    throw new UpstreamEmptyError('Sina HK quote response is empty', 'sina', SINA_HQ_URL);
  }
  return result;
}

async function fetchSinaUsQuotes(client: NodeHttpClient, codes: string[]): Promise<USQuote[]> {
  if (codes.length === 0) return [];
  const keys = Array.from(new Set(codes.map(toSinaUsKey).filter((k): k is string => k !== null)));
  if (keys.length === 0) return [];

  const text = await client.getGBK(`${SINA_HQ_URL}${keys.join(',')}`, { provider: 'sina' });
  const rows = parseSinaLines(text);
  const result: USQuote[] = [];

  for (const key of keys) {
    const f = rows.get(key);
    if (!f || f.length < 27) continue;
    const code = key.slice(3).replace(/\$/g, '.').toUpperCase();
    const price = safeNumber(f[1]);
    const prevClose = safeNumber(f[26]);
    const high = safeNumber(f[6]);
    const low = safeNumber(f[7]);
    const totalCapDollar = safeNumberOrNull(f[12]);
    const timeStr = (f[3] ?? '').trim();
    const meta = buildTimeMeta(timeStr, MARKET_TZ.US);

    result.push({
      marketId: '200',
      name: f[0] ?? code,
      code,
      price,
      prevClose,
      open: safeNumber(f[5]),
      volume: safeNumber(f[10]),
      time: timeStr,
      timestamp: meta.timestamp,
      tz: meta.tz,
      change: safeNumber(f[4]),
      changePercent: safeNumber(f[2]),
      high,
      low,
      amount: safeNumber(f[30]),
      turnoverRate: null,
      pe: safeNumberOrNull(f[14]),
      amplitude: prevClose > 0 ? round2(((high - low) / prevClose) * 100) : null,
      totalMarketCap: totalCapDollar === null ? null : round2(totalCapDollar / 1e8),
      pb: null,
      high52w: safeNumberOrNull(f[8]),
      low52w: safeNumberOrNull(f[9]),
      market: 'US',
      assetType: 'stock',
      source: 'sina',
    });
  }

  if (result.length === 0) {
    throw new UpstreamEmptyError('Sina US quote response is empty', 'sina', SINA_HQ_URL);
  }
  return result;
}

async function fetchEmUsQuotes(client: NodeHttpClient, codes: string[]): Promise<USQuote[]> {
  if (codes.length === 0) return [];
  const secids = Array.from(
    new Set(
      codes
        .map((c) => {
          try {
            return toEastmoneySecid(normalizeSymbol(c, { market: 'US' }));
          } catch {
            return null;
          }
        })
        .filter((s): s is string => s !== null)
    )
  );
  const rows = await fetchEmUlistRows(client, secids);
  return rows.map((r): USQuote => {
    const meta = emEpochToMeta(r.f124, MARKET_TZ.US);
    const totalCap = safeNumberOrNull(r.f20);
    return {
      marketId: String(r.f13 ?? '105'),
      name: String(r.f14 ?? ''),
      code: String(r.f12 ?? ''),
      price: safeNumber(r.f2),
      prevClose: safeNumber(r.f18),
      open: safeNumber(r.f17),
      volume: safeNumber(r.f5),
      time: meta.time,
      timestamp: meta.timestamp,
      tz: meta.tz,
      change: safeNumber(r.f4),
      changePercent: safeNumber(r.f3),
      high: safeNumber(r.f15),
      low: safeNumber(r.f16),
      amount: safeNumber(r.f6),
      turnoverRate: safeNumberOrNull(r.f8),
      pe: safeNumberOrNull(r.f9),
      amplitude: safeNumberOrNull(r.f7),
      totalMarketCap: totalCap === null ? null : round2(totalCap / 1e8),
      pb: safeNumberOrNull(r.f23),
      high52w: null,
      low52w: null,
      market: 'US',
      assetType: 'stock',
      source: 'eastmoney',
    };
  });
}

function toSimpleQuote(q: FullQuote): SimpleQuote {
  return {
    marketId: q.marketId,
    name: q.name,
    code: q.code,
    price: q.price,
    change: q.change,
    changePercent: q.changePercent,
    volume: q.volume,
    amount: q.amount,
    marketCap: q.totalMarketCap,
    marketType: 'GP-A',
    market: 'CN',
    assetType: 'stock',
    source: q.source,
  };
}

/**
 * 创建全部多源实时行情适配器（A / HK / US 均具备 3 源自动容错）。
 */
export function createNodeQuoteAdapters(
  client: NodeHttpClient
): SourceAdapter<unknown, unknown>[] {
  const cnTencent: SourceAdapter<QuoteBatchInput, FullQuote[]> = {
    id: 'tencent:quotes.cn',
    capability: 'quotes.cn',
    provider: 'tencent',
    priority: 10,
    providedFields: new Set([...FULL_QUOTE_FIELDS, ...EM_QUOTE_FIELDS]),
    supports: () => true,
    fetch: async ({ codes }) => {
      const res = await tencent.getFullQuotes(client, codes);
      if (codes.length > 0 && res.length === 0) {
        throw new UpstreamEmptyError('Tencent CN quote response is empty', 'tencent');
      }
      return res;
    },
  };

  const cnSina: SourceAdapter<QuoteBatchInput, FullQuote[]> = {
    id: 'sina:quotes.cn',
    capability: 'quotes.cn',
    provider: 'sina',
    priority: 20,
    providedFields: FULL_QUOTE_FIELDS,
    supports: () => true,
    fetch: ({ codes }) => fetchSinaCnQuotes(client, codes),
  };

  const cnEastmoney: SourceAdapter<QuoteBatchInput, FullQuote[]> = {
    id: 'eastmoney:quotes.cn',
    capability: 'quotes.cn',
    provider: 'eastmoney',
    priority: 30,
    providedFields: EM_QUOTE_FIELDS,
    supports: () => true,
    fetch: ({ codes }) => fetchEmCnQuotes(client, codes),
  };

  const cnSimpleTencent: SourceAdapter<QuoteBatchInput, SimpleQuote[]> = {
    id: 'tencent:quotes.cnSimple',
    capability: 'quotes.cnSimple',
    provider: 'tencent',
    priority: 10,
    providedFields: SIMPLE_QUOTE_FIELDS,
    supports: () => true,
    fetch: async ({ codes }) => {
      const res = await tencent.getSimpleQuotes(client, codes);
      if (codes.length > 0 && res.length === 0) {
        throw new UpstreamEmptyError('Tencent CN simple quote response is empty', 'tencent');
      }
      return res;
    },
  };

  const cnSimpleEm: SourceAdapter<QuoteBatchInput, SimpleQuote[]> = {
    id: 'eastmoney:quotes.cnSimple',
    capability: 'quotes.cnSimple',
    provider: 'eastmoney',
    priority: 20,
    providedFields: SIMPLE_QUOTE_FIELDS,
    supports: () => true,
    fetch: async ({ codes }) => (await fetchEmCnQuotes(client, codes)).map(toSimpleQuote),
  };

  const cnSimpleSina: SourceAdapter<QuoteBatchInput, SimpleQuote[]> = {
    id: 'sina:quotes.cnSimple',
    capability: 'quotes.cnSimple',
    provider: 'sina',
    priority: 30,
    providedFields: SIMPLE_QUOTE_FIELDS,
    supports: () => true,
    fetch: async ({ codes }) => (await fetchSinaCnQuotes(client, codes)).map(toSimpleQuote),
  };

  const hkTencent: SourceAdapter<QuoteBatchInput, HKQuote[]> = {
    id: 'tencent:quotes.hk',
    capability: 'quotes.hk',
    provider: 'tencent',
    priority: 10,
    providedFields: new Set(['price', 'volume', 'amount', 'lotSize', 'totalMarketCap']),
    supports: () => true,
    fetch: async ({ codes }) => {
      const res = await tencent.getHKQuotes(client, codes);
      if (codes.length > 0 && res.length === 0) {
        throw new UpstreamEmptyError('Tencent HK quote response is empty', 'tencent');
      }
      return res;
    },
  };

  const hkEastmoney: SourceAdapter<QuoteBatchInput, HKQuote[]> = {
    id: 'eastmoney:quotes.hk',
    capability: 'quotes.hk',
    provider: 'eastmoney',
    priority: 20,
    providedFields: new Set(['price', 'volume', 'amount', 'totalMarketCap']),
    supports: () => true,
    fetch: ({ codes }) => fetchEmHkQuotes(client, codes),
  };

  const hkSina: SourceAdapter<QuoteBatchInput, HKQuote[]> = {
    id: 'sina:quotes.hk',
    capability: 'quotes.hk',
    provider: 'sina',
    priority: 30,
    providedFields: new Set(['price', 'volume', 'amount']),
    supports: () => true,
    fetch: ({ codes }) => fetchSinaHkQuotes(client, codes),
  };

  const usTencent: SourceAdapter<QuoteBatchInput, USQuote[]> = {
    id: 'tencent:quotes.us',
    capability: 'quotes.us',
    provider: 'tencent',
    priority: 10,
    providedFields: new Set(['price', 'volume', 'amount', 'pe', 'pb', 'totalMarketCap']),
    supports: () => true,
    fetch: async ({ codes }) => {
      const res = await tencent.getUSQuotes(client, codes);
      if (codes.length > 0 && res.length === 0) {
        throw new UpstreamEmptyError('Tencent US quote response is empty', 'tencent');
      }
      return res;
    },
  };

  const usSina: SourceAdapter<QuoteBatchInput, USQuote[]> = {
    id: 'sina:quotes.us',
    capability: 'quotes.us',
    provider: 'sina',
    priority: 20,
    providedFields: new Set(['price', 'volume', 'amount', 'pe', 'totalMarketCap', 'high52w', 'low52w']),
    supports: () => true,
    fetch: ({ codes }) => fetchSinaUsQuotes(client, codes),
  };

  const usEastmoney: SourceAdapter<QuoteBatchInput, USQuote[]> = {
    id: 'eastmoney:quotes.us',
    capability: 'quotes.us',
    provider: 'eastmoney',
    priority: 30,
    providedFields: new Set(['price', 'volume', 'amount', 'pe', 'pb', 'totalMarketCap']),
    supports: () => true,
    fetch: ({ codes }) => fetchEmUsQuotes(client, codes),
  };

  return [
    cnTencent,
    cnSina,
    cnEastmoney,
    cnSimpleTencent,
    cnSimpleEm,
    cnSimpleSina,
    hkTencent,
    hkEastmoney,
    hkSina,
    usTencent,
    usSina,
    usEastmoney,
  ] as SourceAdapter<unknown, unknown>[];
}
