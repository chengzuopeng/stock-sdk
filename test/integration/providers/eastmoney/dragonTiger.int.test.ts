/**
 * 龙虎榜 集成测试
 */
import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('Eastmoney - Dragon Tiger Detail', () => {
  it('应获取指定日期范围的龙虎榜详情', async () => {
    const list = await sdk.getDragonTigerDetail({
      startDate: '20240101',
      endDate: '20240131',
    });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);

    const first = list[0];
    expect(first.code).toMatch(/^\d{6}$/);
    expect(first.name).toBeTruthy();
    expect(first.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(first.reason).toBeTruthy();
  }, 60_000);
});

describe('Eastmoney - Dragon Tiger Stock Stats', () => {
  it('应获取近一月个股上榜统计', async () => {
    const stats = await sdk.getDragonTigerStockStats('1month');
    expect(Array.isArray(stats)).toBe(true);
    expect(stats.length).toBeGreaterThan(0);

    const top = stats[0];
    expect(top.code).toBeTruthy();
    expect(top.count).toBeGreaterThanOrEqual(1);
  }, 60_000);
});

describe('Eastmoney - Dragon Tiger Branch Rank', () => {
  it('应获取近一月营业部排行', async () => {
    const branches = await sdk.getDragonTigerBranchRank('1month');
    expect(Array.isArray(branches)).toBe(true);
    if (branches.length > 0) {
      expect(branches[0].name).toBeTruthy();
    }
  }, 60_000);
});
