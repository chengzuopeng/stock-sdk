/**
 * 腾讯财经 - A 股行情
 */
import { RequestClient } from '../../core';
import type { FullQuote, SimpleQuote } from '../../types';
import { parseFullQuote, parseSimpleQuote } from './parsers';

/**
 * 获取 A 股 / 指数 全量行情
 * @param client 请求客户端
 * @param codes 股票代码数组，如 ['sz000858', 'sh600000']
 */
export async function getFullQuotes(
  client: RequestClient,
  codes: string[]
): Promise<FullQuote[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  const data = await client.getTencentQuote(codes.join(','));
  // 腾讯无匹配时会返回 v_pv_none_match="1"（fields=['1']），靠 fields[0]
  // 过滤拦不住；这里改成只接受我们请求过的 key，彻底避免"空壳行情"。
  const wanted = new Set(codes);
  return data
    .filter(
      (d) =>
        wanted.has(d.key) &&
        d.fields &&
        d.fields.length > 5 &&
        d.fields[0] !== ''
    )
    .map((d) => parseFullQuote(d.fields));
}

/**
 * 获取简要行情
 * @param client 请求客户端
 * @param codes 股票代码数组，如 ['sz000858', 'sh000001']
 */
export async function getSimpleQuotes(
  client: RequestClient,
  codes: string[]
): Promise<SimpleQuote[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  const prefixedCodes = codes.map((code) => `s_${code}`);
  const data = await client.getTencentQuote(prefixedCodes.join(','));
  const wanted = new Set(prefixedCodes);
  return data
    .filter(
      (d) =>
        wanted.has(d.key) &&
        d.fields &&
        d.fields.length > 5 &&
        d.fields[0] !== ''
    )
    .map((d) => parseSimpleQuote(d.fields));
}

