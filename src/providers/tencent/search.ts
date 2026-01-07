/**
 * 腾讯 Smartbox 搜索接口
 * 支持浏览器（JSONP）和 Node.js（fetch）双端
 */
import { RequestClient } from '../../core/request';
import { SearchResult } from '../../types';

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
 * 解析 Smartbox 返回的原始字符串
 * @param raw 原始字符串 "sh~600519~贵州茅台~gzmt~GP-A^..."
 */
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
      type,
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
