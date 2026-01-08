import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('TencentStockSDK - Fund Flow', () => {
  describe('getFundFlow', () => {
    it('should return 资金流向', async () => {
      const res = await sdk.getFundFlow(['sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(typeof q.code).toBe('string');
      expect(typeof q.mainInflow).toBe('number');
    });

    it('should return empty for empty codes', async () => {
      const res = await sdk.getFundFlow([]);
      expect(res).toEqual([]);
    });
  });

  describe('getPanelLargeOrder', () => {
    it('should return 盘口大单占比', async () => {
      const res = await sdk.getPanelLargeOrder(['sz000858']);
      expect(res.length).toBeGreaterThan(0);
      const q = res[0];
      expect(typeof q.buyLargeRatio).toBe('number');
      expect(typeof q.sellLargeRatio).toBe('number');
    });

    it('should return empty for empty codes', async () => {
      const res = await sdk.getPanelLargeOrder([]);
      expect(res).toEqual([]);
    });
  });
});
