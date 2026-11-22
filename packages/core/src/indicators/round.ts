/**
 * 指标输出统一舍入(单一来源):ma/macd/boll/kdj/rsi/wr/bias/cci/atr 共用,
 * 各指标可经 options.decimals 覆盖;obv/roc/dmi/sar/kc 输出维持裸浮点(不舍入)。
 */
export const DEFAULT_INDICATOR_DECIMALS = 3;

export function round(
  value: number,
  decimals: number = DEFAULT_INDICATOR_DECIMALS
): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
