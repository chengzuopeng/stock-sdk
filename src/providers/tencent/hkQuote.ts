/**
 * 腾讯财经 - 港股行情
 */
import { RequestClient } from '../../core';
import type { HKQuote } from '../../types';
import { parseHKQuote } from './parsers';

/**
 * 获取港股行情
 * @param client 请求客户端
 * @param codes 港股代码数组，如 ['09988', '00700']
 */
export async function getHKQuotes(
  client: RequestClient,
  codes: string[]
): Promise<HKQuote[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  const prefixedCodes = codes.map((code) => `hk${code}`);
  const data = await client.getTencentQuote(prefixedCodes.join(','));
  return data
    .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
    .map((d) => parseHKQuote(d.fields));
}

