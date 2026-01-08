import { describe, it, expect } from 'vitest';
import StockSDK from '../../../index';

const sdk = new StockSDK();

describe('TencentStockSDK - Batch', () => {
  describe('batchRaw', () => {
    it('should return 批量混合查询原始结果', async () => {
      const res = await sdk.batchRaw('sz000858,s_sh000001');
      expect(res.length).toBe(2);
      expect(res[0].key).toContain('sz000858');
      expect(res[1].key).toContain('sh000001');
    });
  });

  describe('getAllQuotesByCodes', () => {
    it('should return 批量获取多只股票行情', async () => {
      const codes = ['sz000858', 'sh600000', 'sz000001'];
      const res = await sdk.getAllQuotesByCodes(codes, {
        batchSize: 2,
        concurrency: 2,
      });
      expect(res.length).toBe(3);
      expect(res.some((q) => q.code === '000858')).toBe(true);
      expect(res.some((q) => q.code === '600000')).toBe(true);
    });

    it('should call onProgress callback', async () => {
      const codes = ['sz000858', 'sh600000', 'sz000001', 'sh600036'];
      const progressCalls: { completed: number; total: number }[] = [];

      await sdk.getAllQuotesByCodes(codes, {
        batchSize: 2,
        concurrency: 1,
        onProgress: (completed, total) => {
          progressCalls.push({ completed, total });
        },
      });

      expect(progressCalls.length).toBe(2);
      expect(progressCalls[0]).toEqual({ completed: 1, total: 2 });
      expect(progressCalls[1]).toEqual({ completed: 2, total: 2 });
    });

    it('should return empty for empty codes', async () => {
      const res = await sdk.getAllQuotesByCodes([]);
      expect(res).toEqual([]);
    });

    it('should throw for invalid batch options', async () => {
      await expect(
        sdk.getAllQuotesByCodes(['sz000858'], { batchSize: 0 as any })
      ).rejects.toThrow(/batchSize/i);
      await expect(
        sdk.getAllQuotesByCodes(['sz000858'], { concurrency: 0 as any })
      ).rejects.toThrow(/concurrency/i);
    });
  });

  describe('getAShareCodeList', () => {
    it('should return A股代码列表 from remote', async () => {
      const codeList = await sdk.getAShareCodeList();
      expect(Array.isArray(codeList)).toBe(true);
      expect(codeList.length).toBeGreaterThan(5000);
      expect(codeList[0]).toMatch(/^(sh|sz|bj)\d+$/);
    });

    it('should contain major stock codes', async () => {
      const codeList = await sdk.getAShareCodeList();
      expect(codeList).toContain('sz000858');
      expect(codeList).toContain('sh600000');
      expect(codeList).toContain('sh600519');
    });

    it('should return codes without exchange prefix', async () => {
      const codeList = await sdk.getAShareCodeList(false);
      expect(Array.isArray(codeList)).toBe(true);
      expect(codeList.length).toBeGreaterThan(5000);
      expect(codeList[0]).toMatch(/^\d+$/);
    });
  });

  describe('getUSCodeList', () => {
    it('should return 美股代码列表 from remote', async () => {
      const codeList = await sdk.getUSCodeList();
      expect(Array.isArray(codeList)).toBe(true);
      expect(codeList.length).toBeGreaterThan(1000);
      expect(codeList[0]).toMatch(/^\d{3}\.[A-Z]+$/);
    });

    it('should return codes without market prefix', async () => {
      const codeList = await sdk.getUSCodeList(false);
      expect(Array.isArray(codeList)).toBe(true);
      expect(codeList.length).toBeGreaterThan(1000);
      expect(codeList[0]).toMatch(/^[A-Z]+$/);
    });
  });

  describe('getHKCodeList', () => {
    it('should return 港股代码列表 from remote', async () => {
      const codeList = await sdk.getHKCodeList();
      expect(Array.isArray(codeList)).toBe(true);
      expect(codeList.length).toBeGreaterThan(1000);
      expect(codeList[0]).toMatch(/^\d+$/);
    });

    it('should return codes that work with getHKQuotes', async () => {
      const codeList = await sdk.getHKCodeList();
      const testCodes = codeList.slice(0, 3);
      const quotes = await sdk.getHKQuotes(testCodes);
      expect(quotes.length).toBeGreaterThan(0);
      if (quotes.length > 0) {
        const q = quotes[0];
        expect(q).toHaveProperty('code');
        expect(q).toHaveProperty('name');
        expect(q).toHaveProperty('price');
        expect(q).toHaveProperty('currency');
        expect(typeof q.price).toBe('number');
      }
    });
  });

  describe('getUSCodeList codes work with getUSQuotes', () => {
    it('should return codes that work with getUSQuotes', async () => {
      const codeList = await sdk.getUSCodeList(false);
      const testCodes = codeList.slice(0, 5);
      const quotes = await sdk.getUSQuotes(testCodes);
      expect(quotes.length).toBeGreaterThan(0);
      if (quotes.length > 0) {
        const q = quotes[0];
        expect(q).toHaveProperty('code');
        expect(q).toHaveProperty('name');
        expect(q).toHaveProperty('price');
        expect(q).toHaveProperty('prevClose');
        expect(q).toHaveProperty('totalMarketCap');
        expect(typeof q.price).toBe('number');
      }
    });
  });

  describe('getAllAShareQuotes', () => {
    it('should call onProgress callback', async () => {
      let progressCalled = false;
      const customSdk = new StockSDK();
      const res = await customSdk.getAllAShareQuotes({
        batchSize: 50,
        concurrency: 1,
        onProgress: (completed, total) => {
          progressCalled = true;
          expect(completed).toBeGreaterThan(0);
          expect(total).toBeGreaterThan(0);
        },
      });
      expect(res.length).toBeGreaterThan(0);
      expect(progressCalled).toBe(true);
    }, 60000);
  });

  describe('getAllHKShareQuotes', () => {
    it('should return 港股全量行情 with correct HKQuote structure', async () => {
      const customSdk = new StockSDK();
      const res = await customSdk.getAllHKShareQuotes({
        batchSize: 50,
        concurrency: 2,
      });
      expect(res.length).toBeGreaterThan(0);

      const sample = res[0];
      expect(sample).toHaveProperty('marketId');
      expect(sample).toHaveProperty('name');
      expect(sample).toHaveProperty('code');
      expect(sample).toHaveProperty('price');
      expect(sample).toHaveProperty('prevClose');
      expect(sample).toHaveProperty('open');
      expect(sample).toHaveProperty('volume');
      expect(sample).toHaveProperty('time');
      expect(sample).toHaveProperty('change');
      expect(sample).toHaveProperty('changePercent');
      expect(sample).toHaveProperty('high');
      expect(sample).toHaveProperty('low');
      expect(sample).toHaveProperty('amount');
      expect(sample).toHaveProperty('currency');
      expect(sample).toHaveProperty('raw');

      expect(typeof sample.price).toBe('number');
      expect(typeof sample.changePercent).toBe('number');
    }, 60000);
  });

  describe('getAllUSShareQuotes', () => {
    it('should return 美股全量行情 with correct USQuote structure', async () => {
      const customSdk = new StockSDK();
      const res = await customSdk.getAllUSShareQuotes({
        batchSize: 50,
        concurrency: 2,
      });
      expect(res.length).toBeGreaterThan(0);

      const sample = res[0];
      expect(sample).toHaveProperty('marketId');
      expect(sample).toHaveProperty('name');
      expect(sample).toHaveProperty('code');
      expect(sample).toHaveProperty('price');
      expect(sample).toHaveProperty('prevClose');
      expect(sample).toHaveProperty('open');
      expect(sample).toHaveProperty('high');
      expect(sample).toHaveProperty('low');
      expect(sample).toHaveProperty('change');
      expect(sample).toHaveProperty('changePercent');
      expect(sample).toHaveProperty('volume');
      expect(sample).toHaveProperty('amount');
      expect(sample).toHaveProperty('totalMarketCap');
      expect(sample).toHaveProperty('raw');

      expect(typeof sample.price).toBe('number');
      expect(typeof sample.changePercent).toBe('number');
    }, 60000);
  });
});
