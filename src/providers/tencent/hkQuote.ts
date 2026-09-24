/**
 * 腾讯财经 - 港股行情
 */
import { RequestClient } from '../../core';
import type { HKQuote } from '../../types';
import { tryToTencentSymbols } from '../../symbols';
import { parseHKQuote, filterTencentRows, HK_QUOTE_MIN_FIELDS } from './parsers';

/**
 * #78:腾讯港股行情键 `hkXXXXX` 返回的是延时行情,`r_hkXXXXX` 才是实时行情
 * (响应变量名随之变为 `v_r_hkXXXXX`,字段布局不变)。仅对数字股票码加 `r_`;
 * 字母指数键(hkHSI 等)的 `r_` 形态未经实测,保持原样。
 */
function toRealtimeHKKey(key: string): string {
  return /^hk\d+$/.test(key) ? `r_${key}` : key;
}

/**
 * 获取港股行情
 * @param client 请求客户端
 * @param codes 港股代码数组，带不带 hk 前缀均可（'00700' / 'hk00700' /
 *   '700' 自动补零）。无法映射的代码跳过不报错。
 */
export async function getHKQuotes(
  client: RequestClient,
  codes: string[]
): Promise<HKQuote[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  // R7-3: 归一替代无条件 `hk${code}` 拼接 —— 后者会把已带前缀的 'hk00700'
  // 拼成上游静默丢弃的 'hkhk00700'，与 spec"带不带 hk 前缀均可"的承诺矛盾
  const { keys } = tryToTencentSymbols(codes, 'HK');
  if (keys.length === 0) {
    return [];
  }
  const requestKeys = keys.map(toRealtimeHKKey);
  const data = await client.getTencentQuote(requestKeys.join(','));
  // 腾讯无匹配时会回 v_pv_none_match="1"，按 key 精确过滤
  const wanted = new Set(requestKeys);
  return filterTencentRows(data, wanted, HK_QUOTE_MIN_FIELDS).map((d) =>
    parseHKQuote(d.fields)
  );
}

