/**
 * 筹码分布(CYQ)纯函数测试。
 *
 * 核心是「黄金对拍」:把东方财富前端的原版 CYQCalculator JS(即 akshare
 * `stock_cyq_em` 通过 py_mini_racer 运行的同一段代码)直接在 Node 里执行,
 * 与 TS 移植版逐日逐字段对比 —— 移植保真度由机器证明而非人工审读。
 */
import { describe, it, expect } from 'vitest';
import {
  calcChipDistribution,
  type ChipKlineLike,
} from '../../../src/indicators';

// ---------------------------------------------------------------------------
// 原版东财 CYQCalculator(逐字摘自 akshare stock_cyq_em.py 内嵌 JS,仅去掉
// 与执行无关的注释;字段约定:open/close/high/low/hsl,hsl 为换手率 %)
// ---------------------------------------------------------------------------
const ORIGINAL_JS = String.raw`
function CYQCalculator(index, klinedata) {
    var maxprice = 0;
    var minprice = 0;
    var factor = 150;
    var start = this.range ? Math.max(0, index - this.range + 1) : 0;
    var kdata = klinedata.slice(start, Math.max(1, index + 1));
    if (kdata.length === 0) throw 'invaild index';
    for (var i = 0; i < kdata.length; i++) {
        var elements = kdata[i];
        maxprice = !maxprice ? elements.high : Math.max(maxprice, elements.high);
        minprice = !minprice ? elements.low : Math.min(minprice, elements.low);
    }

    var accuracy = Math.max(0.01, (maxprice - minprice) / (factor - 1));
    var yrange = [];
    for (var i = 0; i < factor; i++) {
        yrange.push((minprice + accuracy * i).toFixed(2) / 1);
    }
    var xdata = createNumberArray(factor);

    for (var i = 0; i < kdata.length; i++) {
        var eles = kdata[i];

        var open = eles.open,
            close = eles.close,
            high = eles.high,
            low = eles.low,
            avg = (open + close + high + low) / 4,
            turnoverRate = Math.min(1, eles.hsl / 100 || 0);

        var H = Math.floor((high - minprice) / accuracy),
            L = Math.ceil((low - minprice) / accuracy),
            GPoint = [high == low ? factor - 1 : 2 / (high - low), Math.floor((avg - minprice) / accuracy)];
        for (var n = 0; n < xdata.length; n++) {
            xdata[n] *= (1 - turnoverRate);
        }

        if (high == low) {
            xdata[GPoint[1]] += GPoint[0] * turnoverRate / 2;
        } else {
            for (var j = L; j <= H; j++) {
                var curprice = minprice + accuracy * j;
                if (curprice <= avg) {
                    if (Math.abs(avg - low) < 1e-8) {
                        xdata[j] += GPoint[0] * turnoverRate;
                    } else {
                        xdata[j] += (curprice - low) / (avg - low) * GPoint[0] * turnoverRate;
                    }
                } else {
                    if (Math.abs(high - avg) < 1e-8) {
                        xdata[j] += GPoint[0] * turnoverRate;
                    } else {
                        xdata[j] += (high - curprice) / (high - avg) * GPoint[0] * turnoverRate;
                    }
                }
            }
        }

    }


    var currentprice = klinedata[index].close;
    var totalChips = 0;
    for (var i = 0; i < factor; i++) {
        var x = xdata[i].toPrecision(12) / 1;
        totalChips += x;
    }
    var result = new CYQData();
    result.x = xdata;
    result.y = yrange;
    result.benefitPart = result.getBenefitPart(currentprice);
    result.avgCost = getCostByChip(totalChips * 0.5).toFixed(2);
    result.percentChips = {
        '90': result.computePercentChips(0.9),
        '70': result.computePercentChips(0.7)
    };
    return result;

    function getCostByChip(chip) {
        var result = 0,
            sum = 0;
        for (var i = 0; i < factor; i++) {
            var x = xdata[i].toPrecision(12) / 1;
            if (sum + x > chip) {
                result = minprice + i * accuracy;
                break;
            }
            sum += x;
        }
        return result;
    }

    function CYQData() {
        this.x = arguments[0];
        this.y = arguments[1];
        this.benefitPart = arguments[2];
        this.avgCost = arguments[3];
        this.percentChips = arguments[4];
        this.computePercentChips = function (percent) {
            if (percent > 1 || percent < 0) throw 'argument "percent" out of range';
            var ps = [(1 - percent) / 2, (1 + percent) / 2];
            var pr = [getCostByChip(totalChips * ps[0]), getCostByChip(totalChips * ps[1])];
            return {
                priceRange: [pr[0].toFixed(2), pr[1].toFixed(2)],
                concentration: pr[0] + pr[1] === 0 ? 0 : (pr[1] - pr[0]) / (pr[0] + pr[1])
            };
        };
        this.getBenefitPart = function (price) {
            var below = 0;
            for (var i = 0; i < factor; i++) {
                var x = xdata[i].toPrecision(12) / 1;
                if (price >= minprice + i * accuracy) {
                    below += x;
                }
            }
            return totalChips == 0 ? 0 : below / totalChips;
        };
    }
}

function createNumberArray(count) {
    var array = [];
    for (var i = 0; i < count; i++) {
        array.push(0);
    }
    return array;
}
`;

