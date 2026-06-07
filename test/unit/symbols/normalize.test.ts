/**
 * normalizeSymbol 穷举解析测试（v2 A1 地基正确性锚）
 */
import { describe, it, expect } from 'vitest';
import { normalizeSymbol } from '../../../src/symbols';
import { InvalidSymbolError } from '../../../src/core';

describe('normalizeSymbol — A 股', () => {
  it.each([
    ['sh600519', 'SSE', '600519'],
    ['sz000001', 'SZSE', '000001'],
    ['bj920819', 'BSE', '920819'],
    ['600519', 'SSE', '600519'],
    ['000001', 'SZSE', '000001'],
    ['300750', 'SZSE', '300750'],
    ['688981', 'SSE', '688981'],
    ['510050', 'SSE', '510050'],
    ['600519.SH', 'SSE', '600519'],
    ['000001.SZ', 'SZSE', '000001'],
    ['1.600519', 'SSE', '600519'],
    ['0.000001', 'SZSE', '000001'],
  ])('%s → CN/%s/%s', (input, exchange, code) => {
    const ns = normalizeSymbol(input);
    expect(ns.market).toBe('CN');
    expect(ns.exchange).toBe(exchange);
    expect(ns.code).toBe(code);
    expect(ns.assetType).toBe('stock');
  });
});

describe('normalizeSymbol — 港股', () => {
  it.each([
    ['hk00700', '00700'],
    ['hk700', '00700'],
    ['00700', '00700'],
    ['0700', '00700'],
    ['00700.HK', '00700'],
    ['116.00700', '00700'],
  ])('%s → HK/HKEX/%s', (input, code) => {
    const ns = normalizeSymbol(input);
    expect(ns.market).toBe('HK');
    expect(ns.exchange).toBe('HKEX');
    expect(ns.code).toBe(code);
  });
});

describe('normalizeSymbol — 美股', () => {
  it.each([
    ['AAPL', 'US', 'AAPL'],
    ['usAAPL', 'US', 'AAPL'],
    ['105.AAPL', 'NASDAQ', 'AAPL'],
    ['106.BABA', 'NYSE', 'BABA'],
  ])('%s → US/%s/%s', (input, exchange, code) => {
    const ns = normalizeSymbol(input);
    expect(ns.market).toBe('US');
    expect(ns.exchange).toBe(exchange);
    expect(ns.code).toBe(code);
  });
});

describe('normalizeSymbol — 期货 / 板块', () => {
  it('CFFEX.IF2412 → 国内股指期货', () => {
    const ns = normalizeSymbol('CFFEX.IF2412');
    expect(ns).toMatchObject({
      market: 'CN',
      exchange: 'CFFEX',
      assetType: 'futures',
      code: 'IF2412',
      variety: 'IF',
    });
  });

  it('COMEX.GC → 海外期货(GLOBAL)', () => {
    const ns = normalizeSymbol('COMEX.GC');
    expect(ns).toMatchObject({
      market: 'GLOBAL',
      exchange: 'COMEX',
      assetType: 'futures',
    });
  });

  it('裸合约 rb2510 需 hint=futures', () => {
    const ns = normalizeSymbol('rb2510', { assetType: 'futures' });
    expect(ns).toMatchObject({
      assetType: 'futures',
      code: 'RB2510',
      variety: 'RB',
    });
  });

  it('90.BK0475 → 板块', () => {
    expect(normalizeSymbol('90.BK0475').assetType).toBe('board');
  });
});

describe('normalizeSymbol — hint 与 SymbolRef', () => {
  it('hint.assetType 生效', () => {
    expect(normalizeSymbol('600519', { assetType: 'index' }).assetType).toBe(
      'index'
    );
    expect(normalizeSymbol('510050', { assetType: 'fund' }).assetType).toBe(
      'fund'
    );
  });

  it('SymbolRef 字段优先于 hint', () => {
    const ns = normalizeSymbol(
      { code: '600519', assetType: 'index' },
      { assetType: 'fund' }
    );
    expect(ns.assetType).toBe('index');
  });

  it('SymbolRef.code 也走容错解析', () => {
    const ns = normalizeSymbol({ code: 'sh600519' });
    expect(ns).toMatchObject({ market: 'CN', exchange: 'SSE', code: '600519' });
  });
});

describe('normalizeSymbol — 非法输入', () => {
  it.each(['', '   ', '!!!', '@#$'])('%j → InvalidSymbolError', (bad) => {
    expect(() => normalizeSymbol(bad)).toThrow(InvalidSymbolError);
  });
});
