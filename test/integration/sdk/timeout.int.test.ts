import { describe, it, expect } from 'vitest';
import StockSDK from '../../../src/index';

describe('StockSDK - Timeout (integration)', () => {
  it('should throw error when request times out', async () => {
    const slowSdk = new StockSDK({ timeout: 1 });
    await expect(slowSdk.getFullQuotes(['sz000858'])).rejects.toThrow();
  });
});
