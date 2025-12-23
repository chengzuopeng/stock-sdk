/**
 * 腾讯财经 - 基金行情
 */
import { RequestClient } from '../../core';
import type { FundQuote } from '../../types';
import { parseFundQuote } from './parsers';

/**
 * 获取公募基金行情
 * @param client 请求客户端
 * @param codes 基金代码数组，如 ['000001', '110011']
 */
export async function getFundQuotes(
  client: RequestClient,
  codes: string[]
): Promise<FundQuote[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  const prefixedCodes = codes.map((code) => `jj${code}`);
  const data = await client.getTencentQuote(prefixedCodes.join(','));
  return data
    .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
    .map((d) => parseFundQuote(d.fields));
}

