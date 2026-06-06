/**
 * Review 问题回归测试（symbols 链 #11/#12/#13/#14）
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeSymbol,
  toEastmoneySecid,
  toTencentSymbol,
} from '../../../src/symbols';
import { InvalidSymbolError, InvalidArgumentError } from '../../../src/core';

describe('#11 字母 ticker 不被 sh/sz/bj 前缀吞掉', () => {
  it.each(['SHW', 'SHOP', 'SZL', 'BJX'])('%s → US', (t) => {
    expect(normalizeSymbol(t)).toMatchObject({ market: 'US', code: t });
  });

  it('hint.market 覆盖推断的 market', () => {
    expect(normalizeSymbol('600519', { market: 'US' }).market).toBe('US');
  });
});

describe('#12 us 前缀 / 美股 code 统一大写', () => {
  it('usaapl → AAPL，下游拼成大写', () => {
    expect(normalizeSymbol('usaapl').code).toBe('AAPL');
    expect(toTencentSymbol(normalizeSymbol('usaapl'))).toBe('usAAPL');
    expect(toEastmoneySecid(normalizeSymbol('usaapl'))).toBe('105.AAPL');
  });
});

describe('#13 GLOBAL 期货无 exchange 时报错而非默认 SHFE', () => {
  it('缺 exchange → InvalidSymbolError', () => {
    expect(() => normalizeSymbol('GC2412', { market: 'GLOBAL' })).toThrow(
      InvalidSymbolError
    );
  });

  it('显式 exchange 正确解析', () => {
    expect(
      normalizeSymbol('GC2412', { market: 'GLOBAL', exchange: 'COMEX' })
    ).toMatchObject({ market: 'GLOBAL', exchange: 'COMEX', assetType: 'futures' });
  });
});

describe('#14 adapters 按 assetType 分类，未知组合抛错而非静默兜底', () => {
  it('board → 90.', () => {
    expect(toEastmoneySecid(normalizeSymbol('90.BK0475'))).toBe('90.BK0475');
  });

  it('期货不走股票 secid → 抛错（不再误拼成 1./105.）', () => {
    const fut = normalizeSymbol('CFFEX.IF2412');
    expect(() => toEastmoneySecid(fut)).toThrow(InvalidArgumentError);
    expect(() => toTencentSymbol(fut)).toThrow(InvalidArgumentError);
  });

  it('海外期货 COMEX.GC 不再被当美股 105.', () => {
    const gc = normalizeSymbol('COMEX.GC2412');
    expect(gc).toMatchObject({ market: 'GLOBAL', exchange: 'COMEX' });
    expect(() => toEastmoneySecid(gc)).toThrow(InvalidArgumentError);
  });
});
