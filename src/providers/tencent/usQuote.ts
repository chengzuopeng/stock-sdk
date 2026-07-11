/**
 * 腾讯财经 - 美股行情
 */
import { RequestClient } from '../../core';
import type { USQuote } from '../../types';
import { tryToTencentSymbols } from '../../symbols';
import { parseUSQuote } from './parsers';

/**
 * 获取美股行情
 * @param client 请求客户端
 * @param codes 美股代码数组，带不带 us 前缀均可（'BABA' / 'usAAPL'）。
 *   无法映射的代码跳过不报错。
 */
export async function getUSQuotes(
  client: RequestClient,
  codes: string[]
): Promise<USQuote[]> {
  if (!codes || codes.length === 0) {
    return [];
  }
  // R7-3: 归一替代无条件 `us${code}` 拼接（'usBABA' 不再被拼成 'ususBABA'）
  const { keys } = tryToTencentSymbols(codes, 'US');
  if (keys.length === 0) {
    return [];
  }
  const data = await client.getTencentQuote(keys.join(','));
  // 腾讯无匹配时会回 v_pv_none_match="1"，按 key 精确过滤
  const wanted = new Set(keys);
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

