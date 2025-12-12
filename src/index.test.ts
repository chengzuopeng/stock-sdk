import { describe, it, expect } from 'vitest';
import StockSDK, { codeList } from './index';

const sdk = new StockSDK();

describe('TencentStockSDK', () => {
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
  });

  describe('getFundFlow', () => {
    it('should return 资金流向', async () => {
      const res = await sdk.getFundFlow(['ff_sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      // API 可能返回 pv_none_match（无数据），此时 code 会是 "1"
      // 正常情况下 code 应包含股票代码
      expect(typeof q.code).toBe('string');
      expect(typeof q.mainInflow).toBe('number');
    });
  });

  describe('getPanelLargeOrder', () => {
    it('should return 盘口大单占比', async () => {
      const res = await sdk.getPanelLargeOrder(['s_pksz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(typeof q.buyLargeRatio).toBe('number');
      expect(typeof q.sellLargeRatio).toBe('number');
    });
  });

  describe('getHKQuotes', () => {
    it('should return 港股扩展行情', async () => {
      const res = await sdk.getHKQuotes(['r_hk09988']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('09988');
      expect(typeof q.price).toBe('number');
    });
  });

  describe('getUSQuotes', () => {
    it('should return 美股简要行情', async () => {
      const res = await sdk.getUSQuotes(['s_usBABA']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toContain('BABA');
      expect(typeof q.price).toBe('number');
    });
  });

  describe('getFundQuotes', () => {
    it('should return 公募基金行情', async () => {
      const res = await sdk.getFundQuotes(['jj000001']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(q.code).toBe('000001');
      expect(typeof q.nav).toBe('number');
    });
  });

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
  });
});

describe('codeList', () => {
  it('should export A股代码列表', () => {
    expect(Array.isArray(codeList)).toBe(true);
    expect(codeList.length).toBeGreaterThan(5000);
    expect(codeList[0]).toMatch(/^(sh|sz|bj)\d+$/);
  });

  it('should contain major stock codes', () => {
    expect(codeList).toContain('sz000858'); // 五粮液
    expect(codeList).toContain('sh600000'); // 浦发银行
    expect(codeList).toContain('sh600519'); // 贵州茅台
  });
});


