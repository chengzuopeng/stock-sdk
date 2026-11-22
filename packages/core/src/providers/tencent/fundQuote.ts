/**
 * 腾讯财经 - 基金行情
 */
import { RequestClient } from '../../core';
import type { FundQuote } from '../../types';
import { parseFundQuote, filterTencentRows, FUND_QUOTE_MIN_FIELDS } from './parsers';

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
  // 腾讯无匹配时会返回 v_pv_none_match="1"（fields=['1']），按 key 精确过滤；
  // 同时校验字段长度满足 parseFundQuote 所需（最高访问 f[8]）。
  const wanted = new Set(prefixedCodes);
  return filterTencentRows(data, wanted, FUND_QUOTE_MIN_FIELDS).map((d) =>
    parseFundQuote(d.fields)
  );
}

