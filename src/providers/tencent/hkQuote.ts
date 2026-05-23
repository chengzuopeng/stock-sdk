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
  // 腾讯无匹配时会回 v_pv_none_match="1"，按 key 精确过滤
  const wanted = new Set(prefixedCodes);
  return data
    .filter(
      (d) =>
        wanted.has(d.key) &&
        d.fields &&
        d.fields.length > 5 &&
        d.fields[0] !== ''
    )
    .map((d) => parseHKQuote(d.fields));
}

