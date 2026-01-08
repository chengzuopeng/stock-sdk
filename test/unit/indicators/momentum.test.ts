import { describe, it, expect } from 'vitest';
import {
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
  calcBIAS,
  calcCCI,
  calcATR,
} from '../../../src/indicators';

describe('Indicators - Momentum and Volatility', () => {
  describe('calcMACD', () => {
    it('should calculate MACD correctly', () => {
      const data = Array.from({ length: 50 }, (_, i) => 100 + i);
      const macd = calcMACD(data, { short: 12, long: 26, signal: 9 });
      expect(macd.length).toBe(50);
      expect(macd[0].dif).toBeNull();
      expect(macd[49].dif).not.toBeNull();
      expect(macd[49].dea).not.toBeNull();
      expect(macd[49].macd).not.toBeNull();
    });
  });

  describe('calcBOLL', () => {
    it('should calculate BOLL correctly', () => {
      const data = Array.from({ length: 30 }, (_, i) => 100 + (i % 5) - 2);
      const boll = calcBOLL(data, { period: 20, stdDev: 2 });
      expect(boll.length).toBe(30);
      expect(boll[19].mid).not.toBeNull();
      expect(boll[19].upper).not.toBeNull();
      expect(boll[19].lower).not.toBeNull();
      expect(boll[19].upper!).toBeGreaterThan(boll[19].mid!);
      expect(boll[19].lower!).toBeLessThan(boll[19].mid!);
    });
  });

  describe('calcKDJ', () => {
    it('should calculate KDJ correctly', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000,
      }));
      const kdj = calcKDJ(data, { period: 9 });
      expect(kdj.length).toBe(20);
      expect(kdj[8].k).not.toBeNull();
      expect(kdj[8].d).not.toBeNull();
      expect(kdj[8].j).not.toBeNull();
    });

    it('should handle null values in data', () => {
      const data = [
        { open: 100, high: 110, low: 90, close: 100 },
        { open: 100, high: null, low: 95, close: 102 },
        { open: 100, high: 115, low: null, close: 105 },
        { open: 100, high: 120, low: 100, close: null },
        { open: 100, high: 125, low: 105, close: 115 },
        { open: 100, high: 130, low: 110, close: 120 },
        { open: 100, high: 135, low: 115, close: 125 },
        { open: 100, high: 140, low: 120, close: 130 },
        { open: 100, high: 145, low: 125, close: 135 },
        { open: 100, high: 150, low: 130, close: 140 },
      ];
      const kdj = calcKDJ(data, { period: 5 });
      expect(kdj.length).toBe(10);
      expect(kdj[4].k).toBeNull();
    });

    it('should handle high equals low (division by zero)', () => {
      const data = Array.from({ length: 10 }, () => ({
        open: 100,
        high: 100,
        low: 100,
        close: 100,
      }));
      const kdj = calcKDJ(data, { period: 5 });
      expect(kdj.length).toBe(10);
      expect(kdj[4].k).toBeNull();
    });
  });

  describe('calcRSI', () => {
    it('should calculate RSI correctly', () => {
      const upData = Array.from({ length: 20 }, (_, i) => 100 + i);
      const rsiUp = calcRSI(upData, { periods: [6] });
      expect(rsiUp[6].rsi6).toBe(100);

      const downData = Array.from({ length: 20 }, (_, i) => 100 - i);
      const rsiDown = calcRSI(downData, { periods: [6] });
      expect(rsiDown[6].rsi6).toBe(0);
    });
  });

  describe('calcWR', () => {
    it('should calculate WR correctly', () => {
      const data = Array.from({ length: 15 }, (_, i) => ({
        open: 100,
        high: 110,
        low: 90,
        close: 100 + (i % 3) * 5 - 5,
      }));
      const wr = calcWR(data, { periods: [6] });
      expect(wr.length).toBe(15);
      expect(wr[5].wr6).not.toBeNull();
    });

    it('should handle null values in data', () => {
      const data = [
        { open: 100, high: 110, low: 90, close: 100 },
        { open: 100, high: null, low: 95, close: 102 },
        { open: 100, high: 115, low: null, close: 105 },
        { open: 100, high: 120, low: 100, close: null },
        { open: 100, high: 125, low: 105, close: 115 },
        { open: 100, high: 130, low: 110, close: 120 },
        { open: 100, high: 135, low: 115, close: 125 },
        { open: 100, high: 140, low: 120, close: 130 },
        { open: 100, high: 145, low: 125, close: 135 },
        { open: 100, high: 150, low: 130, close: 140 },
      ];
      const wr = calcWR(data, { periods: [5] });
      expect(wr.length).toBe(10);
      expect(wr[4].wr5).toBeNull();
    });

    it('should handle high equals low', () => {
      const data = Array.from({ length: 10 }, () => ({
        open: 100,
        high: 100,
        low: 100,
        close: 100,
      }));
      const wr = calcWR(data, { periods: [5] });
      expect(wr.length).toBe(10);
      expect(wr[4].wr5).toBeNull();
    });
  });

  describe('calcBIAS', () => {
    it('should calculate BIAS correctly', () => {
      const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const bias = calcBIAS(data, { periods: [6] });
      expect(bias.length).toBe(11);
      expect(bias[4].bias6).toBeNull();
      expect(bias[5].bias6).not.toBeNull();
      const ma6 = (10 + 11 + 12 + 13 + 14 + 15) / 6;
      const expectedBias = ((15 - ma6) / ma6) * 100;
      expect(bias[5].bias6).toBeCloseTo(expectedBias, 2);
    });

    it('should calculate multiple BIAS periods', () => {
      const data = Array.from({ length: 30 }, (_, i) => 100 + i);
      const bias = calcBIAS(data, { periods: [6, 12, 24] });
      expect(bias.length).toBe(30);
      expect(bias[29].bias6).not.toBeNull();
      expect(bias[29].bias12).not.toBeNull();
      expect(bias[29].bias24).not.toBeNull();
    });
  });

  describe('calcCCI', () => {
    it('should calculate CCI correctly', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        open: 100 + i,
        high: 110 + i,
        low: 90 + i,
        close: 100 + i,
        volume: 1000,
      }));
      const cci = calcCCI(data, { period: 14 });
      expect(cci.length).toBe(20);
      expect(cci[12].cci).toBeNull();
      expect(cci[13].cci).not.toBeNull();
    });

    it('should handle steady trend', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        open: 100 + i * 2,
        high: 110 + i * 2,
        low: 90 + i * 2,
        close: 100 + i * 2,
        volume: 1000,
      }));
      const cci = calcCCI(data, { period: 14 });
      expect(cci[19].cci).toBeGreaterThan(0);
    });

    it('should handle null values in data', () => {
      const data = [
        { open: 100, high: 110, low: 90, close: 100 },
        { open: 100, high: null, low: 95, close: 102 },
        { open: 100, high: 115, low: null, close: 105 },
        { open: 100, high: 120, low: 100, close: null },
        { open: 100, high: 125, low: 105, close: 115 },
        { open: 100, high: 130, low: 110, close: 120 },
      ];
      const cci = calcCCI(data, { period: 3 });
      expect(cci.length).toBe(6);
    });

    it('should handle zero mean deviation (flat prices)', () => {
      const data = Array.from({ length: 20 }, () => ({
        open: 100,
        high: 100,
        low: 100,
        close: 100,
      }));
      const cci = calcCCI(data, { period: 5 });
      expect(cci.length).toBe(20);
      expect(cci[10].cci).toBe(0);
    });
  });

  describe('calcATR', () => {
    it('should calculate ATR correctly', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        open: 100 + i,
        high: 110 + i,
        low: 90 + i,
        close: 100 + i,
        volume: 1000,
      }));
      const atr = calcATR(data, { period: 14 });
      expect(atr.length).toBe(20);
      expect(atr[12].atr).toBeNull();
      expect(atr[13].atr).not.toBeNull();
      expect(atr[1].tr).not.toBeNull();
    });

    it('should calculate TR correctly', () => {
      const data = [
        { open: 100, high: 110, low: 90, close: 100, volume: 1000 },
        { open: 105, high: 115, low: 95, close: 105, volume: 1000 },
      ];
      const atr = calcATR(data, { period: 14 });
      expect(atr[1].tr).toBe(20);
    });

    it('should handle null values in data', () => {
      const data = [
        { open: 100, high: 110, low: 90, close: 100 },
        { open: 100, high: null, low: 95, close: 102 },
        { open: 100, high: 115, low: null, close: 105 },
        { open: 100, high: 120, low: 100, close: null },
        { open: 100, high: 125, low: 105, close: 115 },
        { open: 100, high: 130, low: 110, close: 120 },
      ];
      const atr = calcATR(data, { period: 3 });
      expect(atr.length).toBe(6);
      expect(atr[1].tr).toBeNull();
      expect(atr[2].tr).toBeNull();
      expect(atr[3].tr).toBeNull();
    });
  });
});
