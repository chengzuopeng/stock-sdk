/**
 * OBV - On Balance Volume（能量潮）
 * 通过成交量的累积来判断股价走势
 */
import type { OHLCV } from './types';

/**
 * OBV 配置选项
 */
export interface OBVOptions {
  /** OBV 均线周期，默认不计算 */
  maPeriod?: number;
}

/**
 * OBV 计算结果
 */
export interface OBVResult {
  /** OBV 值 */
  obv: number | null;
  /** OBV 均线（如果配置了 maPeriod） */
  obvMa: number | null;
}

/**
 * 计算 OBV（能量潮）
 *
 * @description
 * OBV 是一个累积指标，通过比较当日收盘价与前一日收盘价来确定成交量的正负：
 * - 当日收盘价 > 前日收盘价：OBV = 前日 OBV + 当日成交量
 * - 当日收盘价 < 前日收盘价：OBV = 前日 OBV - 当日成交量
 * - 当日收盘价 = 前日收盘价：OBV = 前日 OBV
 *
 * @param data K 线数据数组
 * @param options 配置选项
 * @returns OBV 结果数组
 *
 * @example
 * const obv = calcOBV(klines);
 * console.log(obv[10].obv); // OBV 值
 */
export function calcOBV(data: OHLCV[], options: OBVOptions = {}): OBVResult[] {
  const { maPeriod } = options;
  const results: OBVResult[] = [];

  if (data.length === 0) {
    return results;
  }

  // 第一根 K 线的 OBV 为当日成交量
  let obvValue = data[0].volume ?? 0;
  results.push({ obv: obvValue, obvMa: null });

  // 计算后续的 OBV
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];

    if (
      current.close === null ||
      prev.close === null ||
      current.volume === null ||
      current.volume === undefined
    ) {
      results.push({ obv: null, obvMa: null });
      continue;
    }

    if (current.close > prev.close) {
      obvValue += current.volume;
    } else if (current.close < prev.close) {
      obvValue -= current.volume;
    }
    // 相等时不变

    results.push({ obv: obvValue, obvMa: null });
  }

  // 计算 OBV 均线
  if (maPeriod && maPeriod > 0) {
    for (let i = maPeriod - 1; i < results.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - maPeriod + 1; j <= i; j++) {
        if (results[j].obv !== null) {
          sum += results[j].obv!;
          count++;
        }
      }
      if (count === maPeriod) {
        results[i].obvMa = sum / maPeriod;
      }
    }
  }

  return results;
}
