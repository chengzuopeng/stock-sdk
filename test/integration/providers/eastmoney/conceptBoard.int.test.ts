import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('Eastmoney - Concept Board', () => {
  describe('getConceptList', () => {
    it('should return 概念板块名称列表', async () => {
      const res = await sdk.getConceptList();
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
      const res = await sdk.getConceptList();
      expect(res.length).toBeGreaterThan(1);
      for (let i = 0; i < res.length - 1; i++) {
        const curr = res[i].changePercent ?? 0;
        const next = res[i + 1].changePercent ?? 0;
        expect(curr).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getConceptSpot', () => {
    it('should return 概念板块实时行情 by name', async () => {
      const res = await sdk.getConceptSpot('人工智能');
      expect(res.length).toBeGreaterThan(0);
      const items = res.map((r) => r.item);
      expect(items).toContain('最新');
      expect(items).toContain('涨跌幅');
      expect(items).toContain('成交量');
    });

    it('should return 概念板块实时行情 by code', async () => {
      const res = await sdk.getConceptSpot('BK0800');
      expect(res.length).toBeGreaterThan(0);
      expect(res.find((r) => r.item === '最新')).toBeDefined();
    });
  });

  describe('getConceptConstituents', () => {
    it('should return 概念板块成分股 by name', async () => {
      const res = await sdk.getConceptConstituents('人工智能');
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

    it('should return 概念板块成分股 by code', async () => {
      const res = await sdk.getConceptConstituents('BK0800');
      expect(res.length).toBeGreaterThan(0);
      expect(typeof res[0].code).toBe('string');
    });
  });

  describe('getConceptKline', () => {
    it('should return 概念板块日K线', async () => {
      const res = await sdk.getConceptKline('人工智能', {
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

    it('should return 概念板块周K线', async () => {
      const res = await sdk.getConceptKline('BK0800', {
        period: 'weekly',
        startDate: '20241101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 概念板块月K线', async () => {
      const res = await sdk.getConceptKline('人工智能', {
        period: 'monthly',
        startDate: '20240101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('getConceptMinuteKline', () => {
    it('should return 概念板块1分钟分时数据', async () => {
      const res = await sdk.getConceptMinuteKline('人工智能', {
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

    it('should return 概念板块5分钟K线', async () => {
      const res = await sdk.getConceptMinuteKline('BK0800', {
        period: '5',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k).toHaveProperty('time');
      expect('changePercent' in k).toBe(true);
    });

    it('should return 概念板块15分钟K线', async () => {
      const res = await sdk.getConceptMinuteKline('人工智能', {
        period: '15',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 概念板块30分钟K线', async () => {
      const res = await sdk.getConceptMinuteKline('人工智能', {
        period: '30',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 概念板块60分钟K线', async () => {
      const res = await sdk.getConceptMinuteKline('人工智能', {
        period: '60',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理', () => {
    it('should throw error for invalid concept board name', async () => {
      await expect(
        sdk.getConceptSpot('不存在的概念板块')
      ).rejects.toThrow(/未找到概念板块/);
    });
  });
});
