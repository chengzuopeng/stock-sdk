import { OHLCV, WROptions, WRResult } from './types';
import { round } from './round';


/**
 * 计算威廉指标 WR
 */
export function calcWR(
  data: OHLCV[],
  options: WROptions = {}
): WRResult[] {
  const { periods = [6, 10], decimals } = options;

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
      wr.push(round(wrValue, decimals));
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

