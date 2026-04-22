import { describe, it, expect } from 'vitest';
import { addIndicators } from '../../../src/indicators';

describe('Indicators - addIndicators', () => {
  it('should add indicators to kline data', () => {
    const klines = Array.from({ length: 30 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      code: '000001',
      open: 100 + i,
      high: 105 + i,
      low: 95 + i,
      close: 102 + i,
      volume: 1000,
      amount: 100000,
      amplitude: 10,
      changePercent: 1,
      change: 1,
      turnoverRate: 1,
    }));

    const result = addIndicators(klines, {
      ma: { periods: [5, 10] },
      macd: true,
      obv: { maPeriod: 5 },
      roc: { period: 12, signalPeriod: 3 },
      dmi: { period: 14 },
      sar: true,
      kc: { emaPeriod: 10, atrPeriod: 5, multiplier: 2 },
    });

    expect(result.length).toBe(30);
    expect(result[10].ma).toBeDefined();
    expect(result[10].macd).toBeDefined();
    expect(result[10].obv).toBeDefined();
    expect(result[10].roc).toBeDefined();
    expect(result[10].dmi).toBeDefined();
    expect(result[10].sar).toBeDefined();
    expect(result[10].kc).toBeDefined();
  });

  it('should handle empty array', () => {
    const result = addIndicators([], { ma: true });
    expect(result).toEqual([]);
  });
});
