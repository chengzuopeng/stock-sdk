import { MAOptions, MAResult } from './types';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算简单移动平均线 SMA
 */
export function calcSMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    let sum = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] !== null) {
        sum += data[j]!;
        count++;
      }
    }

    result.push(count === period ? round(sum / period) : null);
  }

  return result;
}

/**
 * 计算指数移动平均线 EMA
 * 使用前 N 天的 SMA 作为 EMA 初始值，避免首日偏差
 */
export function calcEMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const alpha = 2 / (period + 1);
  let ema: number | null = null;
  let initialized = false;

  for (let i = 0; i < data.length; i++) {
    // 前 period-1 天数据不足，返回 null
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    // 第 period 天：用 SMA 初始化 EMA
    if (!initialized) {
      let sum = 0;
      let count = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (data[j] !== null) {
          sum += data[j]!;
          count++;
        }
      }
      if (count === period) {
        ema = sum / period;
        initialized = true;
      }
      result.push(ema !== null ? round(ema) : null);
      continue;
    }

    // 后续使用 EMA 公式递推
    const value = data[i];
    if (value === null) {
      result.push(ema !== null ? round(ema) : null); // 遇到空值，保持上一个 EMA
    } else {
      ema = alpha * value + (1 - alpha) * ema!;
      result.push(round(ema));
    }
  }

  return result;
}

/**
 * 计算加权移动平均线 WMA
 */
export function calcWMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const weights = Array.from({ length: period }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    let sum = 0;
    let valid = true;
    for (let j = 0; j < period; j++) {
      const value = data[i - period + 1 + j];
      if (value === null) {
        valid = false;
        break;
      }
      sum += value * weights[j];
    }

    result.push(valid ? round(sum / weightSum) : null);
  }

  return result;
}

/**
 * 批量计算均线
 */
export function calcMA(
  closes: (number | null)[],
  options: MAOptions = {}
): MAResult[] {
  const { periods = [5, 10, 20, 30, 60, 120, 250], type = 'sma' } = options;

  const calcFn = type === 'ema' ? calcEMA : type === 'wma' ? calcWMA : calcSMA;

  // 计算各周期均线
  const maArrays: { [key: string]: (number | null)[] } = {};
  for (const period of periods) {
    maArrays[`ma${period}`] = calcFn(closes, period);
  }

  // 转换为按索引的结果数组
  return closes.map((_, i) => {
    const result: MAResult = {};
    for (const period of periods) {
      result[`ma${period}`] = maArrays[`ma${period}`][i];
    }
    return result;
  });
}

