/**
 * 指标 decimals 选项:默认 3 位小数,可按指标覆盖;简写归一不丢字段。
 */
import { describe, it, expect } from 'vitest';
import {
  calcMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
  calcBIAS,
  calcCCI,
  calcATR,
  addIndicators,
} from '../../../src/indicators';
import type { OHLCV } from '../../../src/indicators';

// 确定性带噪序列(全精度浮点,保证舍入可观察)
const closes: (number | null)[] = Array.from(
  { length: 60 },
  (_, i) => 100 + Math.sin(i / 3) * 4.567 + i * 0.1237
);
const klines: OHLCV[] = closes.map((c, i) => ({
  open: c! - 0.3111,
  high: c! + 1.2345,
  low: c! - 1.1234,
  close: c,
  volume: 10000 + i * 37,
}));

/** value 是否至多 dp 位小数(容浮点表示误差) */
function atMostDecimals(v: number | null | undefined, dp: number): boolean {
  if (v === null || v === undefined) return true;
  const scaled = v * Math.pow(10, dp);
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

function allAtMost(values: Array<number | null | undefined>, dp: number): boolean {
  return values.every((v) => atMostDecimals(v, dp));
}

describe('indicator decimals option', () => {
  it('默认输出 3 位小数,且存在超过 2 位的值(默认值确实是 3 不是 2)', () => {
    const ma = calcMA(closes, { periods: [5] });
    const values = ma.map((r) => r.ma5);
    expect(allAtMost(values, 3)).toBe(true);
    expect(values.some((v) => v !== null && !atMostDecimals(v, 2))).toBe(true);
  });

  it('decimals: 2 时全部输出至多 2 位小数(九个舍入型指标)', () => {
    expect(allAtMost(calcMA(closes, { periods: [5], decimals: 2 }).map((r) => r.ma5), 2)).toBe(true);
    for (const r of calcMACD(closes, { decimals: 2 })) {
      expect(atMostDecimals(r.dif, 2)).toBe(true);
      expect(atMostDecimals(r.dea, 2)).toBe(true);
      expect(atMostDecimals(r.macd, 2)).toBe(true);
    }
    for (const r of calcBOLL(closes, { decimals: 2 })) {
      expect(atMostDecimals(r.mid, 2)).toBe(true);
      expect(atMostDecimals(r.upper, 2)).toBe(true);
      expect(atMostDecimals(r.lower, 2)).toBe(true);
    }
    for (const r of calcKDJ(klines, { decimals: 2 })) {
      expect(atMostDecimals(r.k, 2)).toBe(true);
      expect(atMostDecimals(r.d, 2)).toBe(true);
      expect(atMostDecimals(r.j, 2)).toBe(true);
    }
    expect(allAtMost(calcRSI(closes, { periods: [6], decimals: 2 }).map((r) => r.rsi6), 2)).toBe(true);
    expect(allAtMost(calcWR(klines, { periods: [6], decimals: 2 }).map((r) => r.wr6), 2)).toBe(true);
    expect(allAtMost(calcBIAS(closes, { periods: [6], decimals: 2 }).map((r) => r.bias6), 2)).toBe(true);
    expect(allAtMost(calcCCI(klines, { decimals: 2 }).map((r) => r.cci), 2)).toBe(true);
    for (const r of calcATR(klines, { decimals: 2 })) {
      expect(atMostDecimals(r.tr, 2)).toBe(true);
      expect(atMostDecimals(r.atr, 2)).toBe(true);
    }
  });

  it('decimals 经 addIndicators 透传,period 简写归一不丢该字段', () => {
    const rows = addIndicators(klines, {
      ma: { periods: [5], decimals: 2 },
      // period 单数简写 + decimals:归一为 { periods: [14], decimals: 2 }
      rsi: { period: 14, decimals: 2 } as never,
    });
    expect(allAtMost(rows.map((r) => (r as { ma5?: number | null }).ma5 ?? null), 2)).toBe(true);
    expect(allAtMost(rows.map((r) => (r as { rsi14?: number | null }).rsi14 ?? null), 2)).toBe(true);
  });
});
