import { MACDOptions, MACDResult } from './types';
import { calcEMA } from './ma';
import { round } from './round';


/**
 * 计算 MACD 指标
 */
export function calcMACD(
  closes: (number | null)[],
  options: MACDOptions = {}
): MACDResult[] {
  const { short = 12, long = 26, signal = 9, decimals } = options;

  // 计算短期和长期 EMA
  const emaShort = calcEMA(closes, short, decimals);
  const emaLong = calcEMA(closes, long, decimals);

  // 计算 DIF
  const dif: (number | null)[] = closes.map((_, i) => {
    if (emaShort[i] === null || emaLong[i] === null) return null;
    return emaShort[i]! - emaLong[i]!;
  });

  // 计算 DEA (DIF 的 EMA)
  const dea = calcEMA(dif, signal, decimals);

  // 计算 MACD 柱状图
  return closes.map((_, i) => ({
    dif: dif[i] !== null ? round(dif[i]!, decimals) : null,
    dea: dea[i],
    macd:
      dif[i] !== null && dea[i] !== null
        ? round((dif[i]! - dea[i]!) * 2, decimals)
        : null,
  }));
}

