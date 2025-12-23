import { OHLCV, WROptions, WRResult } from './types';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算威廉指标 WR
 */
export function calcWR(
  data: OHLCV[],
  options: WROptions = {}
): WRResult[] {
  const { periods = [6, 10] } = options;

  const wrArrays: { [key: string]: (number | null)[] } = {};

  for (const period of periods) {
    const wr: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        wr.push(null);
        continue;
      }

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
        wr.push(null);
        continue;
      }

      const wrValue = ((highN - close) / (highN - lowN)) * 100;
      wr.push(round(wrValue));
    }

    wrArrays[`wr${period}`] = wr;
  }

  return data.map((_, i) => {
    const result: WRResult = {};
    for (const period of periods) {
      result[`wr${period}`] = wrArrays[`wr${period}`][i];
    }
    return result;
  });
}

