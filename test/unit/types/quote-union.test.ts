/**
 * Quote 可辨识联合（v2 A2）测试
 */
import { describe, it, expect } from 'vitest';
import {
  parseFullQuote,
  parseHKQuote,
  parseUSQuote,
  parseFundQuote,
} from '../../../src/providers/tencent/parsers';
import type { Quote } from '../../../src/types';

function fields(len: number, code = '600519'): string[] {
  const f = new Array(len).fill('');
  f[2] = code;
  return f;
}

describe('Quote 可辨识联合', () => {
  it('各 parser 标注 market / assetType / source 判别字段', () => {
    expect(parseFullQuote(fields(80))).toMatchObject({
      market: 'CN',
      assetType: 'stock',
      source: 'tencent',
    });
    expect(parseHKQuote(fields(50, '00700'))).toMatchObject({
      market: 'HK',
      assetType: 'stock',
      source: 'tencent',
    });
    expect(parseUSQuote(fields(60, 'AAPL'))).toMatchObject({
      market: 'US',
      assetType: 'stock',
      source: 'tencent',
    });
    expect(parseFundQuote(fields(20, '110011'))).toMatchObject({
      market: 'CN',
      assetType: 'fund',
      source: 'tencent',
    });
  });

  it('可按 assetType 收窄到具体成员', () => {
    const q: Quote = parseFundQuote(fields(20, '110011'));
    expect(q.market).toBe('CN');
    if (q.assetType === 'fund') {
      // TS 在此分支收窄到 FundQuote，nav 可直接访问
      expect(typeof q.nav).toBe('number');
    } else {
      throw new Error('expected fund');
    }
  });
});
