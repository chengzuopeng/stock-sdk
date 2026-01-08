import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('Eastmoney - HK/US Kline', () => {
  describe('getHKHistoryKline', () => {
    it('should return 港股日K线数据', async () => {
      const res = await sdk.getHKHistoryKline('00700', {
        startDate: '20241201',
        endDate: '20241220',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k.code).toBe('00700');
      expect(k.name).toContain('腾讯');
      expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof k.open).toBe('number');
      expect(typeof k.close).toBe('number');
    });

    it('should return 港股周K线数据', async () => {
      const res = await sdk.getHKHistoryKline('09988', {
        period: 'weekly',
        startDate: '20241101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].code).toBe('09988');
    });

    it('should support different adjust types', async () => {
      const [hfq, qfq, noAdj] = await Promise.all([
        sdk.getHKHistoryKline('00700', { adjust: 'hfq', startDate: '20241201', endDate: '20241220' }),
        sdk.getHKHistoryKline('00700', { adjust: 'qfq', startDate: '20241201', endDate: '20241220' }),
        sdk.getHKHistoryKline('00700', { adjust: '', startDate: '20241201', endDate: '20241220' }),
      ]);
      expect(hfq.length).toBeGreaterThan(0);
      expect(qfq.length).toBeGreaterThan(0);
      expect(noAdj.length).toBeGreaterThan(0);
    });
  });

  describe('getUSHistoryKline', () => {
    it('should return 美股日K线数据 (纳斯达克)', async () => {
      const res = await sdk.getUSHistoryKline('105.MSFT', {
        startDate: '20241201',
        endDate: '20241220',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k.code).toBe('MSFT');
      expect(k.name).toContain('微软');
      expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof k.open).toBe('number');
      expect(typeof k.close).toBe('number');
    });

    it('should return 美股周K线数据 (纽交所)', async () => {
      const res = await sdk.getUSHistoryKline('106.BABA', {
        period: 'weekly',
        startDate: '20241101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].code).toBe('BABA');
    });

    it('should support different adjust types', async () => {
      const [hfq, qfq, noAdj] = await Promise.all([
        sdk.getUSHistoryKline('105.AAPL', { adjust: 'hfq', startDate: '20241201', endDate: '20241220' }),
        sdk.getUSHistoryKline('105.AAPL', { adjust: 'qfq', startDate: '20241201', endDate: '20241220' }),
        sdk.getUSHistoryKline('105.AAPL', { adjust: '', startDate: '20241201', endDate: '20241220' }),
      ]);
      expect(hfq.length).toBeGreaterThan(0);
      expect(qfq.length).toBeGreaterThan(0);
      expect(noAdj.length).toBeGreaterThan(0);
    });

    it('should return 美股月K线数据', async () => {
      const res = await sdk.getUSHistoryKline('105.TSLA', {
        period: 'monthly',
        startDate: '20240101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });
  });
});
