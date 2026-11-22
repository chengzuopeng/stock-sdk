import { BIASOptions, BIASResult } from './types';
import { calcSMA } from './ma';
import { round } from './round';


/**
 * 计算乖离率 BIAS
 * 
 * 公式：BIAS = (收盘价 - MA) / MA × 100
 * 
 * 乖离率表示股价与移动平均线之间的偏离程度
 * - 正乖离：股价在均线上方，可能超买
 * - 负乖离：股价在均线下方，可能超卖
 */
export function calcBIAS(
  closes: (number | null)[],
  options: BIASOptions = {}
): BIASResult[] {
  const { periods = [6, 12, 24], decimals } = options;

  const biasArrays: { [key: string]: (number | null)[] } = {};

  for (const period of periods) {
    const ma = calcSMA(closes, period, decimals);
    const bias: (number | null)[] = [];

    for (let i = 0; i < closes.length; i++) {
      if (closes[i] === null || ma[i] === null || ma[i] === 0) {
        bias.push(null);
      } else {
        const biasValue = ((closes[i]! - ma[i]!) / ma[i]!) * 100;
        bias.push(round(biasValue, decimals));
      }
    }

    biasArrays[`bias${period}`] = bias;
  }

  return closes.map((_, i) => {
    const result: BIASResult = {};
    for (const period of periods) {
      result[`bias${period}`] = biasArrays[`bias${period}`][i];
    }
    return result;
  });
}

