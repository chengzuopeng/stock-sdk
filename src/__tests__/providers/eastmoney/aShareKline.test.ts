import { describe, it, expect } from 'vitest';
import StockSDK from '../../../index';

const sdk = new StockSDK();

describe('Eastmoney - A Share Kline', () => {
  describe('getHistoryKline', () => {
    it('should return 日K线数据', async () => {
      const res = await sdk.getHistoryKline('000001', {
        startDate: '20241201',
        endDate: '20241217',
      });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k.code).toBe('000001');
      expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof k.open).toBe('number');
      expect(typeof k.close).toBe('number');
      expect(typeof k.high).toBe('number');
      expect(typeof k.low).toBe('number');
      expect(typeof k.volume).toBe('number');
    });

    it('should return 周K线数据', async () => {
      const res = await sdk.getHistoryKline('sz000858', {
        period: 'weekly',
        startDate: '20241101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].code).toBe('000858');
    });

    it('should support different adjust types', async () => {
      const [hfq, qfq, noAdj] = await Promise.all([
        sdk.getHistoryKline('000001', { adjust: 'hfq', startDate: '20241201', endDate: '20241217' }),
        sdk.getHistoryKline('000001', { adjust: 'qfq', startDate: '20241201', endDate: '20241217' }),
        sdk.getHistoryKline('000001', { adjust: '', startDate: '20241201', endDate: '20241217' }),
      ]);
      expect(hfq.length).toBeGreaterThan(0);
      expect(qfq.length).toBeGreaterThan(0);
      expect(noAdj.length).toBeGreaterThan(0);
    });

    it('should support monthly period', async () => {
      const res = await sdk.getHistoryKline('000001', {
        period: 'monthly',
        startDate: '20240101',
        endDate: '20241231',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should support sh prefix', async () => {
      const res = await sdk.getHistoryKline('sh600000', {
        startDate: '20241201',
        endDate: '20241217',
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].code).toBe('600000');
    });

    it('should support bj prefix', async () => {
      const res = await sdk.getHistoryKline('bj430047', {
        startDate: '20241201',
        endDate: '20241217',
      });
      expect(Array.isArray(res)).toBe(true);
    });

    it('should handle 6-digit code starting with 6', async () => {
      const res = await sdk.getHistoryKline('600000', {
        startDate: '20241201',
        endDate: '20241217',
      });
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].code).toBe('600000');
    });

    it('should handle code starting with 0', async () => {
      const res = await sdk.getHistoryKline('000001', {
        startDate: '20241201',
        endDate: '20241217',
      });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should throw for invalid period', async () => {
      await expect(
        sdk.getHistoryKline('000001', { period: 'yearly' as any })
      ).rejects.toThrow(/period/i);
    });

    it('should throw for invalid adjust', async () => {
      await expect(
        sdk.getHistoryKline('000001', { adjust: 'bad' as any })
      ).rejects.toThrow(/adjust/i);
    });
  });

  describe('getMinuteKline', () => {
    it('should return 分时数据 (period=1)', async () => {
      const res = await sdk.getMinuteKline('000001', { period: '1' });
      expect(res.length).toBeGreaterThan(0);
      const t = res[0];
      expect(t.time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
      expect(typeof t.open).toBe('number');
      expect(typeof t.close).toBe('number');
      expect('avgPrice' in t).toBe(true);
    });

    it('should return 5分钟K线', async () => {
      const res = await sdk.getMinuteKline('sz000858', { period: '5' });
      expect(res.length).toBeGreaterThan(0);
      const k = res[0];
      expect(k.time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
      expect(typeof k.open).toBe('number');
      expect('changePercent' in k).toBe(true);
    });

    it('should return 60分钟K线', async () => {
      const res = await sdk.getMinuteKline('sh600519', { period: '60' });
      expect(res.length).toBeGreaterThan(0);
      expect(typeof res[0].open).toBe('number');
    });

    it('should return 15分钟K线', async () => {
      const res = await sdk.getMinuteKline('000001', { period: '15' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should return 30分钟K线', async () => {
      const res = await sdk.getMinuteKline('000001', { period: '30' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should support qfq adjust', async () => {
      const res = await sdk.getMinuteKline('000001', { period: '5', adjust: 'qfq' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should support no adjust', async () => {
      const res = await sdk.getMinuteKline('000001', { period: '5', adjust: '' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should handle sz prefix', async () => {
      const res = await sdk.getMinuteKline('sz000001', { period: '5' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should handle sh prefix', async () => {
      const res = await sdk.getMinuteKline('sh600000', { period: '5' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('分时应处理带前缀的代码', async () => {
      const res = await sdk.getMinuteKline('sz000001', { period: '1' });
      expect(res.length).toBeGreaterThan(0);
    });

    it('should filter by time range', async () => {
      const res = await sdk.getMinuteKline('000001', {
        period: '5',
        startDate: '2024-12-01 09:30:00',
        endDate: '2024-12-31 15:00:00',
      });
      expect(Array.isArray(res)).toBe(true);
    });

    it('should throw for invalid period', async () => {
      await expect(
        sdk.getMinuteKline('000001', { period: '2' as any })
      ).rejects.toThrow(/period/i);
    });

    it('should throw for invalid adjust', async () => {
      await expect(
        sdk.getMinuteKline('000001', { period: '5', adjust: 'bad' as any })
      ).rejects.toThrow(/adjust/i);
    });
  });
});
