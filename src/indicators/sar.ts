/**
 * SAR - Parabolic SAR（抛物线转向指标）
 * 判断趋势反转点和止损位
 */
import type { OHLCV } from './types';

/**
 * SAR 配置选项
 */
export interface SAROptions {
  /** 加速因子初始值，默认 0.02 */
  afStart?: number;
  /** 加速因子增量，默认 0.02 */
  afIncrement?: number;
  /** 加速因子最大值，默认 0.2 */
  afMax?: number;
}

/**
 * SAR 计算结果
 */
export interface SARResult {
  /** SAR 值 */
  sar: number | null;
  /** 当前趋势：1 为上升，-1 为下降 */
  trend: 1 | -1 | null;
  /** 极值点 */
  ep: number | null;
  /** 加速因子 */
  af: number | null;
}

/**
 * 计算 SAR（抛物线转向指标）
 *
 * @description
 * Parabolic SAR 用于确定价格的趋势方向和潜在的反转点：
 * - 当价格在 SAR 之上时，SAR 在价格下方，表示上升趋势
 * - 当价格在 SAR 之下时，SAR 在价格上方，表示下降趋势
 * - SAR 可用作动态止损位
 *
 * @param data K 线数据数组
 * @param options 配置选项
 * @returns SAR 结果数组
 *
 * @example
 * const sar = calcSAR(klines);
 * console.log(sar[20].sar);   // SAR 值
 * console.log(sar[20].trend); // 趋势方向
 */
export function calcSAR(data: OHLCV[], options: SAROptions = {}): SARResult[] {
  const { afStart = 0.02, afIncrement = 0.02, afMax = 0.2 } = options;
  const results: SARResult[] = [];

  if (data.length < 2) {
    return data.map(() => ({ sar: null, trend: null, ep: null, af: null }));
  }

  // 初始化：假设开始为上升趋势
  let trend: 1 | -1 = 1;
  let af = afStart;
  let ep = data[0].high ?? 0;
  let sar = data[0].low ?? 0;

  // 找到初始趋势
  const first = data[0];
  const second = data[1];
  if (
    first.close !== null &&
    second.close !== null &&
    second.close < first.close
  ) {
    trend = -1;
    ep = first.low ?? 0;
    sar = first.high ?? 0;
  }

  results.push({ sar: null, trend: null, ep: null, af: null });

  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];

    if (
      current.high === null ||
      current.low === null ||
      prev.high === null ||
      prev.low === null
    ) {
      results.push({ sar: null, trend: null, ep: null, af: null });
      continue;
    }

    // 计算新的 SAR
    let newSar = sar + af * (ep - sar);

    // 确保 SAR 不会穿过前两根 K 线的极值
    if (trend === 1) {
      newSar = Math.min(newSar, prev.low, data[Math.max(0, i - 2)]?.low ?? prev.low);
      if (current.low < newSar) {
        // 反转为下降趋势
        trend = -1;
        newSar = ep;
        ep = current.low;
        af = afStart;
      } else {
        // 更新 EP
        if (current.high > ep) {
          ep = current.high;
          af = Math.min(af + afIncrement, afMax);
        }
      }
    } else {
      newSar = Math.max(newSar, prev.high, data[Math.max(0, i - 2)]?.high ?? prev.high);
      if (current.high > newSar) {
        // 反转为上升趋势
        trend = 1;
        newSar = ep;
        ep = current.high;
        af = afStart;
      } else {
        // 更新 EP
        if (current.low < ep) {
          ep = current.low;
          af = Math.min(af + afIncrement, afMax);
        }
      }
    }

    sar = newSar;
    results.push({ sar, trend, ep, af });
  }

  return results;
}
