/**
 * 腾讯财经 - 美股行情
 */
import { RequestClient } from '../../core';
import type { USQuote } from '../../types';
import { parseUSQuote } from './parsers';

/**
 * 获取美股行情
 * @param client 请求客户端
 * @param codes 美股代码数组，如 ['BABA', 'AAPL']
 */
export async function getUSQuotes(
  client: RequestClient,
  codes: string[]
): Promise<USQuote[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  const prefixedCodes = codes.map((code) => `us${code}`);
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
    .map((d) => parseUSQuote(d.fields));
}

