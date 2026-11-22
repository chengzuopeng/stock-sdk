/**
 * 回测引擎 2026-07 全量 review 修复的回归测试。
 *
 * 覆盖：入口参数校验、无效价 bar 信号挂起（不再静默丢弃）、强平 Trade 的
 * exitIndex/forced 修正、maxDrawdown 以 initialCapital 为基线、null bar 防护、
 * buyHoldReturn / validBars、positionSize、买卖不对称 fee、getDate、
 * sortBy 字符串数值归一与 direction 校验。
 */
import { describe, it, expect } from 'vitest';
import { screen, backtest, type Strategy } from '../../../src/screener';
import { InvalidArgumentError } from '../../../src/core';

type Bar = { close: number | null; date?: string };
const buyFirst: Strategy<Bar> = (_b, i) => (i === 0 ? 'buy' : 'hold');
const k = (close: number | null, date?: string): Bar =>
  date === undefined ? { close } : { close, date };

describe('入口参数校验（InvalidArgumentError，对齐 top(n) 先例）', () => {
  const klines = [k(10), k(12)];

  it('fee >= 1 / 负数 / NaN 全部拒绝', () => {
    for (const fee of [1, 1.5, -0.1, NaN]) {
      expect(() => backtest({ klines, strategy: buyFirst, fee })).toThrow(
        InvalidArgumentError
      );
    }
  });

  it('对象形式 fee 逐侧校验', () => {
    expect(() =>
      backtest({ klines, strategy: buyFirst, fee: { buy: 0.0003, sell: 1 } })
    ).toThrow(InvalidArgumentError);
    expect(() =>
      backtest({ klines, strategy: buyFirst, fee: { buy: NaN, sell: 0 } })
    ).toThrow(InvalidArgumentError);
  });

  it('fee: null 视同未传（不抛裸 TypeError）；字符串 fee 以准确文案拒绝', () => {
    const r = backtest({
      klines,
      strategy: buyFirst,
      fee: null as unknown as number,
      initialCapital: 10000,
    });
    expect(r.totalReturn).toBeCloseTo(20, 5); // 10 → 12 无费
    expect(() =>
      backtest({ klines, strategy: buyFirst, fee: '0.001' as unknown as number })
    ).toThrow(/fee 必须是数字或/);
  });

  it('initialCapital 0 / 负数 / NaN / Infinity 全部拒绝', () => {
    for (const initialCapital of [0, -10000, NaN, Infinity]) {
      expect(() =>
        backtest({ klines, strategy: buyFirst, initialCapital })
      ).toThrow(InvalidArgumentError);
    }
  });

  it('positionSize 0 / >1 / NaN 全部拒绝', () => {
    for (const positionSize of [0, 1.5, -0.5, NaN]) {
      expect(() =>
        backtest({ klines, strategy: buyFirst, positionSize })
      ).toThrow(InvalidArgumentError);
    }
  });
});

