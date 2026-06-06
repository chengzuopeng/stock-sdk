/**
 * 符号适配器测试（NormalizedSymbol → 各源原生格式）
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeSymbol,
  toTencentSymbol,
  toEastmoneySecid,
} from '../../../src/symbols';

describe('toTencentSymbol', () => {
  it.each([
    ['600519', 'sh600519'],
    ['000001', 'sz000001'],
    ['920819', 'bj920819'],
    ['00700', 'hk00700'],
    ['AAPL', 'usAAPL'],
  ])('%s → %s', (input, expected) => {
    expect(toTencentSymbol(normalizeSymbol(input))).toBe(expected);
  });
});

describe('toEastmoneySecid', () => {
  it.each([
    ['600519', '1.600519'],
    ['000001', '0.000001'],
    ['688981', '1.688981'],
    ['300750', '0.300750'],
    ['00700', '116.00700'],
    ['105.AAPL', '105.AAPL'],
    ['106.BABA', '106.BABA'],
  ])('%s → %s', (input, expected) => {
    expect(toEastmoneySecid(normalizeSymbol(input))).toBe(expected);
  });
});

describe('round-trip 稳定性', () => {
  it('腾讯前缀 → normalize → toTencentSymbol 还原', () => {
    for (const s of ['sh600519', 'sz000001', 'hk00700', 'usAAPL']) {
      expect(toTencentSymbol(normalizeSymbol(s))).toBe(s);
    }
  });
});
