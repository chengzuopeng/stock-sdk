/**
 * 大宗交易 / 融资融券 集成测试
 */
import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('Eastmoney - Block Trade', () => {
  it('应获取大宗交易市场每日总览', async () => {
    const stat = await sdk.getBlockTradeMarketStat();
    expect(Array.isArray(stat)).toBe(true);
    expect(stat.length).toBeGreaterThan(0);

    const latest = stat[0];
    expect(latest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('应获取大宗交易明细（指定日期范围）', async () => {
    const list = await sdk.getBlockTradeDetail({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    });
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      expect(list[0].code).toMatch(/^\d{6}$/);
    }
  }, 60_000);
});

describe('Eastmoney - Margin Trading', () => {
  it('应获取融资融券账户统计', async () => {
    const margin = await sdk.getMarginAccountInfo();
    expect(Array.isArray(margin)).toBe(true);
    expect(margin.length).toBeGreaterThan(0);

    const latest = margin[0];
    expect(latest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(latest.finBalance).toBeGreaterThan(0);
  });

  it('应获取融资融券标的明细', async () => {
    const targets = await sdk.getMarginTargetList();
    expect(Array.isArray(targets)).toBe(true);
    if (targets.length > 0) {
      expect(targets[0].code).toBeTruthy();
      expect(targets[0].name).toBeTruthy();
    }
  }, 60_000);
});
