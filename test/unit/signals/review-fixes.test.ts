/**
 * Review 问题回归测试（signals #5：MA 周期解耦）
 */
import { describe, it, expect } from 'vitest';
import { calcSignals } from '../../../src/signals';
import { InvalidArgumentError } from '../../../src/core';
import type { KlineWithIndicators } from '../../../src/indicators';
import type { HistoryKline } from '../../../src/types';

type K = KlineWithIndicators<HistoryKline>;

function k(ts: number, ma: Record<string, number | null>): K {
  return {
    date: '',
    timestamp: ts,
    tz: 'Asia/Shanghai',
    code: '',
    open: null,
    close: null,
    high: null,
    low: null,
    volume: null,
    amount: null,
    amplitude: null,
    changePercent: null,
    change: null,
    turnoverRate: null,
    ma,
  } as K;
}

describe('#5 calcSignals MA 周期与指标周期不一致', () => {
  it('指标算 ma10/ma60 但信号传 fast:5/slow:20 → 报错（不再静默零信号）', () => {
    const klines = [k(1, { ma10: 9, ma60: 10 }), k(2, { ma10: 11, ma60: 10 })];
    expect(() => calcSignals(klines, { ma: { fast: 5, slow: 20 } })).toThrow(
      InvalidArgumentError
    );
  });

  it('周期一致时正常产出信号', () => {
    const klines = [k(1, { ma5: 9, ma20: 10 }), k(2, { ma5: 11, ma20: 10 })];
    expect(calcSignals(klines, { ma: { fast: 5, slow: 20 } })).toContainEqual(
      expect.objectContaining({ type: 'ma_golden_cross' })
    );
  });
});

describe('N2 calcSignals RSI 周期与指标周期不一致', () => {
  function kr(ts: number, rsi: Record<string, number | null>): K {
    return {
      date: '',
      timestamp: ts,
      tz: 'Asia/Shanghai',
      code: '',
      open: null,
      close: null,
      high: null,
      low: null,
      volume: null,
      amount: null,
      amplitude: null,
      changePercent: null,
      change: null,
      turnoverRate: null,
      rsi,
    } as K;
  }

  it('指标算 rsi14 但信号默认 period 6 → 报错（不再静默零信号）', () => {
    const klines = [kr(1, { rsi14: 75 }), kr(2, { rsi14: 80 })];
    expect(() => calcSignals(klines, { rsi: {} })).toThrow(InvalidArgumentError);
  });

  it('周期一致(rsi6)正常，不报错', () => {
    const klines = [kr(1, { rsi6: 75 }), kr(2, { rsi6: 80 })];
    expect(() => calcSignals(klines, { rsi: {} })).not.toThrow();
  });
});
