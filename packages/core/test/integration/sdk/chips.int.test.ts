/**
 * 筹码分布集成测试(真实网络):三市场取数 → 本地计算链路冒烟。
 * 数值正确性由单测黄金对拍钉住,这里验证真实上游数据形状与合理性。
 */
import { describe, it, expect } from 'vitest';
import StockSDK from '../../../src/index';

const sdk = new StockSDK();

function assertSaneRows(
  rows: Awaited<ReturnType<typeof sdk.chips.cn>>,
  maxDays: number
) {
  expect(rows.length).toBeGreaterThan(0);
  expect(rows.length).toBeLessThanOrEqual(maxDays);
  for (const r of rows) {
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.profitRatio).not.toBeNull();
    expect(r.profitRatio!).toBeGreaterThanOrEqual(0);
    expect(r.profitRatio!).toBeLessThanOrEqual(1);
    expect(r.avgCost!).toBeGreaterThan(0);
    expect(r.cost90Low!).toBeLessThanOrEqual(r.cost90High!);
    expect(r.cost70Low!).toBeLessThanOrEqual(r.cost70High!);
    // 70% 区间是 90% 区间的子集
    expect(r.cost70Low!).toBeGreaterThanOrEqual(r.cost90Low!);
    expect(r.cost70High!).toBeLessThanOrEqual(r.cost90High!);
    expect(r.concentration90!).toBeGreaterThanOrEqual(0);
  }
}

describe('chips 筹码分布(integration)', () => {
  it('A股:600519 默认参数返回 90 日序列', async () => {
    const rows = await sdk.chips.cn('600519');
    expect(rows).toHaveLength(90);
    assertSaneRows(rows, 90);
    // 交易日应大致连续:首尾跨度在合理范围(90 交易日 ≈ 130 自然日左右)
    const first = new Date(rows[0].date).getTime();
    const last = new Date(rows[rows.length - 1].date).getTime();
    expect((last - first) / 86400000).toBeLessThan(220);
  });

  it('A股:直方图 last 模式,150 档,占比总和≈1', async () => {
    const rows = await sdk.chips.cn('600519', {
      days: 10,
      includeHistogram: 'last',
    });
    expect(rows).toHaveLength(10);
    const hist = rows[rows.length - 1].histogram!;
    expect(hist.prices).toHaveLength(150);
    expect(hist.ratios).toHaveLength(150);
    const sum = hist.ratios.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 2);
    // 价格档覆盖当前股价所在区间
    expect(rows[rows.length - 1].avgCost!).toBeGreaterThanOrEqual(hist.prices[0]);
    expect(rows[rows.length - 1].avgCost!).toBeLessThanOrEqual(
      hist.prices[hist.prices.length - 1]
    );
  }, 30000);

  it('港股:00700 返回筹码序列', async () => {
    const rows = await sdk.chips.hk('00700', { days: 10 });
    assertSaneRows(rows, 10);
  }, 30000);

  it('美股:105.AAPL 返回筹码序列', async () => {
    const rows = await sdk.chips.us('105.AAPL', { days: 10 });
    assertSaneRows(rows, 10);
  }, 30000);

  it('akshare 口径(range=0, adjust 不复权)可跑通', async () => {
    const rows = await sdk.chips.cn('000001', {
      days: 5,
      range: 0,
      adjust: '',
    });
    assertSaneRows(rows, 5);
  }, 60000);
});
