/**
 * 期权接口集成测试（需要真实网络请求）
 */
import { describe, it, expect } from 'vitest';
import { StockSDK } from '../../../../src';

const sdk = new StockSDK({ retry: { maxRetries: 2 } });

describe('Index Option (CFFEX) - Integration', () => {
  it('should fetch index option kline for a CFFEX contract', async () => {
    const klines = await sdk.getIndexOptionKline('io2506C4000');
    expect(Array.isArray(klines)).toBe(true);
    if (klines.length > 0) {
      expect(klines[0]).toHaveProperty('date');
      expect(klines[0]).toHaveProperty('open');
      expect(klines[0]).toHaveProperty('close');
      expect(klines[0]).toHaveProperty('volume');
    }
  });
});

describe('ETF Option (SSE) - Integration', () => {
  it('should fetch ETF option months for 50ETF', async () => {
    const info = await sdk.getETFOptionMonths('50ETF');
    expect(info).toHaveProperty('months');
    expect(Array.isArray(info.months)).toBe(true);
    expect(info.months.length).toBeGreaterThan(0);
    expect(info.stockId).toBe('510050');
  });

  it('should fetch ETF option expire day', async () => {
    const months = await sdk.getETFOptionMonths('50ETF');
    if (months.months.length > 0) {
      const info = await sdk.getETFOptionExpireDay('50ETF', months.months[0]);
      expect(info).toHaveProperty('expireDay');
      expect(info).toHaveProperty('remainderDays');
      expect(typeof info.remainderDays).toBe('number');
    }
  });
});

describe('CFFEX Option Quotes (Eastmoney) - Integration', () => {
  it('should fetch all CFFEX option quotes', async () => {
    const quotes = await sdk.getCFFEXOptionQuotes();
    expect(Array.isArray(quotes)).toBe(true);
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0]).toHaveProperty('code');
    expect(quotes[0]).toHaveProperty('name');
    expect(quotes[0]).toHaveProperty('price');
    expect(quotes[0]).toHaveProperty('strikePrice');
    expect(quotes[0]).toHaveProperty('remainDays');
  });
});

describe('Commodity Option - Integration', () => {
  it('should fetch commodity option kline for a gold contract', async () => {
    const klines = await sdk.getCommodityOptionKline('au2506C660');
    expect(Array.isArray(klines)).toBe(true);
    if (klines.length > 0) {
      expect(klines[0]).toHaveProperty('date');
      expect(klines[0]).toHaveProperty('close');
    }
  });
});
