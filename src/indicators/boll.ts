import { BOLLOptions, BOLLResult } from './types';
import { calcSMA } from './ma';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算标准差
 */
function calcStdDev(
  data: (number | null)[],
  period: number,
  ma: (number | null)[]
): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || ma[i] === null) {
      result.push(null);
      continue;
    }

    let sumSquares = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] !== null && ma[i] !== null) {
        sumSquares += Math.pow(data[j]! - ma[i]!, 2);
        count++;
      }
    }

    result.push(count === period ? Math.sqrt(sumSquares / period) : null);
  }

  return result;
}

/**
 * 计算布林带
 */
export function calcBOLL(
  closes: (number | null)[],
  options: BOLLOptions = {}
): BOLLResult[] {
  const { period = 20, stdDev = 2 } = options;

  // 计算中轨（MA）
  const mid = calcSMA(closes, period);

  // 计算标准差
  const std = calcStdDev(closes, period, mid);

  // 计算上下轨和带宽
  return closes.map((_, i) => {
    if (mid[i] === null || std[i] === null) {
      return { mid: null, upper: null, lower: null, bandwidth: null };
    }

    const upper = mid[i]! + stdDev * std[i]!;
    const lower = mid[i]! - stdDev * std[i]!;
    const bandwidth =
      mid[i]! !== 0 ? round(((upper - lower) / mid[i]!) * 100) : null;

    return {
      mid: mid[i],
      upper: round(upper),
      lower: round(lower),
      bandwidth,
    };
  });
}

