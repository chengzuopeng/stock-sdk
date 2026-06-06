/**
 * 纯代码的市场 / 交易所推断（收编原 core/utils.ts 的 getMarketCode 语义）
 */
import type { Exchange } from './types';

/**
 * 推断 A 股纯数字代码所属交易所。
 *   - 北交所(BSE)：4 / 8 开头，及 920 新代码段
 *   - 上交所(SSE)：6（主板/科创）、5（场内 ETF/LOF）、9（B 股）开头
 *   - 深交所(SZSE)：0（主板）、3（创业板）、1（ETF/LOF 如 15/16/18）开头
 */
export function inferAShareExchange(code: string): Exchange {
  if (code.startsWith('920') || /^[48]/.test(code)) {
    return 'BSE';
  }
  const first = code[0];
  if (first === '6' || first === '5' || first === '9') {
    return 'SSE';
  }
  return 'SZSE';
}
