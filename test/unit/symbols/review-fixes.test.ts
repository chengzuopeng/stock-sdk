/**
 * Review 问题回归测试（symbols 链 #11/#12/#13/#14）
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeSymbol,
  toEastmoneySecid,
  toTencentSymbol,
  EXCHANGE_TO_SECID_PREFIX,
} from '../../../src/symbols';
// 非公共 API,仅供 R3-14 一致性测试直读(见 normalize.ts 导出注释)
import { SECID_ADMISSIBLE_EXCHANGES } from '../../../src/symbols/normalize';
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

describe('R3-4 同市场 exchange hint 与语法确定的交易所矛盾 → 抛错(不再静默覆盖)', () => {
  it("'600519.SH' + {exchange:'SZSE'} → InvalidSymbolError(此前产出 SZSE/600519,toTencentSymbol 拼错 sz600519)", () => {
    expect(() => normalizeSymbol('600519.SH', { exchange: 'SZSE' })).toThrow(
      InvalidSymbolError
    );
  });

  it("'0.bj430047' + {exchange:'SZSE'} → InvalidSymbolError(bj 前缀已把有损 secid '0' 消歧为 BSE,打回 P2-9 修掉的 sz430047)", () => {
    expect(() => normalizeSymbol('0.bj430047', { exchange: 'SZSE' })).toThrow(
      InvalidSymbolError
    );
  });

  it('sh/sz/bj 字母前缀与点分 secid 同样确定', () => {
    expect(() => normalizeSymbol('sh600519', { exchange: 'SZSE' })).toThrow(
      InvalidSymbolError
    );
    expect(() => normalizeSymbol('1.600519', { exchange: 'SZSE' })).toThrow(
      InvalidSymbolError
    );
  });

  it("合法消歧不回归:美股 'US' 是占位推断,'AAPL'/'usAAPL'/'aapl.US' + {exchange:'NASDAQ'} 照常覆盖", () => {
    expect(normalizeSymbol('AAPL', { exchange: 'NASDAQ' }).exchange).toBe('NASDAQ');
    expect(normalizeSymbol('usAAPL', { exchange: 'NASDAQ' }).exchange).toBe('NASDAQ');
    expect(normalizeSymbol('aapl.US', { exchange: 'NYSE' }).exchange).toBe('NYSE');
  });

  it('合法消歧不回归:纯数字分支 exchange 是推断值,hint 仍可覆盖;一致 hint 无矛盾', () => {
    // inferAShareExchange 把 '000001' 推断为 SZSE,用户显式纠偏仍允许(消歧语义)
    expect(normalizeSymbol('000001', { exchange: 'BSE' }).exchange).toBe('BSE');
    expect(normalizeSymbol('600519', { exchange: 'SSE' }).exchange).toBe('SSE');
    expect(normalizeSymbol('00700', { exchange: 'HKEX' }).exchange).toBe('HKEX');
  });
});

describe('R3-5 assetType hint 与语法确定的资产类型矛盾 → 抛错', () => {
  it("'90.BK0475' + {assetType:'stock'} → InvalidSymbolError(此前覆盖成 stock 拼出 1.BK0475 垃圾查询)", () => {
    expect(() => normalizeSymbol('90.BK0475', { assetType: 'stock' })).toThrow(
      InvalidSymbolError
    );
  });

  it("'CFFEX.IF2412' + {assetType:'stock'} → InvalidSymbolError(期货语法确定)", () => {
    expect(() => normalizeSymbol('CFFEX.IF2412', { assetType: 'stock' })).toThrow(
      InvalidSymbolError
    );
  });

  it("'600519' + {assetType:'board'} → InvalidSymbolError(股票形状的码不可能是板块,此前拼出 90.600519)", () => {
    expect(() => normalizeSymbol('600519', { assetType: 'board' })).toThrow(
      InvalidSymbolError
    );
  });

  it("'600519' + {assetType:'futures'} → InvalidSymbolError(纯数字不可能是期货合约)", () => {
    expect(() => normalizeSymbol('600519', { assetType: 'futures' })).toThrow(
      InvalidSymbolError
    );
  });

  it("合法消歧不回归:fund/index 对推断 'stock' 的覆盖照旧(quotes.fund 链路)", () => {
    expect(normalizeSymbol('510050', { assetType: 'fund' }).assetType).toBe('fund');
    expect(normalizeSymbol('000300', { assetType: 'index' }).assetType).toBe('index');
  });

  it("合法路径不回归:裸合约 + {assetType:'futures'} / 一致 hint 照常", () => {
    expect(normalizeSymbol('rb2510', { assetType: 'futures' }).assetType).toBe('futures');
    expect(normalizeSymbol('90.BK0475', { assetType: 'board' }).assetType).toBe('board');
    expect(
      normalizeSymbol('CFFEX.IF2412', { assetType: 'futures' }).assetType
    ).toBe('futures');
  });
});

describe("R3-6 纯数字 '0.' secid 用 inferAShareExchange 细化(与裸码解析一致)", () => {
  it("'0.430047' → BSE,toTencentSymbol 拼出 bj430047(此前固定 SZSE 拼错 sz430047,与裸 '430047' 矛盾)", () => {
    const ns = normalizeSymbol('0.430047');
    expect(ns).toMatchObject({ market: 'CN', exchange: 'BSE', code: '430047' });
    expect(toTencentSymbol(ns)).toBe('bj430047');
    // 与裸码解析一致
    expect(normalizeSymbol('430047').exchange).toBe('BSE');
  });

  it("'0.000001' → SZSE 不变", () => {
    expect(normalizeSymbol('0.000001')).toMatchObject({
      exchange: 'SZSE',
      code: '000001',
    });
  });

  it("'0.920819' → BSE(92 段新代码)", () => {
    expect(normalizeSymbol('0.920819').exchange).toBe('BSE');
  });

  it("'0.600519'(infer 给 SSE,不在 '0' 可容集)→ 保守维持 SZSE 原行为,不抛错", () => {
    expect(normalizeSymbol('0.600519').exchange).toBe('SZSE');
  });

  it('细化值属推断:exchange hint 仍可在可容集内消歧覆盖', () => {
    expect(normalizeSymbol('0.430047', { exchange: 'SZSE' }).exchange).toBe('SZSE');
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

describe('R3-14 SECID_ADMISSIBLE_EXCHANGES 与 adapters 前缀表一致性', () => {
  // 反演 EXCHANGE_TO_SECID_PREFIX:共享同一 secid 前缀的【真实】交易所集合。
  // 过滤规则按 adapters 现状:'US' 是“具体交易所未知”的占位键(105 与
  // NASDAQ 同前缀属别名而非歧义,normalizeSymbol 解析 '105.' 也只产出
  // NASDAQ),不参与歧义集反演;其余键均为 EXCHANGE_MARKET 已知的真实交易所。
  const byPrefix = new Map<string, string[]>();
  for (const [exchange, prefix] of Object.entries(EXCHANGE_TO_SECID_PREFIX)) {
    if (exchange === 'US') continue;
    byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), exchange]);
  }

  it('每个多交易所共享前缀都已登记,且集合一致(新增共享前缀忘登记 → 红)', () => {
    for (const [prefix, exchanges] of byPrefix) {
      if (exchanges.length <= 1) continue;
      expect(
        SECID_ADMISSIBLE_EXCHANGES[prefix],
        `有损前缀 '${prefix}'(${exchanges.join('/')})未登记进 SECID_ADMISSIBLE_EXCHANGES`
      ).toBeDefined();
      expect([...SECID_ADMISSIBLE_EXCHANGES[prefix]].sort()).toEqual(
        [...exchanges].sort()
      );
    }
    // 现状:'0' 是唯一的多交易所前缀(SZSE/BSE)
    expect([...byPrefix.entries()].filter(([, ex]) => ex.length > 1)).toHaveLength(1);
  });

  it('登记表不含 adapters 中不存在的有损前缀(防腐烂方向)', () => {
    for (const [prefix, admissible] of Object.entries(SECID_ADMISSIBLE_EXCHANGES)) {
      const real = byPrefix.get(prefix) ?? [];
      expect(
        real.length,
        `SECID_ADMISSIBLE_EXCHANGES['${prefix}'] 在 adapters 中已不是多交易所共享前缀`
      ).toBeGreaterThan(1);
      expect([...admissible].sort()).toEqual([...real].sort());
    }
  });
});

describe('R7-1 裸前缀不吞真实 US*/HK* ticker（2026-07 review）', () => {
  // 修复目标：'USB'（US Bancorp）等真实 ticker 不再被 us/hk 前缀吞掉
  it.each(['USB', 'usb', 'USO', 'USFD', 'HKD', 'hkd', 'HKIT'])(
    '%s → 完整 ticker 归 US',
    (t) => {
      expect(normalizeSymbol(t)).toMatchObject({ market: 'US', code: t.toUpperCase() });
    }
  );

  it('规范形（小写前缀 + 大写开头 rest）继续剥前缀', () => {
    expect(normalizeSymbol('usAAPL')).toMatchObject({ market: 'US', code: 'AAPL' });
    expect(normalizeSymbol('usBRK.A')).toMatchObject({ market: 'US', code: 'BRK.A' });
    expect(normalizeSymbol('usAAPL.OQ')).toMatchObject({ market: 'US', code: 'AAPL.OQ' });
    expect(normalizeSymbol('hkHSI')).toMatchObject({
      market: 'HK',
      code: '00HSI', // padStart 与 externalLinks 既有行为一致
    });
  });

  it('全小写手输形（rest ≥3）继续剥前缀', () => {
    expect(normalizeSymbol('usaapl').code).toBe('AAPL');
    expect(normalizeSymbol('hkhsi')).toMatchObject({ market: 'HK', code: '00HSI' });
  });

  it('数字 rest 任意大小写前缀都剥（与历史一致）', () => {
    expect(normalizeSymbol('hk00700')).toMatchObject({ market: 'HK', code: '00700' });
    expect(normalizeSymbol('HK00700')).toMatchObject({ market: 'HK', code: '00700' });
    expect(normalizeSymbol('us600519')).toMatchObject({ market: 'US', code: '600519' });
  });

  it('特殊指数冲突检查在剥前缀后照跑：hkHSHCI 仍抛带指引的 InvalidSymbolError', () => {
    expect(() => normalizeSymbol('hkHSHCI')).toThrow(InvalidSymbolError);
    expect(() => normalizeSymbol('hkHSHCI')).toThrow(/HSHCI/);
  });

  it('已知取舍：全大写前缀 + 字母 rest 不再剥（改用点分或 hint）', () => {
    expect(normalizeSymbol('USAAPL')).toMatchObject({ market: 'US', code: 'USAAPL' });
    expect(normalizeSymbol('HKHSI')).toMatchObject({ market: 'US', code: 'HKHSI' });
    // 点分/hint 通道不受影响
    expect(normalizeSymbol('AAPL.US')).toMatchObject({ market: 'US', code: 'AAPL' });
  });

  it('点分形式保持既有保护（USB.US 不剥）', () => {
    expect(normalizeSymbol('USB.US')).toMatchObject({ market: 'US', code: 'USB' });
  });
});

describe('R7-1 小写手输形收紧为纯字母（review 修正）', () => {
  it("'usb.a'（含分隔符的 2 字母 ticker）不被误剥成 'B.A'", () => {
    // rest 'b.a' 长度 3 但含点 → 不进全小写手输形 → 落纯字母分支
    expect(normalizeSymbol('usb.a')).toMatchObject({ market: 'US', code: 'USB.A' });
  });

  it('全小写纯字母手输形仍剥前缀（钉死行为不变）', () => {
    expect(normalizeSymbol('usaapl').code).toBe('AAPL');
    expect(normalizeSymbol('hkhsi')).toMatchObject({ market: 'HK', code: '00HSI' });
  });

  it('规范形的点分 rest 仍剥（usBRK.A → BRK.A）', () => {
    expect(normalizeSymbol('usBRK.A')).toMatchObject({ market: 'US', code: 'BRK.A' });
  });
});
