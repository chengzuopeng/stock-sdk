import { describe, expect, it } from 'vitest';
import {
  INDICATOR_REGISTRY,
  estimateIndicatorLookback,
  getEnabledIndicatorKeys,
} from '../../../src/indicators';

describe('indicator registry', () => {
  it('should expose all supported public indicators', () => {
    expect(Object.keys(INDICATOR_REGISTRY)).toEqual([
      'ma',
      'macd',
      'boll',
      'kdj',
      'rsi',
      'wr',
      'bias',
      'cci',
      'atr',
      'obv',
      'roc',
      'dmi',
      'sar',
      'kc',
    ]);
  });

  it('should list enabled indicators in registry order', () => {
    expect(
      getEnabledIndicatorKeys({
        kc: { emaPeriod: 20, atrPeriod: 10 },
        ma: true,
        rsi: { periods: [6, 12, 24] },
      })
    ).toEqual(['ma', 'rsi', 'kc']);
  });

  it('should estimate extra bars for ema-based indicators', () => {
    const result = estimateIndicatorLookback({
      ma: { periods: [20], type: 'ema' },
      kc: { emaPeriod: 20, atrPeriod: 10 },
    });

    expect(result.maxLookback).toBe(60);
    expect(result.hasEmaBasedIndicator).toBe(true);
    expect(result.requiredBars).toBe(90);
  });

  it('should estimate non-ema indicators with the standard buffer', () => {
    const result = estimateIndicatorLookback({
      dmi: { period: 14, adxPeriod: 6 },
      wr: { periods: [6, 10] },
    });

    expect(result.maxLookback).toBe(34);
    expect(result.hasEmaBasedIndicator).toBe(false);
    expect(result.requiredBars).toBe(41);
  });
});
