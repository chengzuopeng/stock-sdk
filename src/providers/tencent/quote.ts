/**
 * 腾讯财经 - A 股行情
 */
import { RequestClient } from '../../core';
import type { FullQuote, SimpleQuote } from '../../types';
import { tryToTencentSymbols } from '../../symbols';
import { parseFullQuote, parseSimpleQuote } from './parsers';

/**
 * 获取 A 股 / 指数 全量行情
 * @param client 请求客户端
 * @param codes 股票代码数组，带不带交易所前缀均可（'600036' / 'sh600519' /
 *   'SZ000858'）；指数需带前缀（'sh000001'）。无法映射的代码跳过不报错。
 */
export async function getFullQuotes(
  client: RequestClient,
  codes: string[]
): Promise<FullQuote[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  // R7-2: 入口容错归一 —— 上游 qt.gtimg 只认 sh/sz/bj 前缀形，裸代码会被
  // 静默忽略（连同下方 wanted 过滤形成"schema 承诺可用、实际必空"）
  const { keys } = tryToTencentSymbols(codes, 'CN');
  if (keys.length === 0) {
    return [];
  }
  const data = await client.getTencentQuote(keys.join(','));
  // 腾讯无匹配时会返回 v_pv_none_match="1"（fields=['1']），靠 fields[0]
  // 过滤拦不住；这里改成只接受我们请求过的 key，彻底避免"空壳行情"。
  const wanted = new Set(keys);
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
 * @param codes 股票代码数组，带不带交易所前缀均可（同 {@link getFullQuotes}）
 */
export async function getSimpleQuotes(
  client: RequestClient,
  codes: string[]
): Promise<SimpleQuote[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  const { keys } = tryToTencentSymbols(codes, 'CN');
  if (keys.length === 0) {
    return [];
  }
  const prefixedCodes = keys.map((key) => `s_${key}`);
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

