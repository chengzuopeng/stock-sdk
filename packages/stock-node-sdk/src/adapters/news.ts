/**
 * Node 端财经资讯与上市公司公告双源容错适配器：
 * - 7×24 快讯（news.flash）：东方财富快讯 → 新浪 7×24 财经直播
 * - 上市公司公告（news.announcements）：东方财富公告接口 ↔ 巨潮资讯（CNINFO POST 官方接口）
 */
import {
  addDays,
  buildTimeMeta,
  formatInTz,
  getClientScopedCache,
  MARKET_TZ,
  todayInTz,
  UpstreamEmptyError,
} from '@stock-sdk/core/core';
import { normalizeSymbol } from '@stock-sdk/core/symbols';
import type { SourceAdapter } from '@stock-sdk/core/router';
import type {
  AnnouncementQueryOptions,
  MarketNewsFlash,
  NewsFlashOptions,
  StockAnnouncement,
} from '@stock-sdk/core/types';
import type { NodeHttpClient } from '../transport/nodeHttpClient';

const EM_FAST_NEWS_URL = 'https://np-listapi.eastmoney.com/comm/web/getFastNewsList';
const SINA_724_URL = 'https://zhibo.sina.com.cn/api/zhibo/feed';
const EM_ANNOUNCEMENT_URL = 'https://np-anotice-stock.eastmoney.com/api/security/ann';
const CNINFO_ANNOUNCEMENT_URL = 'http://www.cninfo.com.cn/new/hisAnnouncement/query';
const CNINFO_STOCK_LIST_URL = 'http://www.cninfo.com.cn/new/data/szse_stock.json';
const HKEX_PREFIX_URL = 'https://www1.hkexnews.hk/search/prefix.do';
const HKEX_SEARCH_URL = 'https://www1.hkexnews.hk/search/titleSearchServlet.do';

interface EmFastNewsItem {
  code?: string;
  title?: string;
  summary?: string;
  showTime?: string;
  stockList?: Array<string | { code?: string; stockCode?: string }>;
}

interface EmFastNewsResponse {
  code?: string;
  data?: {
    fastNewsList?: EmFastNewsItem[];
  };
}

interface SinaZhiboItem {
  id?: number | string;
  rich_text?: string;
  create_time?: string;
  docurl?: string;
  tag?: Array<{ name?: string }>;
  ext?: string;
}

interface SinaZhiboResponse {
  result?: {
    status?: { code?: number };
    data?: {
      feed?: {
        list?: SinaZhiboItem[];
      };
    };
  };
}

interface EmAnnouncementItem {
  art_code?: string;
  title?: string;
  title_ch?: string;
  notice_date?: string;
  display_time?: string;
  codes?: Array<{ stock_code?: string; short_name?: string }>;
  columns?: Array<{ column_name?: string }>;
}

interface EmAnnouncementResponse {
  data?: {
    list?: EmAnnouncementItem[];
  };
}

interface CninfoAnnouncementItem {
  secCode?: string;
  secName?: string;
  announcementId?: string;
  announcementTitle?: string;
  announcementTime?: number;
  adjunctUrl?: string;
  adjunctType?: string;
}

interface CninfoAnnouncementResponse {
  announcements?: CninfoAnnouncementItem[] | null;
}

function extractBracketTitle(text: string): string {
  const m = /^【([^】]+)】/.exec(text.trim());
  return m ? m[1].trim() : text.trim().slice(0, 60);
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim();
}

