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

  describe('R3-12: maxRecursiveLookback 只统计递归型成员', () => {
    it('纯窗口型组合(SMA/BOLL/WR)→ 0,消费方切片无需暖机放大', () => {
      const result = estimateIndicatorLookback({
        ma: { periods: [250] },
        boll: { period: 20 },
        wr: { periods: [6, 10] },
      });
      expect(result.maxLookback).toBe(250);
      expect(result.maxRecursiveLookback).toBe(0);
    });

    it('ma type:"ema" 经 emaBased 动态计入(ma 不静态标记 recursive)', () => {
      const result = estimateIndicatorLookback({ ma: { periods: [60], type: 'ema' } });
      expect(result.maxRecursiveLookback).toBe(60);
    });

    it('混合组合取递归成员的最大 bars,不被窗口型大周期绑架', () => {
      // macd bars = 26×3+9 = 87(递归);ma[250] SMA 是窗口型不计入
      const result = estimateIndicatorLookback({ ma: { periods: [250] }, macd: {} });
      expect(result.maxLookback).toBe(250);
      expect(result.maxRecursiveLookback).toBe(87);
    });

    it('registry 的 recursive 标记面与设计一致(平滑/递推状态型)', () => {
      const recursiveKeys = Object.values(INDICATOR_REGISTRY)
        .filter((descriptor) => descriptor.recursive === true)
        .map((descriptor) => descriptor.key);
      expect(recursiveKeys).toEqual(['macd', 'kdj', 'rsi', 'atr', 'dmi', 'sar', 'kc']);
    });
  });
});
