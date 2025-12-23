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
  return data
    .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
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
  return data
    .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
    .map((d) => parsePanelLargeOrder(d.fields));
}

