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

describe('N1/P1-3 market hint 与确定性解析矛盾 → 抛错(不再静默选边)', () => {
  it('AAPL + {market:CN} → InvalidSymbolError(此前静默解析为 US,kline.hk 一类调用方会拿到错市场真数据)', () => {
    expect(() => normalizeSymbol('AAPL', { market: 'CN' })).toThrow(
      InvalidSymbolError
    );
  });

  it('字母/点分/前缀分支同样校验 market hint', () => {
    expect(() => normalizeSymbol('AAPL', { market: 'HK' })).toThrow(InvalidSymbolError);
    expect(() => normalizeSymbol('sh600519', { market: 'HK' })).toThrow(InvalidSymbolError);
    expect(() => normalizeSymbol('600519.SH', { market: 'HK' })).toThrow(InvalidSymbolError);
    expect(() => normalizeSymbol('1.600519', { market: 'HK' })).toThrow(InvalidSymbolError);
  });

  it('hint 与解析一致时照常通过', () => {
    expect(normalizeSymbol('AAPL', { market: 'US' }).market).toBe('US');
    expect(normalizeSymbol('sh600519', { market: 'CN' }).exchange).toBe('SSE');
    expect(normalizeSymbol('hk00700', { market: 'HK' }).code).toBe('00700');
  });
});

describe('P2-9 有损 secid 前缀的可容交易所集(0 同时承载 SZSE/BSE)', () => {
  it("'0.bj430047' 自洽输入不再被误拒,bj 前缀细化交易所为 BSE", () => {
    const ns = normalizeSymbol('0.bj430047');
    expect(ns).toMatchObject({ market: 'CN', exchange: 'BSE', code: '430047' });
    expect(toTencentSymbol(ns)).toBe('bj430047'); // 此前 '0.430047' 会拼成错误的 sz430047
  });

  it("'0.sz000001' 照常(SZSE ∈ 可容集)", () => {
    expect(normalizeSymbol('0.sz000001')).toMatchObject({ exchange: 'SZSE', code: '000001' });
  });

  it("'1.sz000001' 真矛盾仍拒绝('1' 无歧义,仅 SSE)", () => {
    expect(() => normalizeSymbol('1.sz000001')).toThrow(InvalidSymbolError);
  });
});

describe('P2-10 点分形式 code 归一(HK 补零 / US 大写),消除随写法漂移', () => {
  it.each([
    ['700.HK', '00700'],
    ['0700.HK', '00700'],
    ['116.700', '00700'],
    ['hk700', '00700'],
  ])('%s → code %s', (input, code) => {
    expect(normalizeSymbol(input).code).toBe(code);
  });

  it('US 点分小写统一大写', () => {
    expect(normalizeSymbol('105.aapl').code).toBe('AAPL');
    expect(normalizeSymbol('aapl.US').code).toBe('AAPL');
  });
});

describe('P1-5 点分后缀查找不命中 Object.prototype 继承键', () => {
  it.each(['600519.constructor', '600519.__proto__', '600519.toString', '600519.hasOwnProperty'])(
    '%s → InvalidSymbolError(而非 market/exchange 均 undefined 的畸形对象)',
    (input) => {
      expect(() => normalizeSymbol(input)).toThrow(InvalidSymbolError);
    }
  );

  it('正常后缀不受守卫影响', () => {
    expect(normalizeSymbol('600519.sh').exchange).toBe('SSE');
  });
});

describe('PR#38 点分形式剥离冗余前缀(防双前缀)', () => {
  it('sh600519.SH → code 600519，下游不拼成 shsh600519', () => {
    const ns = normalizeSymbol('sh600519.SH');
    expect(ns).toMatchObject({ market: 'CN', exchange: 'SSE', code: '600519' });
    expect(toTencentSymbol(ns)).toBe('sh600519');
  });

  it('sz000001.SZ → code 000001', () => {
    expect(normalizeSymbol('sz000001.SZ').code).toBe('000001');
  });

  it('无前缀的点分形式不受影响', () => {
    expect(normalizeSymbol('600519.SH')).toMatchObject({ exchange: 'SSE', code: '600519' });
  });
});

