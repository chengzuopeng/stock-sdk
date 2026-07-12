/**
 * R7-6/R7-7 前置：ATR / SAR / KC 黄金基线（从修复前实现捕获）。
 *
 * 播种策略修复的纪律是"干净数据下 bitwise 不变，只允许脏数据路径变化"——
 * 此前 SAR 与 KC 没有任何数值级用例，该闸门无从执行。本基线用确定性
 * 随机游走序列冻结修复前输出。生成逻辑（genBars / BASELINE_CASES）与再生成
 * 脚本 scripts/gen-indicator-baseline.ts 共享 __fixtures__/gen（同源，防漂移）；
 * 更新基线用 `pnpm gen:indicator-baseline`。
 */
import { describe, it, expect } from 'vitest';
import baseline from './__fixtures__/seed-baseline.json';
import { genBars } from './__fixtures__/gen';
import { calcATR } from '../../../src/indicators/atr';
import { calcSAR } from '../../../src/indicators/sar';
import { calcKC } from '../../../src/indicators/kc';

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
