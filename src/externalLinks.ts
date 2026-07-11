import { normalizeSymbol } from './symbols';
import type { Market, NormalizedSymbol } from './symbols';
import type { ExternalLink, SearchResult } from './types';

type LinkMarket = 'sh' | 'sz' | 'hk' | 'us' | 'global';

interface NormalizedSearchTarget {
  code: string;
  market: LinkMarket | 'unknown';
}

/** 腾讯数字市场码 → 外链市场(smartbox 等上游 market 字段的语义,保留) */
const TENCENT_MARKET_MAP: Record<string, LinkMarket> = {
  '0': 'sz',
  '1': 'sh',
  '100': 'global',
  '105': 'us',
  '116': 'hk',
};

/** 外链市场 → symbols 层市场 hint(sh/sz 同属 CN,sh/sz 维度由 market 字段保留) */
const LINK_MARKET_HINT: Record<Exclude<LinkMarket, 'global'>, Market> = {
  sh: 'CN',
  sz: 'CN',
  hk: 'HK',
  us: 'US',
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

function isLinkMarket(value: string): value is LinkMarket {
  return (
    value === 'sh' ||
    value === 'sz' ||
    value === 'hk' ||
    value === 'us' ||
    value === 'global'
  );
}

/**
 * symbols 层解析结果 → 外链市场(无 market hint 时使用)。
 * - CN 由 exchange 区分 sh/sz;BSE 保持现状:TENCENT_MARKET_MAP 没有 bj、
 *   旧 fallback 正则也只认 sh/sz,北交所标的一律 unknown 走搜索兜底
 * - GLOBAL 仅期货 hint 路径可能产出,这里为映射完整性保留
 */
function toLinkMarket(ns: NormalizedSymbol): LinkMarket | 'unknown' {
  switch (ns.market) {
    case 'CN':
      if (ns.exchange === 'SSE') return 'sh';
      if (ns.exchange === 'SZSE') return 'sz';
      return 'unknown';
    case 'HK':
      return 'hk';
    case 'US':
      return 'us';
    case 'GLOBAL':
      return 'global';
    default:
      return 'unknown';
  }
}

/**
 * 从搜索结果中提取可用于外链的市场和代码。
 *
 * F40:符号解析改走 src/symbols 的 normalizeSymbol,不再维护与 symbols 层
 * 平行的前缀剥离 / padStart 实现(双前缀等 symbols 层修复从此直达链接生成):
 * - market 维度:腾讯数字市场码('0'/'1'/'100'/'105'/'116')与 sh/sz/hk/us/
 *   global 字符串优先映射(上游 market 字段语义保留;与 code 解析结果冲突时
 *   以 market 字段为准);无法识别时由 normalizeSymbol 的解析结果推断
 * - code 维度:经 normalizeSymbol 归一(前缀剥离/HK 补零/secid 形式/大小写);
 *   解析失败或非股票资产(期货/板块)一律 unknown 走搜索兜底,
 *   不再拼出必失效的行情页链接
 * @param result 搜索结果
 */
function normalizeSearchTarget(result: SearchResult): NormalizedSearchTarget {
  const rawCode = result.code.trim();
  const rawMarket = result.market.trim().toLowerCase();
  const mapped = TENCENT_MARKET_MAP[result.market] ?? rawMarket;
  const hinted = isLinkMarket(mapped) ? mapped : undefined;

  // 'global' 特有逻辑保留:全球指数代码(IXIC/NDX 等)不是股票符号,
  // 不走 normalizeSymbol,仅剥 secid 数字前缀并大写
  if (hinted === 'global') {
    return {
      code: rawCode.replace(/^\d{3}\./, '').toUpperCase(),
      market: 'global',
    };
  }

  // R7-1: 本地 us 前缀预剥离已收编进 symbols 层 —— normalizeSymbol 的规范形
  // 规则现已覆盖带点 rest（'usAAPL.OQ'/'usBRK.A'），且能区分 'USB' 这类真实
  // ticker（大写前缀不剥）。不再维护平行实现,symbols 层的前缀修复从此直达链接生成。
  try {
    const ns = normalizeSymbol(
      rawCode,
      hinted ? { market: LINK_MARKET_HINT[hinted] } : undefined
    );
    // 期货/板块等非股票符号:旧实现一律 unknown 走搜索兜底,保持
    if (ns.assetType !== 'stock') {
      return { code: rawCode, market: 'unknown' };
    }
    const market = hinted ?? toLinkMarket(ns);
    if (market === 'unknown') {
      return { code: rawCode, market: 'unknown' };
    }
    // 旧实现的 us 分支始终大写,而 normalizeSymbol 的 secid 路径
    // ('105.msft')不大写右半部,这里补齐以保持输出一致
    return {
      code: ns.market === 'US' ? ns.code.toUpperCase() : ns.code,
      market,
    };
  } catch {
    return { code: rawCode, market: 'unknown' };
  }
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
