/**
 * KC - Keltner Channel（肯特纳通道）
 * 基于 ATR 的价格通道指标
 */
import type { OHLCV } from './types';
import { calcATR } from './atr';
import { calcEMA } from './ma';

/**
 * KC 配置选项
 */
export interface KCOptions {
  /** EMA 周期，默认 20 */
  emaPeriod?: number;
  /** ATR 周期，默认 10 */
  atrPeriod?: number;
  /** ATR 倍数，默认 2 */
  multiplier?: number;
}

/**
 * KC 计算结果
 */
export interface KCResult {
  /** 中轨（EMA） */
  mid: number | null;
  /** 上轨 */
  upper: number | null;
  /** 下轨 */
  lower: number | null;
  /** 通道宽度 */
  width: number | null;
}

/**
 * 计算 KC（肯特纳通道）
 *
 * @description
 * Keltner Channel 是一个基于 ATR 的价格通道：
 * - 中轨 = EMA(close, period)
 * - 上轨 = 中轨 + multiplier × ATR
 * - 下轨 = 中轨 - multiplier × ATR
 *
 * 与布林带相比，KC 使用 ATR 而非标准差，对价格变化反应更平滑。
 *
 * @param data K 线数据数组
 * @param options 配置选项
 * @returns KC 结果数组
 *
 * @example
 * const kc = calcKC(klines, { emaPeriod: 20, multiplier: 2 });
 * console.log(kc[30].upper); // 上轨
 * console.log(kc[30].mid);   // 中轨
 * console.log(kc[30].lower); // 下轨
 */
export function calcKC(data: OHLCV[], options: KCOptions = {}): KCResult[] {
  const { emaPeriod = 20, atrPeriod = 10, multiplier = 2 } = options;
  const results: KCResult[] = [];

  // 计算 EMA
  const closes = data.map((d) => d.close);
  const emaResults = calcEMA(closes, emaPeriod);

  // 计算 ATR
  const atrResults = calcATR(data, { period: atrPeriod });

  for (let i = 0; i < data.length; i++) {
    const ema = emaResults[i];
    const atr = atrResults[i]?.atr;

    if (ema === null || atr === null) {
      results.push({ mid: null, upper: null, lower: null, width: null });
      continue;
    }

    const upper = ema + multiplier * atr;
    const lower = ema - multiplier * atr;
    const width = ema > 0 ? ((upper - lower) / ema) * 100 : null;

    results.push({
      mid: ema,
      upper,
      lower,
      width,
    });
  }

  return results;
}
