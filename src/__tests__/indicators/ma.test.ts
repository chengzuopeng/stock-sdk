import { describe, it, expect } from 'vitest';
import { calcSMA, calcEMA, calcWMA, calcMA } from '../../indicators';

describe('Indicators - MA', () => {
  describe('calcSMA', () => {
    it('should calculate simple moving average correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sma = calcSMA(data, 3);
      expect(sma[0]).toBeNull();
      expect(sma[1]).toBeNull();
      expect(sma[2]).toBe(2);
      expect(sma[3]).toBe(3);
      expect(sma[9]).toBe(9);
    });

    it('should handle null values', () => {
      const data = [1, 2, null, 4, 5];
      const sma = calcSMA(data, 3);
      expect(sma[2]).toBeNull();
    });
  });

  describe('calcEMA', () => {
    it('should calculate exponential moving average correctly', () => {
      const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const ema = calcEMA(data, 3);
      expect(ema[0]).toBeNull();
      expect(ema[1]).toBeNull();
      expect(ema[2]).toBe(11);
      expect(ema[3]).not.toBeNull();
    });
  });

  describe('calcWMA', () => {
    it('should calculate weighted moving average correctly', () => {
      const data = [1, 2, 3, 4, 5];
      const wma = calcWMA(data, 3);
      expect(wma[0]).toBeNull();
      expect(wma[1]).toBeNull();
      expect(wma[2]).toBeCloseTo(2.33, 1);
    });
  });

  describe('calcMA', () => {
    it('should calculate multiple periods', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const ma = calcMA(data, { periods: [3, 5] });
      expect(ma.length).toBe(10);
      expect(ma[2].ma3).toBe(2);
      expect(ma[4].ma5).toBe(3);
    });

    it('should support ema type', () => {
      const data = [10, 11, 12, 13, 14];
      const ma = calcMA(data, { periods: [3], type: 'ema' });
      expect(ma[2].ma3).toBe(11);
    });
  });
});
