import { describe, it, expect } from 'vitest';
import StockSDK from '../../../index';

const sdk = new StockSDK();

describe('Eastmoney - Industry Board', () => {
  describe('getIndustryList', () => {
    it('should return 行业板块名称列表', async () => {
      const res = await sdk.getIndustryList();
      expect(res.length).toBeGreaterThan(0);
      const board = res[0];
      expect(board).toHaveProperty('rank');
      expect(board).toHaveProperty('name');
      expect(board).toHaveProperty('code');
      expect(board).toHaveProperty('price');
      expect(board).toHaveProperty('changePercent');
      expect(board.code).toMatch(/^BK\d+$/);
      expect(typeof board.name).toBe('string');
    });

    it('should return boards sorted by changePercent', async () => {
      const res = await sdk.getIndustryList();
      expect(res.length).toBeGreaterThan(1);
      for (let i = 0; i < res.length - 1; i++) {
        const curr = res[i].changePercent ?? 0;
        const next = res[i + 1].changePercent ?? 0;
        expect(curr).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getIndustrySpot', () => {
    it('should return 行业板块实时行情 by name', async () => {
      const res = await sdk.getIndustrySpot('互联网服务');
      expect(res.length).toBeGreaterThan(0);
      const items = res.map((r) => r.item);
      expect(items).toContain('最新');
      expect(items).toContain('涨跌幅');
      expect(items).toContain('成交量');
    });

    it('should return 行业板块实时行情 by code', async () => {
      const res = await sdk.getIndustrySpot('BK0447');
      expect(res.length).toBeGreaterThan(0);
      expect(res.find((r) => r.item === '最新')).toBeDefined();
    });
  });

  describe('getIndustryConstituents', () => {
    it('should return 行业板块成分股 by name', async () => {
      const res = await sdk.getIndustryConstituents('互联网服务');
      expect(res.length).toBeGreaterThan(0);
      const stock = res[0];
      expect(stock).toHaveProperty('rank');
      expect(stock).toHaveProperty('code');
      expect(stock).toHaveProperty('name');
      expect(stock).toHaveProperty('price');
      expect(stock).toHaveProperty('changePercent');
      expect(stock).toHaveProperty('pe');
      expect(stock).toHaveProperty('pb');
    });

    it('should return 行业板块成分股 by code', async () => {
      const res = await sdk.getIndustryConstituents('BK0447');
      expect(res.length).toBeGreaterThan(0);
      expect(typeof res[0].code).toBe('string');
    });
  });

  describe('getIndustryKline', () => {
    it('should return 行业板块日K线', async () => {
      const res = await sdk.getIndustryKline('互联网服务', {
        startDate: '20241201',
        endDate: '20241220',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k).toHaveProperty('date');
      expect(k).toHaveProperty('open');
      expect(k).toHaveProperty('close');
      expect(k).toHaveProperty('high');
      expect(k).toHaveProperty('low');
      expect(k).toHaveProperty('volume');
      expect(k).toHaveProperty('changePercent');
      expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return 行业板块周K线', async () => {
      const res = await sdk.getIndustryKline('BK0447', {
        period: 'weekly',
        startDate: '20241101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 行业板块月K线', async () => {
      const res = await sdk.getIndustryKline('互联网服务', {
        period: 'monthly',
        startDate: '20240101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('getIndustryMinuteKline', () => {
    it('should return 行业板块1分钟分时数据', async () => {
      const res = await sdk.getIndustryMinuteKline('互联网服务', {
        period: '1',
      });
      expect(res.length).toBeGreaterThan(0);
      const t = res[0];
      expect(t).toHaveProperty('time');
      expect(t).toHaveProperty('open');
      expect(t).toHaveProperty('close');
      expect(t).toHaveProperty('volume');
      expect('price' in t).toBe(true);
    });

    it('should return 行业板块5分钟K线', async () => {
      const res = await sdk.getIndustryMinuteKline('BK0447', {
        period: '5',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k).toHaveProperty('time');
      expect('changePercent' in k).toBe(true);
    });

    it('should return 行业板块15分钟K线', async () => {
      const res = await sdk.getIndustryMinuteKline('互联网服务', {
        period: '15',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 行业板块30分钟K线', async () => {
      const res = await sdk.getIndustryMinuteKline('互联网服务', {
        period: '30',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 行业板块60分钟K线', async () => {
      const res = await sdk.getIndustryMinuteKline('互联网服务', {
        period: '60',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('should throw error for invalid board name', async () => {
      await expect(
        sdk.getIndustrySpot('不存在的板块名称')
      ).rejects.toThrow(/未找到行业板块/);
    });
  });
});
