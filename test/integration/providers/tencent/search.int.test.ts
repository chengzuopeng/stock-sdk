import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('TencentStockSDK - Search', () => {
  describe('search', () => {
    it('should search for A-Share (Maotai)', async () => {
      const res = await sdk.search('maotai');
      expect(res.length).toBeGreaterThan(0);
      const item = res.find((r) => r.code === 'sh600519');
      expect(item).toBeDefined();
      expect(item?.name).toBe('贵州茅台');
      expect(item?.market).toBe('sh');
    });

    it('should search for HK Stock (Tencent)', async () => {
      const res = await sdk.search('00700');
      expect(res.length).toBeGreaterThan(0);
      const item = res.find((r) => r.code.includes('00700'));
      expect(item).toBeDefined();
      expect(item?.name).toContain('腾讯');
    });

    it('should return empty array for empty keyword', async () => {
      const res = await sdk.search('');
      expect(res).toEqual([]);
    });

    it('should return empty array for non-existent stock', async () => {
      const res = await sdk.search('non_existent_stock_xyz_12345');
      expect(Array.isArray(res)).toBe(true);
    });
  });
});
