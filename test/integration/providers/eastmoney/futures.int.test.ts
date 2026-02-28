import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('Eastmoney - Futures Kline', () => {
  it('should return 螺纹钢主连日K线', async () => {
    const res = await sdk.getFuturesKline('RBM', {
      startDate: '20250101',
      endDate: '20250228',
    });
    expect(res.length).toBeGreaterThan(0);
    const k = res[0];
    expect(k.code).toBeTruthy();
    expect(k.name).toBeTruthy();
    expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof k.open).toBe('number');
    expect(typeof k.close).toBe('number');
    expect(typeof k.high).toBe('number');
    expect(typeof k.low).toBe('number');
    expect(typeof k.volume).toBe('number');
    expect(k.openInterest).not.toBeUndefined();
  });

  it('should return 具体合约 rb2510 日K线', async () => {
    const res = await sdk.getFuturesKline('rb2510');
    expect(res.length).toBeGreaterThan(0);
    const k = res[0];
    expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof k.open).toBe('number');
  });

  it('should return 沪深300主连周K线', async () => {
    const res = await sdk.getFuturesKline('IFM', {
      period: 'weekly',
      startDate: '20250101',
    });
    expect(res.length).toBeGreaterThan(0);
  });

  it('should return CZCE variety TAM', async () => {
    const res = await sdk.getFuturesKline('TAM', {
      startDate: '20250101',
    });
    expect(res.length).toBeGreaterThan(0);
  });

  it('should return INE variety scM', async () => {
    const res = await sdk.getFuturesKline('scM', {
      startDate: '20250101',
    });
    expect(res.length).toBeGreaterThan(0);
  });
});

describe('Eastmoney - Global Futures Spot', () => {
  it('should return global futures realtime quotes', async () => {
    const res = await sdk.getGlobalFuturesSpot();
    expect(res.length).toBeGreaterThan(0);
    const q = res[0];
    expect(q.code).toBeTruthy();
    expect(q.name).toBeTruthy();
    expect(q.price).not.toBeUndefined();
    expect(q.changePercent).not.toBeUndefined();
    expect(q.openInterest).not.toBeUndefined();
  });
});

describe('Eastmoney - Global Futures Kline', () => {
  it('should return COMEX铜连续 K线', async () => {
    const res = await sdk.getGlobalFuturesKline('HG00Y', {
      startDate: '20250101',
    });
    expect(res.length).toBeGreaterThan(0);
    const k = res[0];
    expect(k.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof k.open).toBe('number');
    expect(typeof k.close).toBe('number');
  });

  it('should throw on unknown global variety', async () => {
    await expect(
      sdk.getGlobalFuturesKline('XXXYYY')
    ).rejects.toThrow(/Unknown global futures variety/);
  });
});

describe('Eastmoney - Futures Inventory', () => {
  it('should return inventory symbol list', async () => {
    const res = await sdk.getFuturesInventorySymbols();
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].code).toBeTruthy();
    expect(res[0].name).toBeTruthy();
  });

  it('should return COMEX gold inventory', async () => {
    const res = await sdk.getComexInventory('gold');
    expect(res.length).toBeGreaterThan(0);
    const item = res[0];
    expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(item.name).toBe('黄金');
    expect(typeof item.storageTon).toBe('number');
    expect(typeof item.storageOunce).toBe('number');
  });
});
