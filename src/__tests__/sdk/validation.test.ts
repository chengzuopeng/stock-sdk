import { describe, it, expect } from 'vitest';
import StockSDK from '../../index';

describe('StockSDK - Validation and Error Handling', () => {
  describe('SDK 配置', () => {
    it('should use custom baseUrl', () => {
      const customSdk = new StockSDK({ baseUrl: 'https://custom.url' });
      expect(customSdk).toBeInstanceOf(StockSDK);
    });

    it('should use custom timeout', () => {
      const customSdk = new StockSDK({ timeout: 5000 });
      expect(customSdk).toBeInstanceOf(StockSDK);
    });
  });

  describe('超时处理', () => {
    it('should throw error when request times out', async () => {
      const slowSdk = new StockSDK({ timeout: 1 });
      await expect(slowSdk.getFullQuotes(['sz000858'])).rejects.toThrow();
    });
  });
});