describe('无效价 bar 的信号挂起（不再静默丢弃）', () => {
  it('一次性 buy 落在无效 bar → 下一有效 bar 成交（此前永久丢失）', () => {
    const onceBuy: Strategy<Bar> = (_b, i) => (i === 1 ? 'buy' : 'hold');
    const r = backtest({
      klines: [k(10), k(NaN), k(12), k(20)],
      strategy: onceBuy,
      initialCapital: 10000,
    });
    // 挂起到 i=2 以 12 买入，20 强平 → +66.67%
    expect(r.tradeCount).toBe(1);
    expect(r.trades[0].entryIndex).toBe(2);
    expect(r.trades[0].entryPrice).toBe(12);
    expect(r.totalReturn).toBeCloseTo((20 / 12 - 1) * 100, 5);
  });

  it('一次性 sell 落在停牌 bar → 复牌首根成交（不再骑到强平）', () => {
    const strat: Strategy<Bar> = (_b, i) => {
      if (i === 0) return 'buy';
      if (i === 2) return 'sell';
      return 'hold';
    };
    const r = backtest({
      klines: [k(10), k(20), k(0), k(25), k(5)],
      strategy: strat,
      initialCapital: 10000,
    });
    // sell 挂起到 i=3 以 25 成交 → +150%；此前被丢弃、骑到末根 5 强平 → -50%
    expect(r.tradeCount).toBe(1);
    expect(r.trades[0]).toMatchObject({ exitIndex: 3, exitPrice: 25, forced: false });
    expect(r.totalReturn).toBeCloseTo(150, 5);
  });

  it('下一有效 bar 上的新信号优先于挂起信号', () => {
    // i=1(无效)发 sell 挂起；i=2 策略改口 buy —— 空仓下 buy 生效、挂起 sell 作废
    const strat: Strategy<Bar> = (_b, i) => {
      if (i === 1) return 'sell';
      if (i === 2) return 'buy';
      return 'hold';
    };
    const r = backtest({
      klines: [k(10), k(null), k(12), k(15)],
      strategy: strat,
      initialCapital: 10000,
    });
    expect(r.tradeCount).toBe(1);
    expect(r.trades[0].entryIndex).toBe(2);
    expect(r.totalReturn).toBeCloseTo((15 / 12 - 1) * 100, 5);
  });

  it('挂起信号执行后即清空，不会重复触发', () => {
    // i=1 无效 buy 挂起 → i=2 成交；i=3 再无信号，不应重复买卖
    const onceBuy: Strategy<Bar> = (_b, i) => (i === 1 ? 'buy' : 'hold');
    const r = backtest({
      klines: [k(10), k(0), k(12), k(12), k(12)],
      strategy: onceBuy,
      initialCapital: 10000,
    });
    expect(r.tradeCount).toBe(1);
  });
});

describe('强制平仓 Trade 记录', () => {
  it('尾部无效 bar：exitIndex 指向最后有效 bar（价格与下标同根），forced=true', () => {
    const r = backtest({
      klines: [k(10), k(14), k(NaN)],
      strategy: buyFirst,
      initialCapital: 10000,
    });
    expect(r.trades[0]).toMatchObject({
      exitIndex: 1,
      exitPrice: 14,
      forced: true,
    });
  });

  it('信号出场 forced=false', () => {
    const strat: Strategy<Bar> = (_b, i) =>
      i === 0 ? 'buy' : i === 1 ? 'sell' : 'hold';
    const r = backtest({ klines: [k(10), k(12)], strategy: strat });
    expect(r.trades[0].forced).toBe(false);
  });

  it('强平结算记账在出场 bar，停牌尾部无幽灵费差（equity 与 exitIndex 同根）', () => {
    const r = backtest({
      klines: [k(10), k(14), k(NaN), k(NaN)],
      strategy: buyFirst,
      fee: 0.01,
      initialCapital: 10000,
    });
    // position = 9900/10 = 990；出场 14 → cash = 990*14*0.99 = 13721.4
    // 卖出费在出场 bar(1) 即刻体现，尾部无效 bar 全为现金 —— 不再出现 13860 → 13721.4 的幽灵下跌
    expect(r.trades[0]).toMatchObject({ exitIndex: 1, exitPrice: 14, forced: true });
    expect(r.equityCurve).toEqual([9900, 13721.4, 13721.4, 13721.4]);
  });

  it('尾部无效 bar 上挂起的 sell 视为策略出场（forced=false）', () => {
    const strat: Strategy<Bar> = (_b, i) => {
      if (i === 0) return 'buy';
      if (i === 2) return 'sell'; // 发在 NaN bar 上，数据走完前没有下一根有效价
      return 'hold';
    };
    const r = backtest({
      klines: [k(10), k(20), k(NaN)],
      strategy: strat,
      initialCapital: 10000,
    });
    expect(r.tradeCount).toBe(1);
    expect(r.trades[0]).toMatchObject({ exitIndex: 1, exitPrice: 20, forced: false });
  });

  it('null 空洞 bar 不进 strategy（策略可安全解引用 bar）', () => {
    const derefStrategy: Strategy<Bar> = (bar, i) =>
      i === 0 && bar.close != null ? 'buy' : 'hold'; // 解引用 bar.close
    const klines = [k(10), null as unknown as Bar, k(12)];
    expect(() =>
      backtest({ klines, strategy: derefStrategy, initialCapital: 10000 })
    ).not.toThrow();
    const r = backtest({ klines, strategy: derefStrategy, initialCapital: 10000 });
    expect(r.totalReturn).toBeCloseTo(20, 5);
  });

  it('末根 bar 买入 → 同根强平，forced=true 且 entryIndex===exitIndex', () => {
    const lastBuy: Strategy<Bar> = (_b, i, series) =>
      i === series.length - 1 ? 'buy' : 'hold';
    const r = backtest({
      klines: [k(10), k(12)],
      strategy: lastBuy,
      fee: 0.001,
      initialCapital: 10000,
    });
    expect(r.tradeCount).toBe(1);
    expect(r.trades[0].entryIndex).toBe(1);
    expect(r.trades[0].exitIndex).toBe(1);
    expect(r.trades[0].forced).toBe(true);
    // 纯费差亏损：(1-0.001)^2 - 1 ≈ -0.1999%
    expect(r.trades[0].returnPercent).toBeCloseTo((0.999 * 0.999 - 1) * 100, 6);
  });
});

