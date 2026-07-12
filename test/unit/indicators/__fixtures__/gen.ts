/**
 * ATR/SAR/KC 黄金基线的确定性数据生成（单一来源）。
 *
 * seed-baseline.test.ts 与 scripts/gen-indicator-baseline.ts 共享本模块，
 * 保证"生成 fixture 的逻辑"与"测试重放的逻辑"逐字一致（此前两者各持一份
 * genBars，脚本还未入库——review 指出的再生成缺口）。
 *
 * 再生成 fixture：`pnpm gen:indicator-baseline`（改动指标默认/精度后需重跑并
 * 人工确认 diff 合理，再提交 __fixtures__/seed-baseline.json）。
 */
import type { OHLCV } from '../../../../src/indicators/types';

/** 确定性 PRNG（mulberry32），避免 Math.random 引入不可复现性。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 从 seed 生成 n 根随机游走 K 线（干净数据，无 null）。 */
export function genBars(seed: number, n: number): OHLCV[] {
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

/** 基线用例（名字 → seed/n）；脚本与测试同源遍历。 */
export const BASELINE_CASES = [
  { name: 'trend-300-seed42', seed: 42, n: 300 },
  { name: 'trend-120-seed7', seed: 7, n: 120 },
] as const;
