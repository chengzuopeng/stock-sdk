import { OHLCV, KDJOptions, KDJResult } from './types';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算 KDJ 指标
 */
export function calcKDJ(
  data: OHLCV[],
  options: KDJOptions = {}
): KDJResult[] {
  const { period = 9, kPeriod = 3, dPeriod = 3 } = options;

  const result: KDJResult[] = [];
  let k = 50;
  let d = 50;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ k: null, d: null, j: null });
      continue;
    }

    // 计算 N 日内最高价和最低价
    let highN = -Infinity;
    let lowN = Infinity;
    let hasValidData = true;

    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high === null || data[j].low === null) {
        hasValidData = false;
        break;
      }
      highN = Math.max(highN, data[j].high!);
      lowN = Math.min(lowN, data[j].low!);
    }

    const close = data[i].close;
    if (!hasValidData || close === null || highN === lowN) {
      result.push({ k: null, d: null, j: null });
      continue;
    }

    // 计算 RSV
    const rsv = ((close - lowN) / (highN - lowN)) * 100;

    // 计算 K 值（平滑）
    k = ((kPeriod - 1) / kPeriod) * k + (1 / kPeriod) * rsv;

    // 计算 D 值（平滑）
    d = ((dPeriod - 1) / dPeriod) * d + (1 / dPeriod) * k;

    // 计算 J 值
    const j = 3 * k - 2 * d;

    result.push({
      k: round(k),
      d: round(d),
      j: round(j),
    });
  }

  return result;
}