describe('F5 纯数字分支尊重显式 market:CN(不再被长度启发式强判港股)', () => {
  it("normalizeSymbol('00700', {market:'CN'}) → CN（hint 形式）", () => {
    expect(normalizeSymbol('00700', { market: 'CN' })).toMatchObject({
      market: 'CN',
      exchange: 'SZSE',
      code: '00700',
    });
  });

  it("normalizeSymbol({code:'01810', market:'CN'}) → CN（SymbolRef 形式）", () => {
    expect(normalizeSymbol({ code: '01810', market: 'CN' }).market).toBe('CN');
  });

  it('4 位 + market:CN → CN', () => {
    expect(normalizeSymbol('0001', { market: 'CN' }).market).toBe('CN');
  });

  it('显式 HK / US hint 与无 hint 默认行为不变', () => {
    expect(normalizeSymbol('700', { market: 'HK' })).toMatchObject({
      market: 'HK',
      code: '00700',
    });
    expect(normalizeSymbol('00700')).toMatchObject({ market: 'HK', code: '00700' });
    expect(normalizeSymbol('12345', { market: 'US' }).market).toBe('US');
  });

  it('6 位 + market:CN 照常', () => {
    expect(normalizeSymbol('600519', { market: 'CN' })).toMatchObject({
      market: 'CN',
      exchange: 'SSE',
    });
  });
});

describe('F24 exchange hint 与解析结果矛盾时抛错(不再产出矛盾对象)', () => {
  it("'600519' + {exchange:'HKEX'} → InvalidSymbolError", () => {
    expect(() => normalizeSymbol('600519', { exchange: 'HKEX' })).toThrow(
      InvalidSymbolError
    );
  });

  it("'00700' + {exchange:'SSE'} → InvalidSymbolError", () => {
    expect(() => normalizeSymbol('00700', { exchange: 'SSE' })).toThrow(
      InvalidSymbolError
    );
  });

  it('同市场内的 exchange 覆盖仍合法(AAPL + NASDAQ)', () => {
    expect(normalizeSymbol('AAPL', { exchange: 'NASDAQ' })).toMatchObject({
      market: 'US',
      exchange: 'NASDAQ',
    });
  });

  it('期货 exchange hint 直接确定市场(COMEX → GLOBAL,无需重复传 market)', () => {
    expect(
      normalizeSymbol('GC2412', { assetType: 'futures', exchange: 'COMEX' })
    ).toMatchObject({ market: 'GLOBAL', exchange: 'COMEX', assetType: 'futures' });
  });

  it('期货 market 与 exchange 矛盾 → 抛错(CN + COMEX)', () => {
    expect(() =>
      normalizeSymbol('GC2412', {
        market: 'CN',
        assetType: 'futures',
        exchange: 'COMEX',
      })
    ).toThrow(InvalidSymbolError);
  });
});

describe('F25 secid 分支剥离冗余前缀 + 前缀/解析矛盾检测', () => {
  it("'1.sh600519' → code 600519（修复 PR#38 同款问题的隔壁分支）", () => {
    const ns = normalizeSymbol('1.sh600519');
    expect(ns).toMatchObject({ market: 'CN', exchange: 'SSE', code: '600519' });
    expect(toTencentSymbol(ns)).toBe('sh600519');
  });

  it("'0.sz000001' → code 000001", () => {
    expect(normalizeSymbol('0.sz000001').code).toBe('000001');
  });

  it("'1.sz000001' 前缀与 secid 矛盾 → InvalidSymbolError", () => {
    expect(() => normalizeSymbol('1.sz000001')).toThrow(InvalidSymbolError);
  });

  it("'hk00700.SZ' 前缀与后缀矛盾 → InvalidSymbolError（不再静默剥成 CN）", () => {
    expect(() => normalizeSymbol('hk00700.SZ')).toThrow(InvalidSymbolError);
  });

  it("'sh600519.SZ' 交易所级矛盾 → InvalidSymbolError", () => {
    expect(() => normalizeSymbol('sh600519.SZ')).toThrow(InvalidSymbolError);
  });

  it("'hk00700.HK' 一致 → 正常剥离", () => {
    expect(normalizeSymbol('hk00700.HK')).toMatchObject({
      market: 'HK',
      code: '00700',
    });
  });

  it("'SHW.US' 字母 ticker 不被当前缀剥离", () => {
    expect(normalizeSymbol('SHW.US').code).toBe('SHW');
  });
});
