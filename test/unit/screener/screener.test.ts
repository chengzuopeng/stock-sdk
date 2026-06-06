/**
 * 选股器 + 回测（B2）单测
 */
import { describe, it, expect } from 'vitest';
import { screen, backtest, type Strategy } from '../../../src/screener';

interface Row {
  code: string;
  pe: number | null;
  changePercent: number;
  amount: number;
}

const rows: Row[] = [
  { code: 'a', pe: 10, changePercent: 5, amount: 300 },
  { code: 'b', pe: 30, changePercent: 8, amount: 500 },
  { code: 'c', pe: 15, changePercent: 1, amount: 100 },
  { code: 'd', pe: null, changePercent: 9, amount: 900 },
];

describe('screen', () => {
  it('filters with where (chained)', () => {
    const r = screen(rows)
      .where((x) => x.pe != null && x.pe < 20)
      .where((x) => x.changePercent > 3)
      .toArray();
    expect(r.map((x) => x.code)).toEqual(['a']);
  });

  it('sortBy desc + top', () => {
    const r = screen(rows)
      .sortBy((x) => x.amount)
      .top(2);
    expect(r.map((x) => x.code)).toEqual(['d', 'b']);
  });

  it('sortBy asc', () => {
    const r = screen(rows)
      .sortBy((x) => x.amount, 'asc')
      .top(1);
    expect(r[0].code).toBe('c');
  });

  it('does not mutate input', () => {
    screen(rows).sortBy((x) => x.amount).top(4);
    expect(rows[0].code).toBe('a');
  });
});

describe('backtest', () => {
  // 价格序列：10 → 12 → 11 → 14
  const klines = [
    { close: 10 },
    { close: 12 },
    { close: 11 },
    { close: 14 },
  ];

  it('buy-and-hold captures full move', () => {
    const buyFirst: Strategy<{ close: number }> = (_bar, i) =>
      i === 0 ? 'buy' : 'hold';
    const r = backtest({ klines, strategy: buyFirst, initialCapital: 10000 });
    // 10 → 14 = +40%
    expect(r.totalReturn).toBeCloseTo(40, 5);
    expect(r.tradeCount).toBe(1);
    expect(r.trades[0].returnPercent).toBeCloseTo(40, 5);
    expect(r.equityCurve).toHaveLength(4);
    expect(r.finalEquity).toBeCloseTo(14000, 5);
  });

  it('computes win rate and max drawdown', () => {
    // 第0根买、第1根卖（10→12 盈），第2根买、第3根卖（11→14 盈）
    const strat: Strategy<{ close: number }> = (_bar, i) => {
      if (i === 0 || i === 2) return 'buy';
      if (i === 1 || i === 3) return 'sell';
      return 'hold';
    };
    const r = backtest({ klines, strategy: strat, initialCapital: 10000 });
    expect(r.tradeCount).toBe(2);
    expect(r.winRate).toBe(100);
    expect(r.maxDrawdown).toBeGreaterThanOrEqual(0);
  });

  it('applies fee to trade return', () => {
    const buyFirst: Strategy<{ close: number }> = (_bar, i) =>
      i === 0 ? 'buy' : 'hold';
    const r = backtest({
      klines,
      strategy: buyFirst,
      initialCapital: 10000,
      fee: 0.001,
    });
    // 毛 40% - 双边费 0.2% ≈ 39.8%
    expect(r.trades[0].returnPercent).toBeCloseTo(39.8, 5);
  });
});
