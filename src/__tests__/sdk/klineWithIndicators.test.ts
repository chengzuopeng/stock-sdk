import { describe, it, expect } from 'vitest';
import StockSDK from '../../index';

const sdk = new StockSDK();

describe('StockSDK - getKlineWithIndicators', () => {
  it('should return kline with MA indicators', async () => {
    const res = await sdk.getKlineWithIndicators('sz000001', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        ma: { periods: [5, 10, 20] },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[res.length - 1].ma).toBeDefined();
    expect(res[res.length - 1].ma?.ma5).toBeDefined();
  });

  it('should return kline with MACD indicators', async () => {
    const res = await sdk.getKlineWithIndicators('sz000001', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        macd: true,
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[res.length - 1].macd).toBeDefined();
    expect(res[res.length - 1].macd?.dif).toBeDefined();
  });

  it('should return kline with BOLL indicators', async () => {
    const res = await sdk.getKlineWithIndicators('sz000001', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        boll: true,
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[res.length - 1].boll).toBeDefined();
  });

  it('should return kline with KDJ indicators', async () => {
    const res = await sdk.getKlineWithIndicators('sz000001', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        kdj: true,
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[res.length - 1].kdj).toBeDefined();
  });

  it('should return kline with multiple indicators', async () => {
    const res = await sdk.getKlineWithIndicators('sz000001', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        ma: { periods: [5, 10] },
        macd: true,
        boll: true,
        kdj: true,
        rsi: true,
        wr: true,
        bias: true,
        cci: true,
        atr: true,
      },
    });
    expect(res.length).toBeGreaterThan(0);
    const last = res[res.length - 1];
    expect(last.ma).toBeDefined();
    expect(last.macd).toBeDefined();
    expect(last.boll).toBeDefined();
    expect(last.kdj).toBeDefined();
    expect(last.rsi).toBeDefined();
    expect(last.wr).toBeDefined();
    expect(last.bias).toBeDefined();
    expect(last.cci).toBeDefined();
    expect(last.atr).toBeDefined();
  });

  it('should return kline with BIAS indicators', async () => {
    const res = await sdk.getKlineWithIndicators('sz000001', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        bias: { periods: [6, 12, 24] },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[res.length - 1].bias).toBeDefined();
    expect(res[res.length - 1].bias?.bias6).toBeDefined();
  });

  it('should return kline with CCI indicator', async () => {
    const res = await sdk.getKlineWithIndicators('sz000001', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        cci: { period: 14 },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[res.length - 1].cci).toBeDefined();
    expect(res[res.length - 1].cci?.cci).toBeDefined();
  });

  it('should return kline with ATR indicator', async () => {
    const res = await sdk.getKlineWithIndicators('sz000001', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        atr: { period: 14 },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[res.length - 1].atr).toBeDefined();
    expect(res[res.length - 1].atr?.atr).toBeDefined();
    expect(res[res.length - 1].atr?.tr).toBeDefined();
  });

  it('should auto detect HK market', async () => {
    const res = await sdk.getKlineWithIndicators('00700', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        ma: { periods: [5] },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].ma).toBeDefined();
  });

  it('should auto detect US market', async () => {
    const res = await sdk.getKlineWithIndicators('105.MSFT', {
      startDate: '20241201',
      endDate: '20241220',
      indicators: {
        ma: { periods: [5] },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].ma).toBeDefined();
  });

  it('should work without startDate (return all available data)', async () => {
    const res = await sdk.getKlineWithIndicators('sz000001', {
      indicators: {
        ma: { periods: [5] },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].ma).toBeDefined();
  });

  it('should work for HK market without startDate', async () => {
    const res = await sdk.getKlineWithIndicators('00700', {
      indicators: {
        ma: { periods: [5] },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].ma).toBeDefined();
  });

  it('should work for US market without startDate', async () => {
    const res = await sdk.getKlineWithIndicators('105.MSFT', {
      indicators: {
        ma: { periods: [5] },
      },
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].ma).toBeDefined();
  });
});
