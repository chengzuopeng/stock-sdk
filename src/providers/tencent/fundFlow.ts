/**
 * 腾讯财经 - 资金流向
 */
import { RequestClient } from '../../core';
import type { FundFlow, PanelLargeOrder } from '../../types';
import { parseFundFlow, parsePanelLargeOrder } from './parsers';

/**
 * 获取资金流向
 * @param client 请求客户端
 * @param codes 股票代码数组，如 ['sz000858', 'sh600000']
 */
export async function getFundFlow(
  client: RequestClient,
  codes: string[]
): Promise<FundFlow[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  const prefixedCodes = codes.map((code) => `ff_${code}`);
  const data = await client.getTencentQuote(prefixedCodes.join(','));
  // 腾讯无匹配时会返回 v_pv_none_match="1"，按 key 精确过滤；
  // parseFundFlow 最高访问 f[13]，要求至少 14 个字段。
  const wanted = new Set(prefixedCodes);
  return data
    .filter(
      (d) =>
        wanted.has(d.key) &&
        d.fields &&
        d.fields.length >= 14 &&
        d.fields[0] !== ''
    )
    .map((d) => parseFundFlow(d.fields));
}

/**
 * 获取盘口大单占比
 * @param client 请求客户端
 * @param codes 股票代码数组，如 ['sz000858', 'sh600000']
 */
export async function getPanelLargeOrder(
  client: RequestClient,
  codes: string[]
): Promise<PanelLargeOrder[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  const prefixedCodes = codes.map((code) => `s_pk${code}`);
  const data = await client.getTencentQuote(prefixedCodes.join(','));
  // 腾讯无匹配时会返回 v_pv_none_match="1"（fields=['1']），仅靠 fields[0]
  // 无法识别——它会被解析成 buyLargeRatio: 1 的伪结果。
  // parsePanelLargeOrder 最高访问 f[3]，要求至少 4 个字段。
  const wanted = new Set(prefixedCodes);
  return data
    .filter(
      (d) =>
        wanted.has(d.key) &&
        d.fields &&
        d.fields.length >= 4 &&
        d.fields[0] !== ''
    )
    .map((d) => parsePanelLargeOrder(d.fields));
}

