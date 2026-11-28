/**
 * 指标信号层（B1）单测
 */
import { describe, it, expect } from 'vitest';
import { calcSignals } from '../../../src/signals';
import type { KlineWithIndicators } from '../../../src/indicators';
import type { HistoryKline } from '../../../src/types';

type K = KlineWithIndicators<HistoryKline>;

function k(ts: number | null, extra: Partial<K>): K {
  return {
    date: '',
    timestamp: ts,
    tz: 'Asia/Shanghai',
    code: '600519',
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
    ...extra,
  } as K;
}

describe('calcSignals — MA cross', () => {
  it('detects golden & death cross', () => {
    const klines = [
      k(1, { ma: { ma5: 9, ma20: 10 } }),
      k(2, { ma: { ma5: 11, ma20: 10 } }), // golden
      k(3, { ma: { ma5: 9, ma20: 10 } }), // death
    ];
    const sigs = calcSignals(klines, { ma: { fast: 5, slow: 20 } });
    expect(sigs).toContainEqual(
      expect.objectContaining({ type: 'ma_golden_cross', at: 2, index: 1 })
    );
    expect(sigs).toContainEqual(
      expect.objectContaining({ type: 'ma_death_cross', at: 3, index: 2 })
    );
  });
});

describe('calcSignals — MACD / KDJ / RSI / BOLL / SAR', () => {
  it('MACD golden cross', () => {
    const klines = [
      k(1, { macd: { dif: -1, dea: 0, macd: -2 } }),
      k(2, { macd: { dif: 1, dea: 0, macd: 2 } }),
    ];
    expect(calcSignals(klines, { macd: true })).toContainEqual(
      expect.objectContaining({ type: 'macd_golden_cross', at: 2 })
    );
  });

  it('KDJ overbought / oversold + cross', () => {
    const klines = [
      k(1, { kdj: { k: 50, d: 55, j: 40 } }),
      k(2, { kdj: { k: 85, d: 60, j: 120 } }), // golden cross + overbought
      k(3, { kdj: { k: 15, d: 30, j: 0 } }), // death cross + oversold
    ];
    const sigs = calcSignals(klines, { kdj: {} });
    const types = sigs.map((s) => s.type);
    expect(types).toContain('kdj_golden_cross');
    expect(types).toContain('kdj_overbought');
    expect(types).toContain('kdj_death_cross');
    expect(types).toContain('kdj_oversold');
  });

  it('RSI overbought / oversold', () => {
    const klines = [
      k(1, { rsi: { rsi6: 50 } }),
      k(2, { rsi: { rsi6: 75 } }),
      k(3, { rsi: { rsi6: 25 } }),
    ];
    const sigs = calcSignals(klines, { rsi: { period: 6 } });
    expect(sigs.map((s) => s.type)).toEqual(
      expect.arrayContaining(['rsi_overbought', 'rsi_oversold'])
    );
  });

  it('BOLL break upper / lower', () => {
    const klines = [
      k(1, { close: 10, boll: { mid: 10, upper: 12, lower: 8, bandwidth: 4 } }),
      k(2, { close: 13, boll: { mid: 10, upper: 12, lower: 8, bandwidth: 4 } }),
      k(3, { close: 7, boll: { mid: 10, upper: 12, lower: 8, bandwidth: 4 } }),
    ];
    const sigs = calcSignals(klines, { boll: true });
    expect(sigs.map((s) => s.type)).toEqual(
      expect.arrayContaining(['boll_break_upper', 'boll_break_lower'])
    );
  });

  it('SAR reversal up / down', () => {
    const klines = [
      k(1, { sar: { sar: 10, trend: -1, ep: 9, af: 0.02 } }),
      k(2, { sar: { sar: 9, trend: 1, ep: 11, af: 0.02 } }), // up
      k(3, { sar: { sar: 12, trend: -1, ep: 8, af: 0.02 } }), // down
    ];
    const sigs = calcSignals(klines, { sar: true });
    expect(sigs.map((s) => s.type)).toEqual(
      expect.arrayContaining(['sar_reversal_up', 'sar_reversal_down'])
    );
  });
});

describe('calcSignals — timestamp 一致性约定', () => {
  it('skips klines whose timestamp is null', () => {
    const klines = [
      k(1, { ma: { ma5: 9, ma20: 10 } }),
      k(null, { ma: { ma5: 11, ma20: 10 } }), // 本应金叉，但 timestamp null → 跳过
    ];
    expect(calcSignals(klines, { ma: { fast: 5, slow: 20 } })).toHaveLength(0);
  });
});
