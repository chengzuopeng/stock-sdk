/**
 * Node 端多源 K 线适配器：
 * - A 股历史/分钟 K 线复用 core 三源（东财 / 腾讯 / 新浪），在 Node 端默认启用 strictCapabilities 杜绝复权漂移；
 * - 港股/美股历史 K 线新增腾讯备源（hkfqkline / usfqkline），与东财双源自动容错。
 */
import {
  addDays,
  buildTimeMeta,
  MARKET_TZ,
  toNumberSafe,
  UpstreamEmptyError,
  UpstreamError,
} from '@stock-sdk/core/core';
import { eastmoney } from '@stock-sdk/core/providers';
import {
  createUniversalCnKlineAdapters,
  type HKHistoryKlineInput,
  type USHistoryKlineInput,
} from '@stock-sdk/core/sdk/klineService';
import { normalizeSymbol } from '@stock-sdk/core/symbols';
import type { SourceAdapter } from '@stock-sdk/core/router';
import type { HKHistoryKline, USHistoryKline } from '@stock-sdk/core/types';
import type { NodeHttpClient } from '../transport/nodeHttpClient';

export type { HKHistoryKlineInput, USHistoryKlineInput };

const TENCENT_HK_KLINE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/hkfqkline/get';
const TENCENT_US_KLINE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/usfqkline/get';
const FOREIGN_PAGE_SIZE = 640;
const FOREIGN_MAX_PAGES = 40;

interface TencentForeignKlineResponse {
  code?: number;
  msg?: string;
  data?: Record<string, Record<string, unknown>>;
}

