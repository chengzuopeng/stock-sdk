import { describe, it, expect } from 'vitest';
import StockSDK from '../../../index';

const sdk = new StockSDK();

describe('TencentStockSDK - Quotes', () => {
  describe('getFullQuotes', () => {
    it('should return A股全量行情', async () => {
      const res = await sdk.getFullQuotes(['sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('000858');
      expect(q.name).toContain('粮');
      expect(typeof q.price).toBe('number');
      expect(q.bid.length).toBe(5);
      expect(q.ask.length).toBe(5);
    });

    it('should handle multiple full quotes', async () => {
      const codes = ['sz000858', 'sh600000', 'sz000001', 'sh600519'];
      const res = await sdk.getFullQuotes(codes);
      expect(res.length).toBe(4);
    });

    it('should return empty for empty codes', async () => {
      const res = await sdk.getFullQuotes([]);
      expect(res).toEqual([]);
    });
  });

  describe('getSimpleQuotes', () => {
    it('should return 简要行情', async () => {
      const res = await sdk.getSimpleQuotes(['sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('000858');
      expect(typeof q.price).toBe('number');
    });

    it('should return 指数简要行情', async () => {
      const res = await sdk.getSimpleQuotes(['sh000001']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('000001');
      expect(q.name).toContain('指数');
    });

    it('should handle multiple simple quotes', async () => {
      const codes = ['sz000858', 'sh000001'];
      const res = await sdk.getSimpleQuotes(codes);
      expect(res.length).toBe(2);
    });

    it('should return empty for empty codes', async () => {
      const res = await sdk.getSimpleQuotes([]);
      expect(res).toEqual([]);
    });
  });

  describe('getHKQuotes', () => {
    it('should return 港股行情 with full fields', async () => {
      const res = await sdk.getHKQuotes(['00700']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('00700');
      expect(typeof q.price).toBe('number');
      expect(q).toHaveProperty('prevClose');
      expect(q).toHaveProperty('open');
      expect(q).toHaveProperty('high');
      expect(q).toHaveProperty('low');
      expect(q).toHaveProperty('volume');
      expect(q).toHaveProperty('amount');
      expect(q).toHaveProperty('time');
      expect(q).toHaveProperty('currency');
      expect(q).toHaveProperty('totalMarketCap');
    });

    it('should handle multiple HK quotes', async () => {
      const res = await sdk.getHKQuotes(['09988', '00700']);
      expect(res.length).toBe(2);
    });

    it('should return empty for empty codes', async () => {
      const res = await sdk.getHKQuotes([]);
      expect(res).toEqual([]);
    });
  });

  describe('getUSQuotes', () => {
    it('should return 美股行情 with full fields', async () => {
      const res = await sdk.getUSQuotes(['AAPL']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toContain('AAPL');
      expect(typeof q.price).toBe('number');
      expect(q).toHaveProperty('prevClose');
      expect(q).toHaveProperty('open');
      expect(q).toHaveProperty('high');
      expect(q).toHaveProperty('low');
      expect(q).toHaveProperty('volume');
      expect(q).toHaveProperty('amount');
      expect(q).toHaveProperty('time');
      expect(q).toHaveProperty('pe');
      expect(q).toHaveProperty('totalMarketCap');
      expect(q).toHaveProperty('high52w');
      expect(q).toHaveProperty('low52w');
    });

    it('should handle multiple US quotes', async () => {
      const res = await sdk.getUSQuotes(['BABA', 'AAPL']);
      expect(res.length).toBe(2);
    });

    it('should return empty for empty codes', async () => {
      const res = await sdk.getUSQuotes([]);
      expect(res).toEqual([]);
    });
  });

  describe('getFundQuotes', () => {
    it('should return 公募基金行情', async () => {
      const res = await sdk.getFundQuotes(['000001']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('000001');
      expect(typeof q.nav).toBe('number');
    });

    it('should handle multiple fund quotes', async () => {
      const res = await sdk.getFundQuotes(['000001', '110011']);
      expect(res.length).toBe(2);
    });

    it('should return empty for empty codes', async () => {
      const res = await sdk.getFundQuotes([]);
      expect(res).toEqual([]);
    });
  });
});
