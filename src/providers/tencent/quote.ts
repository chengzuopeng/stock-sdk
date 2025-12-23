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
  return data
    .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
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
  return data
    .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
    .map((d) => parseSimpleQuote(d.fields));
}

