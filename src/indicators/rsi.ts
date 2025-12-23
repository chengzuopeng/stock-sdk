import { RSIOptions, RSIResult } from './types';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算 RSI 指标
 */
export function calcRSI(
  closes: (number | null)[],
  options: RSIOptions = {}
): RSIResult[] {
  const { periods = [6, 12, 24] } = options;

  // 计算涨跌幅
  const changes: (number | null)[] = [null];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] === null || closes[i - 1] === null) {
      changes.push(null);
    } else {
      changes.push(closes[i]! - closes[i - 1]!);
    }
  }

  // 为每个周期计算 RSI
  const rsiArrays: { [key: string]: (number | null)[] } = {};

  for (const period of periods) {
    const rsi: (number | null)[] = [];
    let avgGain = 0;
    let avgLoss = 0;

    for (let i = 0; i < closes.length; i++) {
      if (i < period) {
        rsi.push(null);
        if (changes[i] !== null) {
          if (changes[i]! > 0) avgGain += changes[i]!;
          else avgLoss += Math.abs(changes[i]!);
        }
        continue;
      }

      if (i === period) {
        avgGain = avgGain / period;
        avgLoss = avgLoss / period;
      } else {
        const change = changes[i] ?? 0;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
      }

      if (avgLoss === 0) {
        rsi.push(100);
      } else if (avgGain === 0) {
        rsi.push(0);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(round(100 - 100 / (1 + rs)));
      }
    }

    rsiArrays[`rsi${period}`] = rsi;
  }

  // 转换为按索引的结果数组
  return closes.map((_, i) => {
    const result: RSIResult = {};
    for (const period of periods) {
      result[`rsi${period}`] = rsiArrays[`rsi${period}`][i];
    }
    return result;
  });
}

