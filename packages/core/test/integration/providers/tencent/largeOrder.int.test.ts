/** 腾讯盘口大单集成测试。 */
import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('TencentStockSDK - Large Order', () => {
  describe('getPanelLargeOrder', () => {
    it('should return 盘口大单占比', async () => {
      const res = await sdk.quotes.largeOrder(['sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(typeof q.buyLargeRatio).toBe('number');
      expect(typeof q.sellLargeRatio).toBe('number');
    });

    it('should return empty for empty codes', async () => {
      const res = await sdk.quotes.largeOrder([]);
      expect(res).toEqual([]);
    });
  });
});