describe('maxDrawdown 以 initialCapital 为基线', () => {
  it('bar0 买入的入场手续费回撤可见（此前报 1.0%，现 1.99%）', () => {
    const r = backtest({
      klines: [k(10), k(10), k(10)],
      strategy: buyFirst,
      fee: 0.01,
      initialCapital: 10000,
    });
    // equity [9900, 9900, 9801(强平)]，peak=10000 → dd = 199/10000
    expect(r.maxDrawdown).toBeCloseTo(1.99, 5);
  });

  it('具体回撤数值断言（此前测试只断言过 >= 0）', () => {
    const r = backtest({
      klines: [k(10), k(12), k(9), k(11)],
      strategy: buyFirst,
      initialCapital: 10000,
    });
    // equity [10000,12000,9000,11000]，peak 12000 → dd = 3000/12000 = 25%
    expect(r.maxDrawdown).toBeCloseTo(25, 5);
  });

  it('bar0 与 bar1 买入的同经济学回撤一致（此前差 2 倍）', () => {
    const buyAt = (n: number): Strategy<Bar> => (_b, i) =>
      i === n ? 'buy' : 'hold';
    const flat = [k(10), k(10), k(10), k(10)];
    const r0 = backtest({ klines: flat, strategy: buyAt(0), fee: 0.01 });
    const r1 = backtest({ klines: flat, strategy: buyAt(1), fee: 0.01 });
    expect(r0.maxDrawdown).toBeCloseTo(r1.maxDrawdown, 5);
  });
});

describe('null bar / 静默平坦报告防护', () => {
  it('klines 含 null 元素不抛裸 TypeError，按无效 bar 处理', () => {
    const klines = [k(10), null as unknown as Bar, k(12)];
    const r = backtest({ klines, strategy: buyFirst, initialCapital: 10000 });
    expect(r.totalReturn).toBeCloseTo(20, 5);
    expect(r.validBars).toBe(2);
  });

  it('字段名不是 close（如分时 price）→ validBars=0 可判别，不再无提示', () => {
    const timeline = [{ price: 10 }, { price: 12 }] as unknown as Bar[];
    const r = backtest({ klines: timeline, strategy: buyFirst });
    expect(r.validBars).toBe(0);
    expect(r.tradeCount).toBe(0);
    expect(r.totalReturn).toBe(0);
    expect(r.buyHoldReturn).toBe(0);
  });
});