interface OriginalResult {
  x: number[];
  y: number[];
  benefitPart: number;
  avgCost: string;
  percentChips: Record<
    '90' | '70',
    { priceRange: [string, string]; concentration: number }
  >;
}

type OriginalCalc = (
  this: { range?: number },
  index: number,
  klinedata: Array<{
    open: number;
    close: number;
    high: number;
    low: number;
    hsl: number | null;
  }>
) => OriginalResult;

const originalCalc = new Function(
  `${ORIGINAL_JS}; return CYQCalculator;`
)() as OriginalCalc;

// ---------------------------------------------------------------------------
// 确定性样本数据(种子 LCG 随机游走,含一字板与涨跌停日,不依赖 Math.random)
// ---------------------------------------------------------------------------
function makeBars(count: number, seed = 42): ChipKlineLike[] {
  let state = seed;
  const rand = (): number => {
    // Park–Miller LCG
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };

  const bars: ChipKlineLike[] = [];
  let close = 20;
  const base = new Date(Date.UTC(2024, 0, 1));
  for (let i = 0; i < count; i++) {
    const date = new Date(base.getTime() + i * 86400000)
      .toISOString()
      .slice(0, 10);
    if (i > 0 && i % 37 === 0) {
      // 一字板日:OHLC 四价合一(触发矩形堆叠分支)
      const p = Number((close * 1.1).toFixed(2));
      bars.push({ date, open: p, high: p, low: p, close: p, turnoverRate: 0.35 });
      close = p;
      continue;
    }
    const drift = (rand() - 0.5) * 0.08;
    const open = Number((close * (1 + (rand() - 0.5) * 0.02)).toFixed(2));
    close = Number((close * (1 + drift)).toFixed(2));
    const high = Number((Math.max(open, close) * (1 + rand() * 0.03)).toFixed(2));
    const low = Number((Math.min(open, close) * (1 - rand() * 0.03)).toFixed(2));
    const turnoverRate = Number((0.1 + rand() * 14).toFixed(4));
    bars.push({ date, open, high, low, close, turnoverRate });
  }
  return bars;
}

/** 原版结果读数(与 TS 输出同口径:价格 2 位、原始比例值) */
function readOriginal(o: OriginalResult) {
  return {
    profitRatio: o.benefitPart,
    avgCost: Number(o.avgCost),
    cost90Low: Number(o.percentChips['90'].priceRange[0]),
    cost90High: Number(o.percentChips['90'].priceRange[1]),
    concentration90: o.percentChips['90'].concentration,
    cost70Low: Number(o.percentChips['70'].priceRange[0]),
    cost70High: Number(o.percentChips['70'].priceRange[1]),
    concentration70: o.percentChips['70'].concentration,
  };
}