async function fetchEmNewsFlash(
  client: NodeHttpClient,
  options: NewsFlashOptions = {}
): Promise<MarketNewsFlash[]> {
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 20, 100));
  const params = new URLSearchParams({
    client: 'web',
    biz: 'web_724',
    fastColumn: '102',
    sortEnd: '',
    pageSize: String(pageSize),
    req_trace: String(Date.now()),
  });
  const url = `${EM_FAST_NEWS_URL}?${params.toString()}`;
  const json = await client.get<EmFastNewsResponse>(url, {
    responseType: 'json',
    provider: 'eastmoney',
    headers: { Referer: 'https://kuaixun.eastmoney.com/' },
  });
  const list = json?.data?.fastNewsList;
  if (!Array.isArray(list) || list.length === 0) {
    throw new UpstreamEmptyError('Eastmoney fast news list is empty', 'eastmoney', url);
  }
  return list.map((item): MarketNewsFlash => {
    const content = (item.summary ?? item.title ?? '').trim();
    const title = (item.title ?? '').trim() || extractBracketTitle(content);
    const publishedAt = (item.showTime ?? '').trim();
    const meta = buildTimeMeta(publishedAt, MARKET_TZ.CN);
    const relatedCodes = (item.stockList ?? [])
      .map((s) => (typeof s === 'string' ? s : s.code ?? s.stockCode ?? ''))
      .filter(Boolean);
    return {
      id: String(item.code ?? `${publishedAt}-${title.slice(0, 12)}`),
      title,
      content,
      publishedAt,
      timestamp: meta.timestamp,
      tz: meta.tz,
      url: item.code ? `https://finance.eastmoney.com/a/${item.code}.html` : null,
      tags: [],
      relatedCodes,
      source: 'eastmoney',
    };
  });
}

async function fetchSinaNewsFlash(
  client: NodeHttpClient,
  options: NewsFlashOptions = {}
): Promise<MarketNewsFlash[]> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 20, 100));
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    zhibo_id: '152',
    tag_id: '0',
    type: '0',
  });
  const url = `${SINA_724_URL}?${params.toString()}`;
  const json = await client.get<SinaZhiboResponse>(url, {
    responseType: 'json',
    provider: 'sina',
    headers: { Referer: 'https://finance.sina.com.cn/7x24/' },
  });
  const list = json?.result?.data?.feed?.list;
  if (!Array.isArray(list) || list.length === 0) {
    throw new UpstreamEmptyError('Sina 7x24 feed is empty', 'sina', url);
  }
  return list.map((item): MarketNewsFlash => {
    const content = (item.rich_text ?? '').trim();
    const title = extractBracketTitle(content);
    const publishedAt = (item.create_time ?? '').trim();
    const meta = buildTimeMeta(publishedAt, MARKET_TZ.CN);
    const tags = (item.tag ?? []).map((t) => t.name ?? '').filter(Boolean);
    let relatedCodes: string[] = [];
    if (item.ext) {
      try {
        const parsedExt = JSON.parse(item.ext) as { stocks?: Array<{ symbol?: string }> };
        relatedCodes = (parsedExt.stocks ?? [])
          .map((s) => s.symbol ?? '')
          .filter(Boolean);
      } catch {
        // 忽略无效 ext JSON
      }
    }
    return {
      id: String(item.id ?? `${publishedAt}-${title.slice(0, 12)}`),
      title,
      content,
      publishedAt,
      timestamp: meta.timestamp,
      tz: meta.tz,
      url: item.docurl ?? null,
      tags,
      relatedCodes,
      source: 'sina',
    };
  });
}

async function fetchEmAnnouncements(
  client: NodeHttpClient,
  options: AnnouncementQueryOptions = {}
): Promise<StockAnnouncement[]> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 20, 100));
  const params = new URLSearchParams({
    sr: '-1',
    page_size: String(pageSize),
    page_index: String(page),
    ann_type: 'A',
    client_source: 'web',
    f_node: '0',
    s_node: '0',
  });
  if (options.symbol) {
    const ns = normalizeSymbol(options.symbol, { market: 'CN' });
    params.set('stock_list', ns.code);
  }
  const url = `${EM_ANNOUNCEMENT_URL}?${params.toString()}`;
  const json = await client.get<EmAnnouncementResponse>(url, {
    responseType: 'json',
    provider: 'eastmoney',
    headers: { Referer: 'https://data.eastmoney.com/' },
  });
  const list = json?.data?.list;
  if (!Array.isArray(list)) {
    throw new UpstreamEmptyError('Eastmoney announcement response is empty', 'eastmoney', url);
  }
  return list.map((item): StockAnnouncement => {
    const firstStock = item.codes?.[0];
    const publishedAt = (item.notice_date ?? item.display_time ?? '').slice(0, 10);
    const meta = buildTimeMeta(publishedAt, MARKET_TZ.CN);
    const code = firstStock?.stock_code ?? '';
    return {
      id: String(item.art_code ?? ''),
      code,
      name: firstStock?.short_name ?? '',
      title: (item.title_ch ?? item.title ?? '').trim(),
      category: item.columns?.[0]?.column_name ?? null,
      publishedAt,
      timestamp: meta.timestamp,
      url:
        item.art_code && code
          ? `https://data.eastmoney.com/notices/detail/${code}/${item.art_code}.html`
          : null,
      fileType: null,
      source: 'eastmoney',
    };
  });
}

