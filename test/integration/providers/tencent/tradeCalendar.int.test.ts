import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('TencentStockSDK - Trade Calendar', () => {
  describe('getTradingCalendar', () => {
    it('should return A股交易日历', async () => {
      const res = await sdk.getTradingCalendar();
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBeGreaterThan(0);
      expect(res[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(res).toContain('1990-12-19');
      expect(res).toContain('2024-01-02');
    });

    it('should return dates in chronological order', async () => {
      const res = await sdk.getTradingCalendar();
      for (let i = 1; i < Math.min(10, res.length); i++) {
        expect(new Date(res[i]).getTime()).toBeGreaterThan(
          new Date(res[i - 1]).getTime()
        );
      }
    });
  });
});
