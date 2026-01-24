/**
 * 分红派送详情集成测试
 */
import { describe, it, expect } from 'vitest';
import { StockSDK } from '../../src';

describe('getDividendDetail 集成测试', () => {
  const sdk = new StockSDK();

  it('应获取贵州茅台的分红历史（完整字段）', async () => {
    const dividends = await sdk.getDividendDetail('600519');

    expect(dividends).toBeInstanceOf(Array);
    expect(dividends.length).toBeGreaterThan(0);

    // 验证完整数据结构
    const first = dividends[0];

    // 打印数据供验证
    console.log('Verified Dividend Data:', JSON.stringify(first, null, 2));

    // 基本信息
    expect(first).toHaveProperty('code');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('reportDate');
    expect(first).toHaveProperty('planNoticeDate');
    expect(first).toHaveProperty('disclosureDate');

    // 送转股份信息
    expect(first).toHaveProperty('assignTransferRatio');
    expect(first).toHaveProperty('bonusRatio');
    expect(first).toHaveProperty('transferRatio');

    // 现金分红信息
    expect(first).toHaveProperty('dividendPretax');
    expect(first).toHaveProperty('dividendDesc');
    expect(first).toHaveProperty('dividendYield');

    // 财务指标
    expect(first).toHaveProperty('eps');
    expect(first).toHaveProperty('bps');
    expect(first).toHaveProperty('capitalReserve');
    expect(first).toHaveProperty('unassignedProfit');
    expect(first).toHaveProperty('netProfitYoy');
    expect(first).toHaveProperty('totalShares');

    // 关键日期
    expect(first).toHaveProperty('equityRecordDate');
    expect(first).toHaveProperty('exDividendDate');
    expect(first).toHaveProperty('payDate');

    // 进度信息
    expect(first).toHaveProperty('assignProgress');
    expect(first).toHaveProperty('noticeDate');

    // 验证修正后的字段有实际值
    expect(first.code).toBe('600519');
    expect(first.name).toContain('茅台');
    expect(first.assignProgress).toBe('实施分配'); // ✅ 验证方案进度修复
    expect(first.dividendDesc).toContain('派'); // ✅ 验证分红描述修复
    expect(first.dividendYield).toBeGreaterThan(0); // ✅ 验证股息率补齐
    expect(first.bps).toBeGreaterThan(0); // ✅ 验证每股净资产补齐
    expect(first.netProfitYoy).toBeDefined(); // ✅ 验证净利润同比补齐
  });

  it('应支持带交易所前缀的股票代码', async () => {
    const dividends = await sdk.getDividendDetail('sh600519');

    expect(dividends).toBeInstanceOf(Array);
    expect(dividends.length).toBeGreaterThan(0);
    expect(dividends[0].code).toBe('600519');
  });

  it('应获取深市股票的分红历史', async () => {
    const dividends = await sdk.getDividendDetail('000858');

    expect(dividends).toBeInstanceOf(Array);
    expect(dividends.length).toBeGreaterThan(0);
    expect(dividends[0].code).toBe('000858');

    // 验证财务指标字段有值
    const first = dividends[0];
    expect(first.eps).toBeDefined();
    expect(first.bps).toBeDefined();
  });

  it('应获取创业板股票的分红历史', async () => {
    const dividends = await sdk.getDividendDetail('300073');

    expect(dividends).toBeInstanceOf(Array);
    // 创业板可能没有分红历史，只验证结构正确
    if (dividends.length > 0) {
      expect(dividends[0]).toHaveProperty('code');
      expect(dividends[0]).toHaveProperty('dividendPretax');
      expect(dividends[0]).toHaveProperty('dividendYield');
    }
  });

  it('不存在的股票代码应返回空数组', async () => {
    const dividends = await sdk.getDividendDetail('999999');

    expect(dividends).toBeInstanceOf(Array);
    expect(dividends.length).toBe(0);
  });
});
