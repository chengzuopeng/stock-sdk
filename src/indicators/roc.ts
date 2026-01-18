/**
 * ROC - Rate of Change（变动率指标）
 * 衡量价格变化的速度和幅度
 */
import type { OHLCV } from './types';

/**
 * ROC 配置选项
 */
export interface ROCOptions {
  /** ROC 周期，默认 12 */
  period?: number;
  /** 信号线周期，默认不计算 */
  signalPeriod?: number;
}

/**
 * ROC 计算结果
 */
export interface ROCResult {
  /** ROC 值（百分比） */
  roc: number | null;
  /** ROC 的 MA 信号线 */
  signal: number | null;
}

/**
 * 计算 ROC（变动率指标）
 *
 * @description
 * ROC = (当日收盘价 - N 日前收盘价) / N 日前收盘价 × 100
 *
 * 信号解读：
 * - ROC 由负转正：买入信号
 * - ROC 由正转负：卖出信号
 * - ROC 与价格背离：可能的反转信号
 *
 * @param data K 线数据数组
 * @param options 配置选项
 * @returns ROC 结果数组
 *
 * @example
 * const roc = calcROC(klines, { period: 12 });
 * console.log(roc[20].roc); // ROC 值
 */
export function calcROC(data: OHLCV[], options: ROCOptions = {}): ROCResult[] {
  const { period = 12, signalPeriod } = options;
  const results: ROCResult[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      results.push({ roc: null, signal: null });
      continue;
    }

    const current = data[i].close;
    const previous = data[i - period].close;

    if (current === null || previous === null || previous === 0) {
      results.push({ roc: null, signal: null });
      continue;
    }

    const roc = ((current - previous) / previous) * 100;
    results.push({ roc, signal: null });
  }

  // 计算信号线
  if (signalPeriod && signalPeriod > 0) {
    for (let i = period + signalPeriod - 1; i < results.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - signalPeriod + 1; j <= i; j++) {
        if (results[j].roc !== null) {
          sum += results[j].roc!;
          count++;
        }
      }
      if (count === signalPeriod) {
        results[i].signal = sum / signalPeriod;
      }
    }
  }

  return results;
}
