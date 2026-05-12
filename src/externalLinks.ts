import type { ExternalLink, SearchResult } from './types';

type LinkMarket = 'sh' | 'sz' | 'hk' | 'us' | 'global';

interface NormalizedSearchTarget {
  code: string;
  market: LinkMarket | 'unknown';
}

const TENCENT_MARKET_MAP: Record<string, LinkMarket> = {
  '0': 'sz',
  '1': 'sh',
  '100': 'global',
  '105': 'us',
  '116': 'hk',
};

const XUEQIU_GLOBAL_INDEX_MAP: Record<string, string> = {
  IXIC: '.IXIC',
  NDX: '.NDX',
  NDX100: '.NDX',
};

const EASTMONEY_GLOBAL_INDEX_MAP: Record<string, string> = {
  IXIC: 'NDX',
  NDX: 'NDX',
  NDX100: 'NDX',
};

/**
 * 从搜索结果中提取可用于外链的市场和代码。
 * @param result 搜索结果
 */
function normalizeSearchTarget(result: SearchResult): NormalizedSearchTarget {
  const rawCode = result.code.trim();
  const rawMarket = result.market.trim().toLowerCase();
  const market = TENCENT_MARKET_MAP[result.market] ?? rawMarket;

  if (market === 'sh' || market === 'sz') {
    return {
      code: rawCode.replace(/^(sh|sz)/i, ''),
      market,
    };
  }

  if (market === 'hk') {
    return {
      code: rawCode.replace(/^hk/i, '').padStart(5, '0'),
      market,
    };
  }

  if (market === 'us') {
    return {
      code: rawCode.replace(/^us/i, '').replace(/^\d{3}\./, '').toUpperCase(),
      market,
    };
  }

  if (market === 'global') {
    return {
      code: rawCode.replace(/^\d{3}\./, '').toUpperCase(),
      market,
    };
  }

  if (/^sh\d{6}$/i.test(rawCode)) {
    return { code: rawCode.slice(2), market: 'sh' };
  }

  if (/^sz\d{6}$/i.test(rawCode)) {
    return { code: rawCode.slice(2), market: 'sz' };
  }

  if (/^hk\d{5}$/i.test(rawCode)) {
    return { code: rawCode.slice(2), market: 'hk' };
  }

  if (/^us[A-Z.]+$/i.test(rawCode)) {
    return { code: rawCode.slice(2).toUpperCase(), market: 'us' };
  }

  return { code: rawCode, market: 'unknown' };
}

/**
 * 判断 A 股代码是否应使用东方财富指数页面。
 * @param code 纯数字代码
 * @param market 市场
 */
function isCnIndex(code: string, market: LinkMarket): boolean {
  return (
    (market === 'sh' && code.startsWith('000')) ||
    (market === 'sz' && code.startsWith('399'))
  );
}

/**
 * 生成东方财富外链，未知市场退回站内搜索。
 * @param target 标准化后的搜索标的
 */
function buildEastMoneyUrl(target: NormalizedSearchTarget): string {
  const { code, market } = target;

  if ((market === 'sh' || market === 'sz') && isCnIndex(code, market)) {
    return `https://quote.eastmoney.com/zs${code}.html`;
  }

  if (market === 'sh' || market === 'sz') {
    return `https://quote.eastmoney.com/${market}${code}.html`;
  }

  if (market === 'hk') {
    return `https://quote.eastmoney.com/hk/${code}.html`;
  }

  if (market === 'us') {
    return `https://quote.eastmoney.com/us/${code}.html`;
  }

  if (market === 'global') {
    const eastMoneyCode = EASTMONEY_GLOBAL_INDEX_MAP[code] ?? code;
    return `https://quote.eastmoney.com/gb/zs${eastMoneyCode}.html`;
  }

  return `https://so.eastmoney.com/web/s?keyword=${encodeURIComponent(code)}`;
}

/**
 * 生成雪球外链，未知市场退回站内搜索。
 * @param target 标准化后的搜索标的
 */
function buildXueqiuUrl(target: NormalizedSearchTarget): string {
  const { code, market } = target;

  if (market === 'sh' || market === 'sz') {
    return `https://xueqiu.com/S/${market.toUpperCase()}${code}`;
  }

  if (market === 'hk') {
    return `https://xueqiu.com/S/${code}`;
  }

  if (market === 'us') {
    return `https://xueqiu.com/S/${code}`;
  }

  if (market === 'global') {
    const xueqiuCode = XUEQIU_GLOBAL_INDEX_MAP[code] ?? code;
    return `https://xueqiu.com/S/${xueqiuCode}`;
  }

  return `https://xueqiu.com/k?q=${encodeURIComponent(code)}`;
}

/**
 * 根据搜索结果生成外部财经站点链接。
 * @param result 搜索结果
 * @returns 东方财富、雪球链接列表；未知市场退回站内搜索链接
 */
export function generateSearchExternalLinks(result: SearchResult): ExternalLink[] {
  const target = normalizeSearchTarget(result);

  return [
    {
      name: '东方财富',
      url: buildEastMoneyUrl(target),
    },
    {
      name: '雪球',
      url: buildXueqiuUrl(target),
    },
  ];
}