async function resolveCninfoOrgId(
  client: NodeHttpClient,
  code: string
): Promise<string | undefined> {
  const cache = getClientScopedCache<Map<string, string>>(client, 'cninfo:orgid-map', {
    defaultTTL: 24 * 3_600_000,
    maxSize: 2,
  });
  try {
    const map = await cache.getOrFetch('all', async () => {
      const json = await client.get<{ stockList?: Array<{ code?: string; orgId?: string }> }>(
        CNINFO_STOCK_LIST_URL,
        {
          responseType: 'json',
          provider: 'cninfo',
          hostFallback: false,
          retry: { maxRetries: 0 },
        }
      );
      const next = new Map<string, string>();
      for (const item of json?.stockList ?? []) {
        if (item.code && item.orgId) {
          next.set(item.code, item.orgId);
        }
      }
      return next;
    });
    return map.get(code);
  } catch {
    return undefined;
  }
}

async function fetchCninfoAnnouncements(
  client: NodeHttpClient,
  options: AnnouncementQueryOptions = {}
): Promise<StockAnnouncement[]> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 20, 50));
  const targetCode = options.symbol
    ? normalizeSymbol(options.symbol, { market: 'CN' }).code
    : undefined;

  let stockParam = '';
  let searchKey = options.keyword ?? '';
  if (targetCode) {
    const orgId = await resolveCninfoOrgId(client, targetCode);
    if (orgId) {
      stockParam = `${targetCode},${orgId}`;
    } else if (!searchKey) {
      // 无法拿到 orgId 且无 keyword 时回退用 searchkey 检索股票代码
      searchKey = targetCode;
    } else {
      // 同时传了 symbol 与 keyword 但 orgId 字典不可达时，拼接以缩小服务端命中集
      searchKey = `${targetCode} ${searchKey}`;
    }
  }

  const form = new URLSearchParams({
    pageNum: String(page),
    pageSize: String(pageSize),
    column: 'szse',
    tabName: 'fulltext',
    plate: '',
    stock: stockParam,
    searchkey: searchKey,
    secid: '',
    category: '',
    trade: '',
    seDate: '',
    sortName: '',
    sortType: '',
    isHLtitle: 'false',
  });

  const json = await client.post<CninfoAnnouncementResponse>(
    CNINFO_ANNOUNCEMENT_URL,
    form,
    {
      responseType: 'json',
      provider: 'cninfo',
      headers: {
        Referer: 'http://www.cninfo.com.cn/new/commonUrl/pageOfSearch?url=disclosure/list/search',
        Origin: 'http://www.cninfo.com.cn',
      },
    }
  );
  const list = json?.announcements;
  if (!Array.isArray(list)) {
    throw new UpstreamEmptyError(
      'CNINFO announcement response is empty',
      'cninfo',
      CNINFO_ANNOUNCEMENT_URL
    );
  }

  return list
    .filter((item) => !targetCode || item.secCode === targetCode)
    .map((item): StockAnnouncement => {
      const ts = typeof item.announcementTime === 'number' ? item.announcementTime : null;
      // 巨潮 announcementTime 为北京时间当日 00:00 对应的毫秒时间戳（即 UTC 前一日 16:00），
      // 必须按 Asia/Shanghai 格式化，否则直接 toISOString() 会导致日期整体早 1 天。
      const publishedAt = ts !== null ? formatInTz(ts, MARKET_TZ.CN).slice(0, 10) : '';
      return {
        id: String(item.announcementId ?? ''),
        code: item.secCode ?? '',
        name: item.secName ?? '',
        title: stripHtmlTags(item.announcementTitle ?? ''),
        category: null,
        publishedAt,
        timestamp: ts,
        url: item.adjunctUrl ? `https://static.cninfo.com.cn/${item.adjunctUrl}` : null,
        fileType: item.adjunctType ?? null,
        source: 'cninfo',
      };
    });
}

