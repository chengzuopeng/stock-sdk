/**
 * 腾讯 Smartbox 搜索接口
 * 支持浏览器（JSONP）和 Node.js（fetch）双端
 */
import { RequestClient } from '../../core/request';
import { SearchResult, type SearchResultType } from '../../types';

/** Smartbox 搜索接口基础 URL */
const SEARCH_URL = 'https://smartbox.gtimg.cn/s3/';

/** 全局变量声明（浏览器环境）*/
declare global {
  interface Window {
    v_hint?: string;
  }
}

/**
 * 解码 Unicode 转义序列
 * @param str 包含 \uXXXX 的字符串
 */
function decodeUnicode(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

/**
 * 把腾讯 Smartbox 返回的原始资产类型字符串归一化为 {@link SearchResultType}
 *
 * 已知的原始类型映射（不区分大小写）：
 * - 股票：`GP` / `GP-A` / `GP-B`              → `'stock'`
 * - 指数：`ZS`                                → `'index'`
 * - 基金：`ETF` / `LOF` / `KJ` / `KJ-HB` /
 *         `KJ-CX` / `QDII` / `QDII-ETF` /
 *         `QDII-LOF` / `QDII-FOF` / `JJ`     → `'fund'`
 * - 债券：`ZQ`                                → `'bond'`
 * - 期货：`QH`                                → `'futures'`
 * - 期权：`QZ` / `OPTION`                     → `'option'`
 * - 其余                                       → `'other'`
 *
 * @param rawType 上游 `SearchResult.type` 原始字符串
 */
export function normalizeSearchType(rawType: string): SearchResultType {
  const upper = rawType.toUpperCase();

  // 顺序很关键：QDII-ETF / QDII-LOF 等以 QDII 开头的复合类型必须先归到基金
  if (
    upper.startsWith('QDII') ||
    upper.startsWith('ETF') ||
    upper.startsWith('LOF') ||
    upper.startsWith('KJ') ||
    upper.startsWith('JJ') ||
    upper.includes('FUND')
  ) {
    return 'fund';
  }

  if (upper.startsWith('GP') || upper.includes('STOCK')) return 'stock';
  if (upper === 'ZS' || upper.includes('INDEX')) return 'index';
  if (upper.startsWith('ZQ') || upper.includes('BOND')) return 'bond';
  if (upper.startsWith('QH') || upper.includes('FUTURE')) return 'futures';
  if (upper.startsWith('QZ') || upper.includes('OPTION')) return 'option';

  return 'other';
}

function parseSearchResult(raw: string): SearchResult[] {
  if (!raw || raw === 'N') return [];

  const records = raw.split('^').filter(Boolean);
  return records.map(record => {
    const fields = record.split('~');
    // 字段: 0-市场, 1-代码, 2-名称, 3-拼音, 4-类型
    const market = fields[0] || '';
    const pureCode = fields[1] || '';
    const name = decodeUnicode(fields[2] || '');
    const type = fields[4] || '';

    return {
      code: market + pureCode,
      name,
      market,
      // 保留上游原始类型字符串以维持向后兼容
      type,
      // 标准化后的资产分类，便于跨数据源统一判断
      category: normalizeSearchType(type),
    };
  });
}

/**
 * 浏览器环境下通过 JSONP 方式请求
 * @param keyword 搜索关键词
 */
function fetchByJsonp(keyword: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `${SEARCH_URL}?v=2&t=all&q=${encodeURIComponent(keyword)}`;

    // 预置全局变量
    window.v_hint = '';

    const script = document.createElement('script');
    script.src = url;
    script.charset = 'utf-8';

    script.onload = () => {
      const result = window.v_hint || '';
      document.body.removeChild(script);
      resolve(result);
    };

    script.onerror = () => {
      document.body.removeChild(script);
      reject(new Error('Network error calling Smartbox'));
    };

    document.body.appendChild(script);
  });
}

/**
 * Node.js 环境下通过 fetch 请求
 * @param client 请求客户端
 * @param keyword 搜索关键词
 */
async function fetchByHttp(
  client: RequestClient,
  keyword: string
): Promise<string> {
  const url = `${SEARCH_URL}?v=2&t=all&q=${encodeURIComponent(keyword)}`;
  const text = await client.get<string>(url);

  // 解析 v_hint="..." 中的内容
  const match = text.match(/v_hint="([^"]*)"/);
  return match ? match[1] : '';
}

/**
 * 判断是否为浏览器环境
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * 搜索股票
 * @param client 请求客户端
 * @param keyword 关键词（股票代码、名称、拼音）
 * @returns 搜索结果数组
 */
export async function search(
  client: RequestClient,
  keyword: string
): Promise<SearchResult[]> {
  if (!keyword || !keyword.trim()) {
    return [];
  }

  let raw: string;

  if (isBrowser()) {
    // 浏览器环境：使用 JSONP
    raw = await fetchByJsonp(keyword);
  } else {
    // Node.js 环境：使用 HTTP
    raw = await fetchByHttp(client, keyword);
  }

  return parseSearchResult(raw);
}
