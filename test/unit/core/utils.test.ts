import { describe, it, expect } from 'vitest';
import { chunkArray, asyncPool } from '../../../src/utils';
import { getMarketCode, getPeriodCode, getAdjustCode } from '../../../src/core';

describe('core utils', () => {
  describe('chunkArray', () => {
    it('should chunk array correctly', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunks = chunkArray(arr, 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('should handle empty array', () => {
      const chunks = chunkArray([], 2);
      expect(chunks).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      const arr = [1, 2, 3];
      const chunks = chunkArray(arr, 10);
      expect(chunks).toEqual([[1, 2, 3]]);
    });

    it('should throw for invalid chunk size', () => {
      expect(() => chunkArray([1, 2], 0)).toThrow(/chunkSize/i);
      expect(() => chunkArray([1, 2], -1)).toThrow(/chunkSize/i);
      expect(() => chunkArray([1, 2], 1.5)).toThrow(/chunkSize/i);
    });
  });

  describe('asyncPool', () => {
    it('should execute tasks with concurrency limit', async () => {
      const results: number[] = [];
      const tasks = [1, 2, 3, 4, 5].map((n) => async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(n);
        return n * 2;
      });

      const output = await asyncPool(tasks, 2);
      expect(output).toEqual([2, 4, 6, 8, 10]);
      expect(results.length).toBe(5);
    });

    it('should handle empty tasks', async () => {
      const output = await asyncPool([], 2);
      expect(output).toEqual([]);
    });

    it('should correctly remove completed promises', async () => {
      let completedCount = 0;
      const tasks = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        completedCount++;
        return n;
      });

      const output = await asyncPool(tasks, 3);
      expect(completedCount).toBe(8);
      expect(output).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('should handle concurrency of 1', async () => {
      const tasks = [1, 2, 3].map((n) => async () => n * 2);
      const output = await asyncPool(tasks, 1);
      expect(output).toEqual([2, 4, 6]);
    });

    it('should throw for invalid concurrency', async () => {
      await expect(asyncPool([async () => 1], 0)).rejects.toThrow(/concurrency/i);
      await expect(asyncPool([async () => 1], -1)).rejects.toThrow(/concurrency/i);
    });

    it('should handle high concurrency with many fast tasks', async () => {
      const tasks = Array.from({ length: 20 }, (_, i) => async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return i;
      });
      const output = await asyncPool(tasks, 5);
      expect(output.length).toBe(20);
      expect(output.sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    });
  });

  describe('getMarketCode', () => {
    it('should return 1 for Shanghai stocks', () => {
      expect(getMarketCode('sh600519')).toBe('1');
      expect(getMarketCode('600519')).toBe('1');
      expect(getMarketCode('688001')).toBe('1');
    });

    it('should return 0 for Shenzhen stocks', () => {
      expect(getMarketCode('sz000001')).toBe('0');
      expect(getMarketCode('000001')).toBe('0');
      expect(getMarketCode('300001')).toBe('0');
    });

    it('should return 0 for Beijing stocks', () => {
      expect(getMarketCode('bj430047')).toBe('0');
      expect(getMarketCode('430047')).toBe('0');
    });
  });

  describe('getPeriodCode', () => {
    it('should return correct period codes', () => {
      expect(getPeriodCode('daily')).toBe('101');
      expect(getPeriodCode('weekly')).toBe('102');
      expect(getPeriodCode('monthly')).toBe('103');
    });
  });

  describe('getAdjustCode', () => {
    it('should return correct adjust codes', () => {
      expect(getAdjustCode('')).toBe('0');
      expect(getAdjustCode('qfq')).toBe('1');
      expect(getAdjustCode('hfq')).toBe('2');
    });
  });
});