describe('calcChipDistribution — 与东财原版 JS 黄金对拍', () => {
  const bars = makeBars(210);
  const originalRows = (range: number | undefined) =>
    bars.map((_, i) =>
      originalCalc.call(
        range ? { range } : {},
        i,
        bars.map((b) => ({
          open: b.open!,
          close: b.close!,
          high: b.high!,
          low: b.low!,
          hsl: b.turnoverRate,
        }))
      )
    );

  function assertParity(range: number) {
    const ours = calcChipDistribution(bars, { range, decimals: 12 });
    const originals = originalRows(range || undefined);
    expect(ours).toHaveLength(bars.length);
    for (let i = 0; i < bars.length; i++) {
      const expected = readOriginal(originals[i]);
      const got = ours[i];
      expect(got.date).toBe(bars[i].date);
      expect(got.profitRatio!).toBeCloseTo(expected.profitRatio, 9);
      expect(got.avgCost!).toBe(expected.avgCost);
      expect(got.cost90Low!).toBe(expected.cost90Low);
      expect(got.cost90High!).toBe(expected.cost90High);
      expect(got.concentration90!).toBeCloseTo(expected.concentration90, 9);
      expect(got.cost70Low!).toBe(expected.cost70Low);
      expect(got.cost70High!).toBe(expected.cost70High);
      expect(got.concentration70!).toBeCloseTo(expected.concentration70, 9);
    }
  }

  it('range=120(东财 App 口径)逐日逐字段一致', () => {
    assertParity(120);
  });

  it('range=0(akshare stock_cyq_em 全量累计口径)逐日逐字段一致', () => {
    assertParity(0);
  });

  it('直方图与原版 x/y 分布一致(prices 精确相等,ratios = 归一化 x)', () => {
    const ours = calcChipDistribution(bars, {
      range: 120,
      includeHistogram: 'all',
      decimals: 12,
    });
    const originals = originalRows(120);
    for (let i = 0; i < bars.length; i++) {
      const hist = ours[i].histogram!;
      const orig = originals[i];
      expect(hist.prices).toEqual(orig.y);
      const total = orig.x.reduce(
        (sum, v) => sum + Number(v.toPrecision(12)),
        0
      );
      const ratioSum = hist.ratios.reduce((a, b) => a + b, 0);
      expect(ratioSum).toBeCloseTo(1, 3);
      for (let j = 0; j < hist.ratios.length; j++) {
        expect(hist.ratios[j]).toBeCloseTo(
          Number(orig.x[j].toPrecision(12)) / total,
          6
        );
      }
    }
  });

  it('range=120 与 range=0 的结果确实不同(窗口口径生效)', () => {
    const windowed = calcChipDistribution(bars, { range: 120, decimals: 6 });
    const cumulative = calcChipDistribution(bars, { range: 0, decimals: 6 });
    const last = bars.length - 1;
    // 210 根数据下,第 210 日的 120 窗口分布与全量累计分布必然不同
    expect(windowed[last].avgCost).not.toBe(cumulative[last].avgCost);
  });
});

