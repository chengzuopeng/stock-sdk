/**
 * R7-6/R7-7 前置：ATR / SAR / KC 黄金基线（从修复前实现捕获）。
 *
 * 播种策略修复的纪律是"干净数据下 bitwise 不变，只允许脏数据路径变化"——
 * 此前 SAR 与 KC 没有任何数值级用例，该闸门无从执行。本基线用确定性
 * 随机游走序列冻结修复前输出；fixture 由 scratchpad 脚本一次性生成，
 * 生成逻辑与本文件的 genBars 逐字一致（mulberry32(seed)）。
 */
import { describe, it, expect } from 'vitest';
import baseline from './__fixtures__/seed-baseline.json';
import { calcATR } from '../../../src/indicators/atr';
import { calcSAR } from '../../../src/indicators/sar';
import { calcKC } from '../../../src/indicators/kc';
import type { OHLCV } from '../../../src/indicators/types';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genBars(seed: number, n: number): OHLCV[] {
  const rnd = mulberry32(seed);
  const bars: OHLCV[] = [];
  let price = 100;
  for (let i = 0; i < n; i++) {
    const drift = (rnd() - 0.5) * 4;
    const open = price;
    const close = Math.max(1, price + drift);
    const high = Math.max(open, close) + rnd() * 2;
    const low = Math.min(open, close) - rnd() * 2;
    bars.push({ open, high, low, close, volume: Math.floor(rnd() * 1e6) });
    price = close;
  }
  return bars;
}

describe.each(Object.entries(baseline))('黄金基线 %s', (_name, expected) => {
  const fixture = expected as {
    seed: number;
    n: number;
    atr14: unknown;
    atr5: unknown;
    sar: unknown;
    kc: unknown;
  };
  const bars = genBars(fixture.seed, fixture.n);

  it('calcATR period=14/5 与基线 bitwise 一致', () => {
    expect(calcATR(bars, { period: 14 })).toEqual(fixture.atr14);
    expect(calcATR(bars, { period: 5 })).toEqual(fixture.atr5);
  });

  it('calcSAR 与基线 bitwise 一致', () => {
    expect(calcSAR(bars)).toEqual(fixture.sar);
  });

  it('calcKC 与基线 bitwise 一致', () => {
    expect(calcKC(bars)).toEqual(fixture.kc);
  });
});
