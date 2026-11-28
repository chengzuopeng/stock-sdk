/**
 * Review 修复回归（F32）：指标入参文档简写
 *
 * 文档与 JSDoc 多处示例为 `{ ma: [5, 20] }` / `{ rsi: { period: 14 } }`,
 * 旧实现只认 `{ periods: [...] }`:JS 用户照抄会静默拿到默认周期
 * (无 ma7/ma21,且 lookback 被默认 250 放大),TS 用户编译报错。
 */
import { describe, it, expect } from 'vitest';
import { addIndicators } from '../../../src/indicators';
import {
  estimateIndicatorLookback,
  normalizeIndicatorOptions,
} from '../../../src/indicators/registry';

function klines(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
    code: '000001',
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 102 + Math.sin(i / 3) * 5,
    volume: 1000 + i,
    amount: 100000,
    amplitude: 10,
    changePercent: 1,
    change: 1,
    turnoverRate: 1,
  }));
}

describe('F32 数组简写({ ma: [7, 21] })', () => {
  it('等价于 { periods: [7, 21] },不再静默回退默认周期', () => {
    const data = klines(40);
    const short = addIndicators(data, { ma: [7, 21] });
    const full = addIndicators(data, { ma: { periods: [7, 21] } });
    expect(short[30].ma).toEqual(full[30].ma);
    expect(short[30].ma).toHaveProperty('ma7');
    expect(short[30].ma).toHaveProperty('ma21');
    expect(short[30].ma).not.toHaveProperty('ma5'); // 旧 bug:回退默认产出 ma5
  });

  it('wr/bias 同样支持数组简写', () => {
    const data = klines(40);
    const out = addIndicators(data, { wr: [10], bias: [6] });
    expect(out[30].wr).toHaveProperty('wr10');
    expect(out[30].bias).toHaveProperty('bias6');
  });
});

describe('F32 单周期对象简写({ rsi: { period: 14 } })', () => {
  it('等价于 { periods: [14] }', () => {
    const data = klines(60);
    const short = addIndicators(data, { rsi: { period: 14 } });
    const full = addIndicators(data, { rsi: { periods: [14] } });
    expect(short[50].rsi).toEqual(full[50].rsi);
    expect(short[50].rsi).toHaveProperty('rsi14');
    expect(short[50].rsi).not.toHaveProperty('rsi6'); // 不再回退默认 6/12/24
  });
});

describe('F32 lookback 估算同样识别简写', () => {
  it('ma:[250] 的 lookback 按 250 估算(而非数组被忽略后的默认)', () => {
    const arr = estimateIndicatorLookback({ ma: [250] });
    const full = estimateIndicatorLookback({ ma: { periods: [250] } });
    expect(arr).toEqual(full);
    expect(arr.maxLookback).toBeGreaterThanOrEqual(250);
  });

  it('ma:[5] 的 lookback 不被默认 250 放大', () => {
    const { maxLookback } = estimateIndicatorLookback({ ma: [5] });
    expect(maxLookback).toBeLessThan(250);
  });
});

describe('F32 完整形式与布尔开关行为不变', () => {
  it('{ ma: true } 仍用默认周期', () => {
    const out = addIndicators(klines(40), { ma: true });
    expect(out[35].ma).toHaveProperty('ma5');
    expect(out[35].ma).toHaveProperty('ma20');
  });

  it('normalizeIndicatorOptions 幂等且不改写完整形式', () => {
    const full = { ma: { periods: [5], type: 'ema' as const }, macd: true };
    expect(normalizeIndicatorOptions(full)).toBe(full); // 无简写时原样返回
    const once = normalizeIndicatorOptions({ ma: [5, 10] });
    expect(normalizeIndicatorOptions(once)).toEqual(once);
  });
});