describe('buyHoldReturn / validBars', () => {
  it('买入持有基准：首根有效收盘 → 末根有效收盘，不含费', () => {
    const noop: Strategy<Bar> = () => 'hold';
    const r = backtest({
      klines: [k(NaN), k(10), k(12), k(14), k(0)],
      strategy: noop,
      fee: 0.01,
    });
    expect(r.buyHoldReturn).toBeCloseTo(40, 5); // 10 → 14，跳过首尾无效
    expect(r.validBars).toBe(3);
  });
});

describe('positionSize 半仓', () => {
  it('equity 含闲置现金，returnPercent 相对本笔投入', () => {
    const r = backtest({
      klines: [k(10), k(12)],
      strategy: buyFirst,
      initialCapital: 10000,
      positionSize: 0.5,
    });
    // 投入 5000 → 500 股；强平 12 → 现金 5000 + 6000 = 11000
    expect(r.finalEquity).toBeCloseTo(11000, 5);
    expect(r.totalReturn).toBeCloseTo(10, 5); // 整体 +10%
    expect(r.trades[0].returnPercent).toBeCloseTo(20, 5); // 本笔 +20%
  });
});

describe('买卖不对称 fee（A 股印花税形态）', () => {
  it('returnPercent 与现金路径一致', () => {
    const r = backtest({
      klines: [k(10), k(20)],
      strategy: buyFirst,
      initialCapital: 10000,
      fee: { buy: 0, sell: 0.1 },
    });
    // (20/10)*(1-0)*(1-0.1) - 1 = 80%
    expect(r.trades[0].returnPercent).toBeCloseTo(80, 5);
    expect(r.totalReturn).toBeCloseTo(80, 5);
    expect(r.finalEquity).toBeCloseTo(18000, 5);
  });
});

describe('getDate 成交日期', () => {
  it('传入 getDate 时 Trade 带 entryDate/exitDate', () => {
    const r = backtest({
      klines: [k(10, '2026-01-01'), k(12, '2026-01-02')],
      strategy: buyFirst,
      getDate: (b) => b.date,
    });
    expect(r.trades[0].entryDate).toBe('2026-01-01');
    expect(r.trades[0].exitDate).toBe('2026-01-02');
  });

  it('不传 getDate 时字段缺省', () => {
    const r = backtest({ klines: [k(10), k(12)], strategy: buyFirst });
    expect(r.trades[0].entryDate).toBeUndefined();
    expect(r.trades[0].exitDate).toBeUndefined();
  });
});

describe('sortBy 字符串数值 + direction 校验', () => {
  it('字符串数值参与排序，真实最大值不再沉底', () => {
    const rows = [
      { code: 'a', amount: '900' as number | string },
      { code: 'b', amount: 100 },
      { code: 'c', amount: '999999' },
      { code: 'd', amount: 50 },
    ];
    const top2 = screen(rows)
      .sortBy((x) => x.amount)
      .top(2);
    expect(top2.map((x) => x.code)).toEqual(['c', 'a']);
  });

  it('空串 / 非数值字符串仍沉底', () => {
    const rows = [{ v: '' }, { v: 'abc' }, { v: '5' }, { v: 3 }] as {
      v: number | string;
    }[];
    const sorted = screen(rows)
      .sortBy((x) => x.v, 'asc')
      .toArray();
    expect(sorted.slice(0, 2).map((x) => x.v)).toEqual([3, '5']);
  });

  it("direction 非 'asc'/'desc' 抛 InvalidArgumentError（此前 'ASC' 静默降序）", () => {
    expect(() =>
      screen([{ v: 1 }, { v: 2 }]).sortBy(
        (x) => x.v,
        'ASC' as unknown as 'asc'
      )
    ).toThrow(InvalidArgumentError);
  });
});