interface HkexAnnouncementRow {
  NEWS_ID?: string;
  STOCK_CODE?: string;
  STOCK_NAME?: string;
  TITLE?: string;
  SHORT_TEXT?: string;
  FILE_TYPE?: string;
  DATE_TIME?: string;
  FILE_LINK?: string;
}

function detectAnnouncementMarket(symbol?: string): 'CN' | 'HK' | 'US' | null {
  if (!symbol) return 'CN';
  try {
    const ns = normalizeSymbol(symbol);
    return ns.market === 'CN' || ns.market === 'HK' || ns.market === 'US' ? ns.market : null;
  } catch {
    return null;
  }
}

function parseHkexDateTime(raw: string): { publishedAt: string; timestamp: number | null } {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}))?/.exec(raw.trim());
  if (!m) return { publishedAt: raw.trim(), timestamp: null };
  const iso = `${m[3]}-${m[2]}-${m[1]}${m[4] ? ` ${m[4]}:00` : ''}`;
  const meta = buildTimeMeta(iso, MARKET_TZ.HK);
  return { publishedAt: iso, timestamp: meta.timestamp };
}

async function resolveHkexStockId(
  client: NodeHttpClient,
  code5: string
): Promise<string> {
  const cache = getClientScopedCache<string>(client, 'hkexnews:stockid', {
    defaultTTL: 7 * 24 * 3_600_000,
    maxSize: 4096,
  });
  return cache.getOrFetch(code5, async () => {
    const params = new URLSearchParams({
      callback: 'callback',
      lang: 'ZH',
      type: 'A',
      name: code5,
      market: 'SEHK',
    });
    const text = await client.get<string>(`${HKEX_PREFIX_URL}?${params.toString()}`, {
      responseType: 'text',
      provider: 'hkexnews',
      hostFallback: false,
    });
    const jsonMatch = /callback\(([\s\S]*)\)/.exec(text);
    if (!jsonMatch) {
      throw new UpstreamEmptyError(`HKEXnews prefix search failed for ${code5}`, 'hkexnews', HKEX_PREFIX_URL);
    }
    const parsed = JSON.parse(jsonMatch[1]) as {
      stockInfo?: Array<{ stockId?: number | string; code?: string }>;
    };
    const hit =
      parsed.stockInfo?.find((item) => item.code === code5) ?? parsed.stockInfo?.[0];
    if (!hit?.stockId) {
      throw new UpstreamEmptyError(`HKEXnews stockId not found for ${code5}`, 'hkexnews', HKEX_PREFIX_URL);
    }
    return String(hit.stockId);
  });
}

async function fetchHkexAnnouncements(
  client: NodeHttpClient,
  options: AnnouncementQueryOptions = {}
): Promise<StockAnnouncement[]> {
  if (!options.symbol) {
    throw new UpstreamEmptyError('HKEXnews requires a HK symbol', 'hkexnews', HKEX_SEARCH_URL);
  }
  const ns = normalizeSymbol(options.symbol, { market: 'HK' });
  const code5 = ns.code.padStart(5, '0');
  const stockId = await resolveHkexStockId(client, code5);

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 20, 50));
  const rowRange = page * pageSize;
  const todayHk = todayInTz(MARKET_TZ.HK);
  const toDate = todayHk.replace(/-/g, '');
  const fromDate = addDays(todayHk, -365).replace(/-/g, '');

  const params = new URLSearchParams({
    sortDir: '0',
    sortByOptions: 'DateTime',
    category: '0',
    market: 'SEHK',
    stockId,
    documentType: '-1',
    fromDate,
    toDate,
    title: options.keyword ?? '',
    searchType: '0',
    t1code: '-2',
    t2Gcode: '-2',
    t2code: '-2',
    rowRange: String(rowRange),
    lang: 'zh',
  });
  const url = `${HKEX_SEARCH_URL}?${params.toString()}`;
  const resp = await client.get<{ result?: string }>(url, {
    responseType: 'json',
    provider: 'hkexnews',
    hostFallback: false,
  });
  if (typeof resp?.result !== 'string') {
    throw new UpstreamEmptyError(`HKEXnews invalid payload for ${code5}`, 'hkexnews', url);
  }
  const rawList = JSON.parse(resp.result) as HkexAnnouncementRow[];
  if (!Array.isArray(rawList)) {
    throw new UpstreamEmptyError(`HKEXnews invalid array payload for ${code5}`, 'hkexnews', url);
  }
  if (rawList.length === 0) {
    return [];
  }

  const slice = rawList.slice((page - 1) * pageSize, page * pageSize);
  return slice.map((item): StockAnnouncement => {
    const dt = parseHkexDateTime(item.DATE_TIME ?? '');
    const firstCode = stripHtmlTags((item.STOCK_CODE ?? code5).split('<br')[0]).trim() || code5;
    const firstName = stripHtmlTags((item.STOCK_NAME ?? '').split('<br')[0]).trim();
    const category = stripHtmlTags(item.SHORT_TEXT ?? '').trim() || null;
    const link = item.FILE_LINK
      ? item.FILE_LINK.startsWith('http')
        ? item.FILE_LINK
        : `https://www1.hkexnews.hk${item.FILE_LINK}`
      : null;
    return {
      id: String(item.NEWS_ID ?? ''),
      code: firstCode,
      name: firstName,
      title: stripHtmlTags(item.TITLE ?? '').trim(),
      category,
      publishedAt: dt.publishedAt,
      timestamp: dt.timestamp,
      url: link,
      fileType: item.FILE_TYPE ?? null,
      source: 'hkexnews',
    };
  });
}

