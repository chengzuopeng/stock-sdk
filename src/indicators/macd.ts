import { MACDOptions, MACDResult } from './types';
import { calcEMA } from './ma';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算 MACD 指标
 */
export function calcMACD(
  closes: (number | null)[],
  options: MACDOptions = {}
): MACDResult[] {
  const { short = 12, long = 26, signal = 9 } = options;

  // 计算短期和长期 EMA
  const emaShort = calcEMA(closes, short);
  const emaLong = calcEMA(closes, long);

  // 计算 DIF
  const dif: (number | null)[] = closes.map((_, i) => {
    if (emaShort[i] === null || emaLong[i] === null) return null;
    return emaShort[i]! - emaLong[i]!;
  });

  // 计算 DEA (DIF 的 EMA)
  const dea = calcEMA(dif, signal);

  // 计算 MACD 柱状图
  return closes.map((_, i) => ({
    dif: dif[i] !== null ? round(dif[i]!) : null,
    dea: dea[i],
    macd:
      dif[i] !== null && dea[i] !== null
        ? round((dif[i]! - dea[i]!) * 2)
        : null,
  }));
}

