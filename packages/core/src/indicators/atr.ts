import { OHLCV, ATROptions, ATRResult } from './types';
import { round } from './round';


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
  const { period = 14, decimals } = options;
  // 非正整数 period(0 / 负数 / 小数 / NaN)会让播种在空窗口上"集齐"
  // (0===0 → atr=0/0=NaN 传染整条序列),与修复前的全 null 行为回归 ——
  // 非法周期统一产出 atr 全 null(tr 仍逐根计算),与其余指标的宽容语义一致
  const validPeriod = Number.isInteger(period) && period >= 1;

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
  // R7-6: 播种从"只在 i === period-1 尝试一次"改为未播种即逐窗重试 ——
  // 此前暖机期内一根 null bar 就让整条序列 ATR 永远 null（播种条件
  // count === period 永不满足，Wilder 分支又被 atr !== null 拦死），
  // calcKC 连带全灭；对比 calcEMA 每根重试、calcSMA 窗口滑出即恢复。
  let atr: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (!validPeriod || i < period - 1) {
      result.push({ tr: tr[i] !== null ? round(tr[i]!, decimals) : null, atr: null });
      continue;
    }

    if (atr === null) {
      // 播种（或暖机脏数据后的重试）：最近 period 根 TR 全部非 null 时
      // 以简单平均播种。用窗口重扫而非增量和 —— 与 rolling-parity 的
      // 参考实现逐位一致（增量加减的浮点顺序不同，可能差 1 ulp）；
      // 扫窗仅发生在未播种段，播种后全程 O(1) Wilder，整体仍 O(n) 量级。
      // 干净数据下首个播种点仍是 i === period-1，与历史输出 bitwise 一致。
      let sum = 0;
      let count = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (tr[j] !== null) {
          sum += tr[j]!;
          count++;
        }
      }
      if (count === period) {
        atr = sum / period;
      }
    } else if (tr[i] !== null) {
      // 后续 ATR：使用 Wilder 平滑法
      // ATR = (前ATR × (N-1) + 当前TR) / N
      atr = (atr * (period - 1) + tr[i]!) / period;
    }

    result.push({
      tr: tr[i] !== null ? round(tr[i]!, decimals) : null,
      atr: atr !== null ? round(atr, decimals) : null,
    });
  }

  return result;
}