/**
 * 创建财经快讯与上市公司公告多源适配器（A 股：东财/巨潮；港股：港交所披露易）。
 */
export function createNodeNewsAdapters(
  client: NodeHttpClient
): SourceAdapter<unknown, unknown>[] {
  const flashEastmoney: SourceAdapter<NewsFlashOptions, MarketNewsFlash[]> = {
    id: 'eastmoney:news.flash',
    capability: 'news.flash',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['id', 'title', 'content', 'publishedAt', 'url']),
    // 东财快讯接口不支持传统页码翻页，page > 1 时交由支持翻页的新浪 7×24 处理
    supports: (opts) => (opts.page ?? 1) === 1,
    fetch: (opts) => fetchEmNewsFlash(client, opts),
  };

  const flashSina: SourceAdapter<NewsFlashOptions, MarketNewsFlash[]> = {
    id: 'sina:news.flash',
    capability: 'news.flash',
    provider: 'sina',
    priority: 20,
    providedFields: new Set(['id', 'title', 'content', 'publishedAt', 'url', 'tags']),
    supports: () => true,
    fetch: (opts) => fetchSinaNewsFlash(client, opts),
  };

  const annEastmoney: SourceAdapter<AnnouncementQueryOptions, StockAnnouncement[]> = {
    id: 'eastmoney:news.announcements',
    capability: 'news.announcements',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['id', 'code', 'name', 'title', 'category', 'publishedAt', 'url']),
    // 东财公告仅覆盖 A 股且不支持关键词搜索
    supports: (opts) => !opts.keyword && detectAnnouncementMarket(opts.symbol) === 'CN',
    fetch: (opts) => fetchEmAnnouncements(client, opts),
  };

  const annCninfo: SourceAdapter<AnnouncementQueryOptions, StockAnnouncement[]> = {
    id: 'cninfo:news.announcements',
    capability: 'news.announcements',
    provider: 'cninfo',
    priority: 20,
    providedFields: new Set(['id', 'code', 'name', 'title', 'publishedAt', 'url', 'fileType']),
    supports: (opts) => detectAnnouncementMarket(opts.symbol) === 'CN',
    fetch: (opts) => fetchCninfoAnnouncements(client, opts),
  };

  const annHkex: SourceAdapter<AnnouncementQueryOptions, StockAnnouncement[]> = {
    id: 'hkexnews:news.announcements',
    capability: 'news.announcements',
    provider: 'hkexnews',
    priority: 10,
    providedFields: new Set(['id', 'code', 'name', 'title', 'category', 'publishedAt', 'url', 'fileType']),
    supports: (opts) => Boolean(opts.symbol) && detectAnnouncementMarket(opts.symbol) === 'HK',
    fetch: (opts) => fetchHkexAnnouncements(client, opts),
  };

  return [
    flashEastmoney,
    flashSina,
    annEastmoney,
    annCninfo,
    annHkex,
  ] as SourceAdapter<unknown, unknown>[];
}
