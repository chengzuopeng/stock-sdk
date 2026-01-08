import { describe, it, expect } from 'vitest';

describe('模块导出', () => {
  it('should export StockSDK class', async () => {
    const { StockSDK } = await import('../../index');
    expect(StockSDK).toBeDefined();
    expect(new StockSDK()).toBeInstanceOf(StockSDK);
  });

  it('should export default', async () => {
    const defaultExport = await import('../../index');
    expect(defaultExport.default).toBeDefined();
  });

  it('should export GetAllAShareQuotesOptions', async () => {
    const module = await import('../../index');
    expect(module.StockSDK).toBeDefined();
    // GetAllAShareQuotesOptions is a type checked at compile time.
  });
});
