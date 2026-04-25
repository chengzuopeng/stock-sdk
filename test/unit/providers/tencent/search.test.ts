import { describe, expect, it } from 'vitest';
import { normalizeSearchType } from '../../../../src/providers/tencent/search';
import type { SearchResultType } from '../../../../src/types';

/**
 * 锁定 normalizeSearchType 对所有已知 raw type 的归一化结果，
 * 防止再次出现「文档承诺 fund，实际归到 other」类的回退。
 */
describe('normalizeSearchType', () => {
  const cases: Array<{ raw: string; expected: SearchResultType }> = [
    // 股票
    { raw: 'GP-A', expected: 'stock' },
    { raw: 'GP-B', expected: 'stock' },
    { raw: 'GP', expected: 'stock' },
    { raw: 'gp-a', expected: 'stock' },
    { raw: 'STOCK', expected: 'stock' },

    // 指数
    { raw: 'ZS', expected: 'index' },
    { raw: 'INDEX', expected: 'index' },

    // 场内基金
    { raw: 'ETF', expected: 'fund' },
    { raw: 'LOF', expected: 'fund' },
    { raw: 'QDII-ETF', expected: 'fund' },
    { raw: 'QDII-LOF', expected: 'fund' },

    // 场外基金
    { raw: 'KJ', expected: 'fund' },
    { raw: 'KJ-HB', expected: 'fund' },
    { raw: 'KJ-CX', expected: 'fund' },
    { raw: 'QDII', expected: 'fund' },
    { raw: 'QDII-FOF', expected: 'fund' },
    { raw: 'JJ', expected: 'fund' },
    { raw: 'FUND', expected: 'fund' },

    // 债券
    { raw: 'ZQ', expected: 'bond' },
    { raw: 'BOND', expected: 'bond' },

    // 期货
    { raw: 'QH', expected: 'futures' },
    { raw: 'FUTURE', expected: 'futures' },

    // 期权
    { raw: 'QZ', expected: 'option' },
    { raw: 'OPTION', expected: 'option' },

    // 兜底
    { raw: '', expected: 'other' },
    { raw: 'UNKNOWN_TYPE', expected: 'other' },
  ];

  for (const { raw, expected } of cases) {
    it(`should map "${raw}" -> "${expected}"`, () => {
      expect(normalizeSearchType(raw)).toBe(expected);
    });
  }

  it('should be case-insensitive for KJ family (smartbox 实际返回是大写)', () => {
    expect(normalizeSearchType('kj-hb')).toBe('fund');
    expect(normalizeSearchType('Kj-Cx')).toBe('fund');
  });

  it('should not classify GP-A as fund even when keywords overlap loosely', () => {
    expect(normalizeSearchType('GP-A')).not.toBe('fund');
    expect(normalizeSearchType('GP-A')).toBe('stock');
  });
});
