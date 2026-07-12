/**
 * normalizeSymbol 穷举解析测试（v2 A1 地基正确性锚）
 */
import { describe, it, expect } from 'vitest';
import { normalizeSymbol, marketOf } from '../../../src/symbols';
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

describe('normalizeSymbol — 特殊指数(specialIndex 注册表)', () => {
  it.each([
    ['930955', 'CN', 'CSI', '930955'],
    ['932000', 'CN', 'CSI', '932000'],
    ['931071', 'CN', 'CSI', '931071'], // 93xxxx 码形匹配,非枚举样本
    ['H30533', 'CN', 'CSI', 'H30533'],
    ['H11136', 'CN', 'CSI', 'H11136'],
    ['h30533', 'CN', 'CSI', 'H30533'], // 大小写归一
    ['HSHCI', 'HK', 'HSI', 'HSHCI'],
    ['GDAXI', 'GLOBAL', 'DAX', 'GDAXI'],
  ] as const)('%s → %s/%s assetType=index', (input, market, exchange, code) => {
    expect(normalizeSymbol(input)).toMatchObject({
      market,
      exchange,
      code,
      assetType: 'index',
    });
  });

  it('特殊指数 secid 回读:前缀与注册表一致时按指数解析', () => {
    expect(normalizeSymbol('2.930955')).toMatchObject({
      market: 'CN',
      exchange: 'CSI',
      assetType: 'index',
      code: '930955',
    });
    expect(normalizeSymbol('2.h30533').code).toBe('H30533');
    expect(normalizeSymbol('124.HSHCI').market).toBe('HK');
    expect(normalizeSymbol('100.GDAXI').market).toBe('GLOBAL');
  });

  it("市场 hint 消歧/冲突:CSI 指数容 {market:'CN'}(kline.cn 链路),跨市场即抛", () => {
    expect(normalizeSymbol('930955', { market: 'CN' }).exchange).toBe('CSI');
    expect(normalizeSymbol('HSHCI', { market: 'HK' }).exchange).toBe('HSI');
    expect(() => normalizeSymbol('HSHCI', { market: 'CN' })).toThrow(
      InvalidSymbolError
    );
    expect(() => normalizeSymbol('GDAXI', { market: 'CN' })).toThrow(
      InvalidSymbolError
    );
  });

  it('码形语法确定三轴:矛盾的 assetType / exchange hint 抛错,不静默改写', () => {
    // 修复前 'H30533'+{assetType:'futures'} 会按 SHFE 'H' 合约解析(无真实合约对应)
    expect(() => normalizeSymbol('H30533', { assetType: 'futures' })).toThrow(
      InvalidSymbolError
    );
    expect(() => normalizeSymbol('2.930955', { assetType: 'stock' })).toThrow(
      InvalidSymbolError
    );
    expect(() => normalizeSymbol('930955', { exchange: 'SSE' })).toThrow(
      InvalidSymbolError
    );
  });

  it('恒生系碰撞码(HSI/HSCEI/HSTECH):market hint 匹配才按港股指数解析,不劫持裸码', () => {
    // 回归护栏(2.4.0 曾把 quotes.hk(['HSI']) 从恒生指数改回空)—— {market:'HK'} 应解析为指数
    for (const [code, ex] of [
      ['HSI', 'HSI'],
      ['HSCEI', 'HSI'],
      ['HSTECH', 'HSI'],
    ] as const) {
      expect(normalizeSymbol(code, { market: 'HK' })).toMatchObject({
        market: 'HK',
        exchange: ex,
        assetType: 'index',
        code,
      });
    }
    // 向后兼容:无 hint 裸 'HSI' 仍归美股 ticker 命名空间,不被指数劫持
    expect(normalizeSymbol('HSI')).toMatchObject({
      market: 'US',
      assetType: 'stock',
      code: 'HSI',
    });
    expect(normalizeSymbol('HSI', { market: 'US' }).market).toBe('US');
    expect(() => normalizeSymbol('HSI', { market: 'CN' })).toThrow(
      InvalidSymbolError
    );
    // 规范形回读:'hkHSI' 是 toTencentSymbol 自身的产出形态,必须解析回恒生指数
    // (此前被解成港股股票 '00HSI',quotes.hk(['hkHSI']) 静默返空、kline.hk 拼死 secid)
    expect(normalizeSymbol('hkHSI')).toMatchObject({
      market: 'HK',
      assetType: 'index',
      code: 'HSI',
    });
    expect(normalizeSymbol('hkhsi')).toMatchObject({ assetType: 'index', code: 'HSI' });
    // 显式 assetType:'stock' 维持 ticker 命名空间(最强消歧优先,不抛错)
    expect(normalizeSymbol('hkHSI', { assetType: 'stock' })).toMatchObject({
      market: 'HK',
      assetType: 'stock',
      code: '00HSI',
    });
    // 显式 secid 回读:100.HSI → 恒生指数
    expect(normalizeSymbol('100.HSI')).toMatchObject({
      market: 'HK',
      assetType: 'index',
      code: 'HSI',
    });
  });

  it('美股指数(DJI/INX/IXIC):{market:US} 按指数解析;裸码与 DJIA-ETF 不被劫持', () => {
    for (const code of ['DJI', 'INX', 'IXIC'] as const) {
      expect(normalizeSymbol(code, { market: 'US' })).toMatchObject({
        market: 'US',
        assetType: 'index',
        code,
      });
    }
    // 向后兼容:裸码仍归美股 stock 命名空间
    expect(normalizeSymbol('DJI')).toMatchObject({
      market: 'US',
      assetType: 'stock',
    });
    // 碰撞安全:DJIA 是真实 ETF(Global X),即便带 {market:'US'} 也不得劫持成道琼斯指数
    expect(normalizeSymbol('DJIA', { market: 'US' })).toMatchObject({
      market: 'US',
      assetType: 'stock',
      code: 'DJIA',
    });
    // 规范形回读:'usDJI' 是 toTencentSymbol 的产出形态,必须解析回指数
    // (此前 us 前缀分支不查 specialIndex,kline.us('usDJI') 抛 NotFoundError)
    for (const [prefixed, code] of [
      ['usDJI', 'DJI'],
      ['usINX', 'INX'],
      ['usIXIC', 'IXIC'],
    ] as const) {
      expect(normalizeSymbol(prefixed)).toMatchObject({
        market: 'US',
        assetType: 'index',
        code,
      });
    }
    // 显式 assetType:'stock' hint:最强消歧,维持 ticker 命名空间且不抛错
    // (此前碰撞门只看 market hint,{market:'US',assetType:'stock'} 反而抛错)
    expect(normalizeSymbol('DJI', { market: 'US', assetType: 'stock' })).toMatchObject({
      market: 'US',
      assetType: 'stock',
      code: 'DJI',
    });
    expect(normalizeSymbol('usDJI', { assetType: 'stock' })).toMatchObject({
      market: 'US',
      assetType: 'stock',
      code: 'DJI',
    });
  });

  it('交易所前缀/后缀断言与特殊指数码形矛盾:与 hint 轴同口径抛错,不拼死 secid', () => {
    expect(() => normalizeSymbol('sh930955')).toThrow(InvalidSymbolError);
    expect(() => normalizeSymbol('930955.SH')).toThrow(InvalidSymbolError);
    expect(() => normalizeSymbol('sz932000')).toThrow(InvalidSymbolError);
    expect(() => normalizeSymbol('H30533.SH')).toThrow(InvalidSymbolError);
    // hk 前缀/后缀同口径(此前静默拼出 116.HSHCI 死 secid)
    expect(() => normalizeSymbol('hkHSHCI')).toThrow(InvalidSymbolError);
    expect(() => normalizeSymbol('HSHCI.HK')).toThrow(InvalidSymbolError);
    expect(() => normalizeSymbol('hk930955')).toThrow(InvalidSymbolError);
    // us 前缀维持美股 ticker 断言语义(纯字母码是真实 ticker 命名空间)
    expect(normalizeSymbol('usGDAXI')).toMatchObject({
      market: 'US',
      assetType: 'stock',
      code: 'GDAXI',
    });
  });

  it("非特殊码形不受 carve-out 影响:'900901' 仍为沪 B 股票", () => {
    expect(normalizeSymbol('900901')).toMatchObject({
      market: 'CN',
      exchange: 'SSE',
      assetType: 'stock',
    });
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

describe('marketOf — F42 detectMarket 双实现收编', () => {
  it.each([
    ['600519', 'CN'],
    ['sh600519', 'CN'],
    ['600519.SH', 'CN'],
    ['00700', 'HK'],
    ['0700', 'HK'],
    ['hk700', 'HK'],
    ['116.00700', 'HK'],
    ['00700.HK', 'HK'],
    ['AAPL', 'US'],
    ['105.AAPL', 'US'],
    ['usAAPL', 'US'],
    ['930955', 'CN'],
    ['HSHCI', 'HK'],
    ['GDAXI', 'GLOBAL'],
  ] as const)('%s → %s', (input, market) => {
    expect(marketOf(input)).toBe(market);
  });

  it('解析失败返回 undefined,不抛错(fallback 决策留给调用方)', () => {
    expect(marketOf('')).toBeUndefined();
    expect(marketOf('!!!')).toBeUndefined();
    expect(marketOf('@#$')).toBeUndefined();
  });
});
