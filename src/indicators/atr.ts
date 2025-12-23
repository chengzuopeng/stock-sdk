import { OHLCV, ATROptions, ATRResult } from './types';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算平均真实波幅 ATR (Average True Range)
 * 
 * 公式：
 * TR（真实波幅）= max(
 *   最高价 - 最低价,
 *   |最高价 - 昨收|,
 *   |最低价 - 昨收|
 * )
 * ATR = TR 的 N 日移动平均
 * 
 * ATR 用于衡量市场波动性：
 * - ATR 越大，市场波动越大
 * - ATR 越小，市场波动越小
 * - 常用于止损位设置（如 2 倍 ATR）
 */
export function calcATR(
  data: OHLCV[],
  options: ATROptions = {}
): ATRResult[] {
  const { period = 14 } = options;

  const result: ATRResult[] = [];
  const tr: (number | null)[] = [];

  // 计算真实波幅 TR
  for (let i = 0; i < data.length; i++) {
    const { high, low, close } = data[i];
    
    if (high === null || low === null || close === null) {
      tr.push(null);
      continue;
    }

    if (i === 0) {
      // 第一天：TR = 最高价 - 最低价
      tr.push(high - low);
    } else {
      const prevClose = data[i - 1].close;
      if (prevClose === null) {
        tr.push(high - low);
      } else {
        // TR = max(H-L, |H-昨收|, |L-昨收|)
        const hl = high - low;
        const hpc = Math.abs(high - prevClose);
        const lpc = Math.abs(low - prevClose);
        tr.push(Math.max(hl, hpc, lpc));
      }
    }
  }

  // 计算 ATR（TR 的移动平均）
  let atr: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ tr: tr[i] !== null ? round(tr[i]!) : null, atr: null });
      continue;
    }

    if (i === period - 1) {
      // 第一个 ATR：使用简单平均
      let sum = 0;
      let count = 0;
      for (let j = 0; j < period; j++) {
        if (tr[j] !== null) {
          sum += tr[j]!;
          count++;
        }
      }
      if (count === period) {
        atr = sum / period;
      }
    } else {
      // 后续 ATR：使用 Wilder 平滑法
      // ATR = (前ATR × (N-1) + 当前TR) / N
      if (atr !== null && tr[i] !== null) {
        atr = (atr * (period - 1) + tr[i]!) / period;
      }
    }

    result.push({
      tr: tr[i] !== null ? round(tr[i]!) : null,
      atr: atr !== null ? round(atr) : null,
    });
  }

  return result;
}

