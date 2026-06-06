/**
 * Review 问题回归测试（screener #4 / backtest #6）
 */
import { describe, it, expect } from 'vitest';
import { screen, backtest, type Strategy } from '../../../src/screener';

describe('#4 sortBy 非有限值沉底', () => {
  const rows: { code: string; pe: number | null }[] = [
    { code: 'a', pe: 10 },
    { code: 'b', pe: null },
    { code: 'c', pe: 5 },
    { code: 'd', pe: NaN },
  ];

  it('升序：有限值在前(小→大)，null/NaN 沉底', () => {
    const asc = screen(rows)
      .sortBy((x) => x.pe, 'asc')
      .toArray();
    expect(asc.slice(0, 2).map((x) => x.code)).toEqual(['c', 'a']);
    expect(
      asc
        .slice(2)
        .map((x) => x.code)
        .sort()
    ).toEqual(['b', 'd']);
  });

  it('降序：null/NaN 不再被当 0 排到「最便宜」端', () => {
    const desc = screen(rows)
      .sortBy((x) => x.pe)
      .toArray();
    expect(desc.slice(0, 2).map((x) => x.code)).toEqual(['a', 'c']);
    expect(
      desc
        .slice(2)
        .map((x) => x.code)
        .sort()
    ).toEqual(['b', 'd']);
  });
});

describe('#6 backtest 0 价 / NaN 处理', () => {
  const buyFirst: Strategy<{ close: number }> = (_b, i) =>
    i === 0 ? 'buy' : 'hold';

  it('停牌 0 价 bar 用 lastPrice mark，不产生假回撤', () => {
    const klines = [{ close: 10 }, { close: 0 }, { close: 14 }];
    const r = backtest({ klines, strategy: buyFirst, initialCapital: 10000 });
    expect(r.equityCurve.every((e) => Number.isFinite(e))).toBe(true);
    expect(r.equityCurve[1]).toBeCloseTo(10000, 5); // 0 价 bar 不塌成 cash
    expect(r.totalReturn).toBeCloseTo(40, 5);
    expect(Number.isFinite(r.maxDrawdown)).toBe(true);
  });

  it('getClose 返回 NaN 不污染 totalReturn / maxDrawdown', () => {
    const klines = [{ close: 10 }, { close: NaN }, { close: 12 }];
    const r = backtest({ klines, strategy: buyFirst, initialCapital: 10000 });
    expect(r.equityCurve.every((e) => Number.isFinite(e))).toBe(true);
    expect(Number.isFinite(r.totalReturn)).toBe(true);
    expect(Number.isFinite(r.maxDrawdown)).toBe(true);
    expect(r.totalReturn).toBeCloseTo(20, 5);
  });
});
