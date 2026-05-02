/**
 * 沪深港通 / 北向资金 集成测试
 */
import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('Eastmoney - Northbound Minute', () => {
  it('应获取北向资金分时数据', async () => {
    const points = await sdk.getNorthboundMinute('north');
    // 非交易日可能为空，所以只验证类型
    expect(Array.isArray(points)).toBe(true);

    if (points.length > 0) {
      // 服务端可能返回 '9:30' 或 '09:30'，兼容两种
      expect(points[0].time).toMatch(/^\d{1,2}:\d{2}/);
      expect(points[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('应获取南向资金分时数据', async () => {
    const points = await sdk.getNorthboundMinute('south');
    expect(Array.isArray(points)).toBe(true);
  });
});

describe('Eastmoney - Northbound Flow Summary', () => {
  it('应获取沪深港通市场资金流向汇总', async () => {
    const summary = await sdk.getNorthboundFlowSummary();
    expect(summary.length).toBeGreaterThan(0);
    expect(summary[0].boardName).toBeTruthy();
  });
});

describe('Eastmoney - Northbound Holding Rank', () => {
  it('应获取北向持股 5 日排行（全市场）', async () => {
    const rank = await sdk.getNorthboundHoldingRank({
      market: 'all',
      period: '5day',
    });
    // 非交易日 / 接口慢，可能为空
    expect(Array.isArray(rank)).toBe(true);
    if (rank.length > 0) {
      expect(rank[0].code).toBeTruthy();
      expect(rank[0].name).toBeTruthy();
    }
  }, 60_000);
});
