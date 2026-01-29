/**
 * 基金代码列表集成测试
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { StockSDK } from '../../../src';

describe('getFundCodeList', () => {
  let sdk: StockSDK;

  beforeAll(() => {
    sdk = new StockSDK();
  });

  it('should return fund code list as string array', async () => {
    const codes = await sdk.getFundCodeList();

    // 验证返回为数组
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBeGreaterThan(1000); // 基金数量应该很多

    // 验证代码格式（6位数字）
    const sampleCodes = codes.slice(0, 10);
    sampleCodes.forEach((code) => {
      expect(code).toMatch(/^\d{6}$/);
    });

    console.log(`基金总数: ${codes.length}`);
    console.log(`前10个代码: ${sampleCodes.join(', ')}`);
  });

  it('should cache the result on second call', async () => {
    // 第一次调用
    const codes1 = await sdk.getFundCodeList();
    // 第二次调用应该使用缓存
    const codes2 = await sdk.getFundCodeList();

    expect(codes1.length).toBe(codes2.length);
    expect(codes1[0]).toBe(codes2[0]);
  });
});