describe('calcChipDistribution — 选项与边界', () => {
  const bars = makeBars(60, 7);

  it('空输入返回空数组', () => {
    expect(calcChipDistribution([])).toEqual([]);
  });

  it('tail 只输出尾部 N 行,且与全量计算的尾部逐值一致', () => {
    const full = calcChipDistribution(bars, { range: 20 });
    const tailed = calcChipDistribution(bars, { range: 20, tail: 10 });
    expect(tailed).toHaveLength(10);
    expect(tailed).toEqual(full.slice(-10));
  });

  it('tail 大于输入长度时输出全部行', () => {
    expect(calcChipDistribution(bars, { tail: 999 })).toHaveLength(bars.length);
  });

  it('tail <= 0 输出空数组(文档口径 min(tail, n)),非整数向下取整', () => {
    expect(calcChipDistribution(bars, { tail: 0 })).toEqual([]);
    expect(calcChipDistribution(bars, { tail: -3 })).toEqual([]);
    const floored = calcChipDistribution(bars, { tail: 2.9 });
    expect(floored).toHaveLength(2);
    expect(floored).toEqual(calcChipDistribution(bars, { tail: 2 }));
  });

  it('负换手率被夹到 0(等价于当日不换手),不再反转衰减/叠加负筹码', () => {
    const withNegative = bars.map((b, i) =>
      i === 30 ? { ...b, turnoverRate: -50 } : b
    );
    const withZero = bars.map((b, i) =>
      i === 30 ? { ...b, turnoverRate: 0 } : b
    );
    expect(calcChipDistribution(withNegative)).toEqual(
      calcChipDistribution(withZero)
    );
  });

  it("includeHistogram: 'last' / true 仅最后一行附带直方图", () => {
    for (const mode of ['last', true] as const) {
      const rows = calcChipDistribution(bars, { includeHistogram: mode });
      expect(rows[rows.length - 1].histogram).toBeDefined();
      expect(rows[rows.length - 1].histogram!.prices).toHaveLength(150);
      expect(rows.slice(0, -1).every((r) => r.histogram === undefined)).toBe(true);
    }
  });

  it("includeHistogram: 'all' 每行都附带;默认不附带", () => {
    const all = calcChipDistribution(bars, { includeHistogram: 'all' });
    expect(all.every((r) => r.histogram !== undefined)).toBe(true);
    const none = calcChipDistribution(bars);
    expect(none.every((r) => r.histogram === undefined)).toBe(true);
  });

  it('直方图价格档单调不减,占比全部非负', () => {
    const rows = calcChipDistribution(bars, { includeHistogram: 'last' });
    const { prices, ratios } = rows[rows.length - 1].histogram!;
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
    expect(ratios.every((r) => r >= 0)).toBe(true);
  });

  it('decimals 默认 3:比例类字段最多 3 位小数,价格类字段固定 2 位', () => {
    const rows = calcChipDistribution(bars);
    for (const r of rows) {
      if (r.profitRatio !== null) {
        expect(r.profitRatio).toBe(Number(r.profitRatio.toFixed(3)));
      }
      if (r.concentration90 !== null) {
        expect(r.concentration90).toBe(Number(r.concentration90.toFixed(3)));
      }
      if (r.avgCost !== null) {
        expect(r.avgCost).toBe(Number(r.avgCost.toFixed(2)));
      }
    }
  });

  it('换手率 null 与 0 等价(东财 hsl/100 || 0 语义)', () => {
    const withNull = bars.map((b, i) =>
      i === 30 ? { ...b, turnoverRate: null } : b
    );
    const withZero = bars.map((b, i) =>
      i === 30 ? { ...b, turnoverRate: 0 } : b
    );
    expect(calcChipDistribution(withNull)).toEqual(
      calcChipDistribution(withZero)
    );
  });

  it('OHLC 含 null 的脏行被跳过:等价于剔除该行后计算(尾行对比)', () => {
    const dirty: ChipKlineLike[] = [
      ...bars.slice(0, 30),
      { date: 'dirty', open: null, high: 10, low: 9, close: 9.5, turnoverRate: 5 },
      ...bars.slice(30),
    ];
    const clean = calcChipDistribution(bars, { tail: 1 })[0];
    const skipped = calcChipDistribution(dirty, { tail: 1 })[0];
    expect(skipped).toEqual(clean);
  });

  it('当前行 close 为 null 时 profitRatio 为 null,其余统计仍输出', () => {
    const rows = calcChipDistribution(
      [...bars, { date: 'x', open: null, high: null, low: null, close: null, turnoverRate: null }],
      { tail: 1 }
    );
    expect(rows[0].profitRatio).toBeNull();
    expect(rows[0].avgCost).not.toBeNull();
  });

  it('窗口内换手全为 0(分布退化)输出全 null 行', () => {
    const flat: ChipKlineLike[] = Array.from({ length: 10 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: 10,
      high: 11,
      low: 9,
      close: 10,
      turnoverRate: 0,
    }));
    const rows = calcChipDistribution(flat);
    for (const r of rows) {
      expect(r.profitRatio).toBeNull();
      expect(r.avgCost).toBeNull();
      expect(r.cost90Low).toBeNull();
      expect(r.concentration70).toBeNull();
    }
  });

  it('脏数据(open 远超 high)不撑爆价格档数组:一字板 avg 偏出价格域被夹逼,输出无 NaN', () => {
    // open=1e12 使 avg 远超窗口 max;未夹逼时 gIndex 会把 xdata 撑成稀疏
    // 巨数组,后续 decay 按 length 遍历直接卡死
    const dirty: ChipKlineLike[] = [
      { date: 'd1', open: 10, high: 11, low: 9, close: 10, turnoverRate: 5 },
      { date: 'd2', open: 1e12, high: 10, low: 10, close: 10, turnoverRate: 5 },
      { date: 'd3', open: 10, high: 11, low: 9, close: 10, turnoverRate: 5 },
    ];
    const rows = calcChipDistribution(dirty, { includeHistogram: 'all' });
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(Number.isFinite(r.avgCost!)).toBe(true);
      expect(r.histogram!.prices).toHaveLength(150);
      expect(r.histogram!.ratios.every((v) => Number.isFinite(v))).toBe(true);
    }
  });

  it('零/负价格窗口(前复权场景)min/max 正确:不被原版 !maxprice 语义错误覆盖', () => {
    // 高分红老股 qfq 早年价格可为 0 或负;high 序列 [0, -1] 在原版写法下
    // maxprice 会被 -1 错误覆盖(!0 为 true)
    const negative: ChipKlineLike[] = [
      { date: 'n1', open: -1, high: 0, low: -2, close: -1, turnoverRate: 8 },
      { date: 'n2', open: -2, high: -1, low: -3, close: -2, turnoverRate: 8 },
    ];
    const rows = calcChipDistribution(negative, { includeHistogram: 'last' });
    const { prices } = rows[1].histogram!;
    // 窗口价格域应为 [-3, 0]:最高档接近 0(而非被覆盖成 -1)
    expect(prices[0]).toBe(-3);
    expect(prices[prices.length - 1]).toBeCloseTo(0, 2);
  });

  it('单根一字板 + 有换手:全部筹码堆在单一价格档', () => {
    const rows = calcChipDistribution(
      [{ date: 'd', open: 10, high: 10, low: 10, close: 10, turnoverRate: 50 }],
      { includeHistogram: 'last' }
    );
    const { ratios } = rows[0].histogram!;
    expect(ratios.filter((r) => r > 0)).toHaveLength(1);
    expect(rows[0].avgCost).toBe(10);
    // 收盘价 >= 唯一成本档 → 获利比例 1
    expect(rows[0].profitRatio).toBe(1);
  });
});
