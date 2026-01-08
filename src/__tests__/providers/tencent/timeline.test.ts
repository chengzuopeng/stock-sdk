import { describe, it, expect } from 'vitest';
import StockSDK from '../../../index';

const sdk = new StockSDK();

describe('TencentStockSDK - Timeline', () => {
  describe('getTodayTimeline', () => {
    it('should return 当日分时数据', async () => {
      const res = await sdk.getTodayTimeline('sz000001');
      expect(res.code).toBe('sz000001');
      expect(res.date).toMatch(/^\d{8}$/);
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data.length > 0) {
        const first = res.data[0];
        expect(first.time).toMatch(/^\d{2}:\d{2}$/);
        expect(typeof first.price).toBe('number');
        expect(typeof first.volume).toBe('number');
        expect(typeof first.amount).toBe('number');
      }
    });

    it('should return 上证指数分时数据', async () => {
      const res = await sdk.getTodayTimeline('sh000001');
      expect(res.code).toBe('sh000001');
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('should calculate avgPrice correctly', async () => {
      const res = await sdk.getTodayTimeline('sz000001');
      if (res.data.length > 0) {
        const first = res.data[0];
        expect(typeof first.avgPrice).toBe('number');
        if (first.volume > 0) {
          expect(first.avgPrice).toBeGreaterThan(0);
        }
      }
    });

    it('should throw error for invalid stock code', async () => {
      await expect(sdk.getTodayTimeline('invalid_code')).rejects.toThrow();
    });

    it('主板深圳 sz000001 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('sz000001');
      if (res.data.length > 0) {
        const first = res.data[0];
        if (first.volume > 0) {
          const calcAvg = first.amount / first.volume;
          expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
        }
      }
    });

    it('主板上海 sh600519 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('sh600519');
      if (res.data.length > 0) {
        const first = res.data[0];
        if (first.volume > 0) {
          const calcAvg = first.amount / first.volume;
          expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
        }
      }
    });

    it('科创板 sh688601 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('sh688601');
      if (res.data.length > 0) {
        const first = res.data[0];
        if (first.volume > 0) {
          const calcAvg = first.amount / first.volume;
          expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
        }
      }
    });

    it('创业板 sz300750 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('sz300750');
      if (res.data.length > 0) {
        const first = res.data[0];
        if (first.volume > 0) {
          const calcAvg = first.amount / first.volume;
          expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
        }
      }
    });

    it('北交所 bj830799 成交量应统一为股', async () => {
      const res = await sdk.getTodayTimeline('bj830799');
      expect(res.code).toBe('bj830799');
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data.length > 0 && res.data[0].volume > 0) {
        const first = res.data[0];
        const calcAvg = first.amount / first.volume;
        expect(Math.abs(calcAvg - first.avgPrice)).toBeLessThan(0.01);
      }
    });

    it('should throw when API returns error', async () => {
      await expect(sdk.getTodayTimeline('abc123')).rejects.toThrow();
    });
  });
});
