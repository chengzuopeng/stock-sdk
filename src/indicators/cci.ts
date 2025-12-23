import { OHLCV, CCIOptions, CCIResult } from './types';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算商品通道指数 CCI
 * 
 * 公式：
 * TP（典型价格）= (最高价 + 最低价 + 收盘价) / 3
 * MA = TP 的 N 日简单移动平均
 * MD = TP 与 MA 的平均绝对偏差
 * CCI = (TP - MA) / (0.015 × MD)
 * 
 * CCI 用于判断超买超卖：
 * - CCI > 100：超买区域
 * - CCI < -100：超卖区域
 * - CCI 在 -100 ~ 100 之间：正常区域
 */
export function calcCCI(
  data: OHLCV[],
  options: CCIOptions = {}
): CCIResult[] {
  const { period = 14 } = options;

  const result: CCIResult[] = [];

  // 计算典型价格 TP
  const tp: (number | null)[] = data.map((d) => {
    if (d.high === null || d.low === null || d.close === null) {
      return null;
    }
    return (d.high + d.low + d.close) / 3;
  });

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ cci: null });
      continue;
    }

    // 计算 TP 的 N 日简单移动平均
    let sum = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] !== null) {
        sum += tp[j]!;
        count++;
      }
    }

    if (count !== period || tp[i] === null) {
      result.push({ cci: null });
      continue;
    }

    const ma = sum / period;

    // 计算平均绝对偏差 MD
    let mdSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      mdSum += Math.abs(tp[j]! - ma);
    }
    const md = mdSum / period;

    // 计算 CCI
    if (md === 0) {
      result.push({ cci: 0 });
    } else {
      const cci = (tp[i]! - ma) / (0.015 * md);
      result.push({ cci: round(cci) });
    }
  }

  return result;
}

