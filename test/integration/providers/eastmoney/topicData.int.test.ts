/**
 * 涨停板 / 盘口异动 集成测试
 */
import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('Eastmoney - ZT Pool', () => {
  it('应获取今日涨停股池', async () => {
    const pool = await sdk.getZTPool('zt');
    // 非交易日可能为空
    expect(Array.isArray(pool)).toBe(true);

    if (pool.length > 0) {
      expect(pool[0].code).toMatch(/^\d{6}$/);
      expect(pool[0].name).toBeTruthy();
    }
  });

  it('应支持指定历史日期查询涨停池', async () => {
    // 使用一个已知的交易日（2024-10-08，节后第一天）
    // 接口对历史数据的保留时间不固定，仅验证调用成功 + 结构正确
    const pool = await sdk.getZTPool('zt', '20241008');
    expect(Array.isArray(pool)).toBe(true);
    if (pool.length > 0) {
      expect(pool[0].industry).toBeTruthy();
      expect(pool[0].code).toMatch(/^\d{6}$/);
    }
  });

  it('应获取强势股池', async () => {
    const pool = await sdk.getZTPool('strong', '20241008');
    expect(Array.isArray(pool)).toBe(true);
  });
});

describe('Eastmoney - Stock Changes', () => {
  it('应获取大笔买入异动', async () => {
    const changes = await sdk.getStockChanges('large_buy');
    expect(Array.isArray(changes)).toBe(true);

    if (changes.length > 0) {
      expect(changes[0].time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(changes[0].changeType).toBe('large_buy');
      expect(changes[0].changeTypeLabel).toBe('大笔买入');
    }
  });
});

describe('Eastmoney - Board Changes', () => {
  it('应获取板块异动详情', async () => {
    const boards = await sdk.getBoardChanges();
    expect(Array.isArray(boards)).toBe(true);
  });
});