function toIsoDate(value?: string): string {
  if (!value) return '';
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(value.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : value.slice(0, 10);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

function periodKeyOf(period: 'daily' | 'weekly' | 'monthly'): string {
  return period === 'daily' ? 'day' : period === 'weekly' ? 'week' : 'month';
}

function parseTencentForeignRows(
  rows: unknown
): Array<{
  date: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  turnoverRate: number | null;
  amount: number | null;
}> {
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const raw of rows) {
    if (!Array.isArray(raw) || typeof raw[0] !== 'string') continue;
    // 港股行附带 [7]=turnoverRate, [8]=amount(万元)；美股通常只有 6 列
    const amountWan = raw.length >= 9 ? toNumberSafe(raw[8]) : null;
    out.push({
      date: raw[0],
      open: toNumberSafe(raw[1]),
      close: toNumberSafe(raw[2]),
      high: toNumberSafe(raw[3]),
      low: toNumberSafe(raw[4]),
      volume: toNumberSafe(raw[5]),
      turnoverRate: raw.length >= 8 ? toNumberSafe(raw[7]) : null,
      amount: amountWan === null ? null : round2(amountWan * 10_000),
    });
  }
  return out;
}

async function fetchTencentPagedForeignRows(
  client: NodeHttpClient,
  baseUrl: string,
  key: string,
  pKey: string,
  adjust: '' | 'qfq' | 'hfq',
  start: string,
  end: string
): Promise<{
  rows: ReturnType<typeof parseTencentForeignRows>;
  name: string;
  nodePresent: boolean;
}> {
  const byDate = new Map<string, ReturnType<typeof parseTencentForeignRows>[number]>();
  let currentEnd = end;
  let name = '';
  let nodePresent = false;

  for (let page = 0; page < FOREIGN_MAX_PAGES; page++) {
    const params = new URLSearchParams({
      param: [key, pKey, start, currentEnd, String(FOREIGN_PAGE_SIZE), adjust].join(','),
    });
    const url = `${baseUrl}?${params.toString()}`;
    const json = await client.get<TencentForeignKlineResponse>(url, {
      responseType: 'json',
      provider: 'tencent',
    });
    if (json.code !== undefined && json.code !== 0) {
      throw new UpstreamError(
        `Tencent foreign K-line failed: ${json.msg || json.code}`,
        'tencent',
        url
      );
    }
    const node = json.data?.[key];
    if (!node) {
      break;
    }
    nodePresent = true;
    if (!name) {
      const qt = node.qt as Record<string, string[]> | undefined;
      name = qt?.[key]?.[1] ?? '';
    }
    const batch = parseTencentForeignRows(node[adjust ? `${adjust}${pKey}` : pKey] ?? node[pKey]);
    if (batch.length === 0) {
      break;
    }
    let added = 0;
    for (const row of batch) {
      if (!byDate.has(row.date)) {
        byDate.set(row.date, row);
        added++;
      }
    }
    const earliest = batch[0].date;
    if (batch.length < FOREIGN_PAGE_SIZE || earliest <= start || added === 0) {
      break;
    }
    currentEnd = addDays(earliest, -1);
    if (currentEnd < start) {
      break;
    }
  }

  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { rows, name, nodePresent };
}

async function fetchTencentHkHistoryKline(
  client: NodeHttpClient,
  symbol: string,
  options: eastmoney.HKKlineOptions = {}
): Promise<HKHistoryKline[]> {
  const ns = normalizeSymbol(symbol, { market: 'HK' });
  const hkCode = ns.code.padStart(5, '0');
  const key = `hk${hkCode}`;
  const period = options.period ?? 'daily';
  const adjust = options.adjust ?? 'qfq';
  const pKey = periodKeyOf(period);
  const start = toIsoDate(options.startDate) || '1990-01-01';
  const end = toIsoDate(options.endDate) || '2050-01-01';

  const { rows, name, nodePresent } = await fetchTencentPagedForeignRows(
    client,
    TENCENT_HK_KLINE_URL,
    key,
    pKey,
    adjust,
    start,
    end
  );
  if (!nodePresent) {
    throw new UpstreamEmptyError('Tencent HK K-line payload missing', 'tencent', TENCENT_HK_KLINE_URL);
  }

  return rows
    .map((row, idx): HKHistoryKline => {
      const prevClose = idx > 0 ? rows[idx - 1].close : null;
      const change =
        row.close !== null && prevClose !== null ? round3(row.close - prevClose) : null;
      const changePercent =
        change !== null && prevClose !== null && prevClose !== 0
          ? round2((change / prevClose) * 100)
          : null;
      const amplitude =
        row.high !== null && row.low !== null && prevClose !== null && prevClose !== 0
          ? round2(((row.high - row.low) / prevClose) * 100)
          : null;
      const meta = buildTimeMeta(row.date, MARKET_TZ.HK);
      return {
        date: row.date,
        timestamp: meta.timestamp,
        tz: meta.tz,
        code: hkCode,
        name,
        open: row.open,
        close: row.close,
        high: row.high,
        low: row.low,
        volume: row.volume,
        amount: row.amount,
        amplitude,
        changePercent,
        change,
        turnoverRate: row.turnoverRate,
        currency: 'HKD',
        lotSize: null,
      };
    })
    .filter((r) => r.date >= start && r.date <= end);
}

async function fetchTencentUsHistoryKline(
  client: NodeHttpClient,
  symbol: string,
  options: eastmoney.USKlineOptions = {}
): Promise<USHistoryKline[]> {
  const ns = normalizeSymbol(symbol, { market: 'US' });
  const code = ns.code.toUpperCase();
  const period = options.period ?? 'daily';
  const adjust = options.adjust ?? 'qfq';
  const pKey = periodKeyOf(period);
  const start = toIsoDate(options.startDate) || '1990-01-01';
  const end = toIsoDate(options.endDate) || '2050-01-01';

  // 腾讯美股代码带交易所后缀：.OQ (NASDAQ) / .N (NYSE) / .AM (AMEX)
  const suffixes =
    ns.exchange === 'NYSE'
      ? ['.N', '.OQ', '.AM']
      : ns.exchange === 'AMEX'
        ? ['.AM', '.N', '.OQ']
        : ['.OQ', '.N', '.AM'];

  let anyValidNode = false;
  for (const suffix of suffixes) {
    const key = `us${code}${suffix}`;
    const { rows, name: rawName, nodePresent } = await fetchTencentPagedForeignRows(
      client,
      TENCENT_US_KLINE_URL,
      key,
      pKey,
      adjust,
      start,
      end
    );
    if (!nodePresent) continue;
    anyValidNode = true;
    if (rows.length === 0) continue;

    const name = rawName || code;
    return rows
      .map((row, idx): USHistoryKline => {
        const prevClose = idx > 0 ? rows[idx - 1].close : null;
        const change =
          row.close !== null && prevClose !== null ? round3(row.close - prevClose) : null;
        const changePercent =
          change !== null && prevClose !== null && prevClose !== 0
            ? round2((change / prevClose) * 100)
            : null;
        const amplitude =
          row.high !== null && row.low !== null && prevClose !== null && prevClose !== 0
            ? round2(((row.high - row.low) / prevClose) * 100)
            : null;
        const meta = buildTimeMeta(row.date, MARKET_TZ.US);
        return {
          date: row.date,
          timestamp: meta.timestamp,
          tz: meta.tz,
          code,
          name,
          open: row.open,
          close: row.close,
          high: row.high,
          low: row.low,
          volume: row.volume,
          amount: row.amount,
          amplitude,
          changePercent,
          change,
          turnoverRate: row.turnoverRate,
          currency: 'USD',
        };
      })
      .filter((r) => r.date >= start && r.date <= end);
  }

  if (anyValidNode) {
    return [];
  }

  throw new UpstreamEmptyError(
    `Tencent US K-line payload missing for ${code}`,
    'tencent',
    TENCENT_US_KLINE_URL
  );
}

/**
 * 创建全部多源 K 线适配器（A 股三源 + 港美股多源）。
 */
export function createNodeKlineAdapters(
  client: NodeHttpClient
): SourceAdapter<unknown, unknown>[] {
  const cnAdapters = createUniversalCnKlineAdapters(client);

  const hkEastmoney: SourceAdapter<HKHistoryKlineInput, HKHistoryKline[]> = {
    id: 'eastmoney:kline.hk.history',
    capability: 'kline.hk.history',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['open', 'close', 'high', 'low', 'volume', 'amount', 'turnoverRate']),
    supports: () => true,
    fetch: (input, ctx) =>
      eastmoney.getHKHistoryKline(client, input.symbol, input.options, {
        requireData: ctx.hasFallback,
        hostFallback: false,
        ...(ctx.hasFallback ? { retry: { maxRetries: 0 } } : {}),
      }),
  };

  const hkTencent: SourceAdapter<HKHistoryKlineInput, HKHistoryKline[]> = {
    id: 'tencent:kline.hk.history',
    capability: 'kline.hk.history',
    provider: 'tencent',
    priority: 20,
    providedFields: new Set(['open', 'close', 'high', 'low', 'volume', 'amount', 'turnoverRate']),
    supports: () => true,
    fetch: (input) => fetchTencentHkHistoryKline(client, input.symbol, input.options),
  };

  const usEastmoney: SourceAdapter<USHistoryKlineInput, USHistoryKline[]> = {
    id: 'eastmoney:kline.us.history',
    capability: 'kline.us.history',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['open', 'close', 'high', 'low', 'volume', 'amount', 'turnoverRate']),
    supports: () => true,
    fetch: async (input, ctx) => {
      try {
        return await eastmoney.getUSHistoryKline(client, input.symbol, input.options, {
          requireData: ctx.hasFallback,
          hostFallback: false,
          ...(ctx.hasFallback ? { retry: { maxRetries: 0 } } : {}),
        });
      } catch (err) {
        // 当腾讯美股代码表与东财探测均因网络/软限流不可用时，resolveUsSecid 可能误抛 NotFoundError；
        // 若仍有备用源（腾讯/CNBC/Nasdaq）且输入本身是合法美股代码形态，允许作为可降级错误尝试备源。
        if (
          ctx.hasFallback &&
          err instanceof Error &&
          (err as { code?: string }).code === 'NOT_FOUND'
        ) {
          throw new UpstreamEmptyError(err.message, 'eastmoney');
        }
        throw err;
      }
    },
  };

  const usTencent: SourceAdapter<USHistoryKlineInput, USHistoryKline[]> = {
    id: 'tencent:kline.us.history',
    capability: 'kline.us.history',
    provider: 'tencent',
    priority: 20,
    providedFields: new Set(['open', 'close', 'high', 'low', 'volume']),
    supports: () => true,
    fetch: (input) => fetchTencentUsHistoryKline(client, input.symbol, input.options),
  };

  return [
    ...cnAdapters,
    hkEastmoney as SourceAdapter<unknown, unknown>,
    hkTencent as SourceAdapter<unknown, unknown>,
    usEastmoney as SourceAdapter<unknown, unknown>,
    usTencent as SourceAdapter<unknown, unknown>,
  ];
}
