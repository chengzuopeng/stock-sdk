/**
 * 符号适配器测试（NormalizedSymbol → 各源原生格式）
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeSymbol,
  toTencentSymbol,
  toEastmoneySecid,
} from '../../../src/symbols';
import { InvalidArgumentError } from '../../../src/core';

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

  // 特殊指数腾讯无对应标的:fail-fast 而非拼出 shH30533 / hkHSHCI 垃圾查询
  it.each(['H30533', '930955', 'HSHCI', 'GDAXI'])(
    '特殊指数 %s → InvalidArgumentError',
    (input) => {
      expect(() => toTencentSymbol(normalizeSymbol(input))).toThrow(
        InvalidArgumentError
      );
    }
  );

  // 恒生系碰撞码带腾讯码:{market:'HK'} 解析后 → 腾讯行情键(quotes.hk 回归护栏)
  it.each([
    ['HSI', 'hkHSI'],
    ['HSCEI', 'hkHSCEI'],
    ['HSTECH', 'hkHSTECH'],
  ])('恒生系 %s @HK → %s', (input, expected) => {
    expect(toTencentSymbol(normalizeSymbol(input, { market: 'HK' }))).toBe(
      expected
    );
  });

  // 美股指数规范码 → 腾讯行情键（kline.us/quotes.us 一码通用的腾讯侧）
  it.each([
    ['DJI', 'usDJI'],
    ['INX', 'usINX'],
    ['IXIC', 'usIXIC'],
  ])('美股指数 %s @US → %s', (input, expected) => {
    expect(toTencentSymbol(normalizeSymbol(input, { market: 'US' }))).toBe(
      expected
    );
  });

  it('exchange 守卫:被 hint 解成其它市场的碰撞码不得跨市场劫持', () => {
    // 'HSI' + {assetType:'index'} 无 market hint → 解析为 US/index(碰撞门不劫持);
    // 此前 toTencentSymbol 无守卫直接回 hkHSI(恒指),与 toEastmoneySecid 的
    // 105.HSI(美股)对同一对象给出两个市场的数据
    const usIdx = normalizeSymbol('HSI', { assetType: 'index' });
    expect(usIdx.market).toBe('US');
    expect(toTencentSymbol(usIdx)).toBe('usHSI'); // 按声明市场拼,不跨市场回 hkHSI
  });

  it('腾讯键规范形回读闭环:toTencentSymbol(normalize(自身产出)) 恒等', () => {
    for (const [code, hint] of [
      ['HSI', { market: 'HK' }],
      ['HSCEI', { market: 'HK' }],
      ['HSTECH', { market: 'HK' }],
      ['DJI', { market: 'US' }],
      ['INX', { market: 'US' }],
      ['IXIC', { market: 'US' }],
    ] as const) {
      const key = toTencentSymbol(normalizeSymbol(code, hint));
      // 产出形态直接回读(无 hint)必须还原同一个键 —— quotes.* 的静默返空即源于此断裂
      expect(toTencentSymbol(normalizeSymbol(key))).toBe(key);
    }
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
    ['930955', '2.930955'],
    ['932000', '2.932000'],
    ['931071', '2.931071'], // 93xxxx 按码形匹配,不限于枚举过的样本
    ['H30533', '2.H30533'],
    ['H11136', '2.H11136'],
    ['h30533', '2.H30533'], // 大小写不敏感,产出规范大写形
    ['HSHCI', '124.HSHCI'],
    ['GDAXI', '100.GDAXI'],
    ['1.930955', '1.930955'], // 显式 secid 前缀断言不被注册表覆盖
    ['105.GDAXI', '105.GDAXI'],
    ['900901', '1.900901'], // 沪 B(9 开头非 93 段)不受 carve-out 影响
  ])('%s → %s', (input, expected) => {
    expect(toEastmoneySecid(normalizeSymbol(input))).toBe(expected);
  });

  it("assetType:'index' 消歧 hint 不覆盖显式 secid 前缀断言(exchange 一致性门)", () => {
    expect(
      toEastmoneySecid(normalizeSymbol('105.GDAXI', { assetType: 'index' }))
    ).toBe('105.GDAXI');
    expect(
      toEastmoneySecid(normalizeSymbol('1.930955', { assetType: 'index' }))
    ).toBe('1.930955');
  });

  // 现状记录(非契约):沪市 000xxx 指数错宿主(应为 1.000300),待修后更新断言
  it("普通指数 fall-through 现状:'000300'+{assetType:'index'} → '0.000300'(已知错宿主,待修)", () => {
    expect(toEastmoneySecid(normalizeSymbol('000300', { assetType: 'index' }))).toBe(
      '0.000300'
    );
  });

  it('恒生系东财 secid:HSI/HSCEI 走 100. 前缀;HSTECH 东财无码 fail-fast(仅腾讯可用)', () => {
    expect(toEastmoneySecid(normalizeSymbol('HSI', { market: 'HK' }))).toBe('100.HSI');
    expect(toEastmoneySecid(normalizeSymbol('HSCEI', { market: 'HK' }))).toBe(
      '100.HSCEI'
    );
    // 此前 fall-through 拼出 '116.HSTECH' 垃圾 secid(上游 data:null 静默返空),
    // 现与 toTencentSymbol 对 HSHCI 的 fail-fast 镜像一致
    expect(() =>
      toEastmoneySecid(normalizeSymbol('HSTECH', { market: 'HK' }))
    ).toThrow(InvalidArgumentError);
  });

  it('美股指数东财 secid:规范码 DJI/INX/IXIC → 东财码 100.DJIA/100.SPX/100.NDX', () => {
    expect(toEastmoneySecid(normalizeSymbol('DJI', { market: 'US' }))).toBe(
      '100.DJIA'
    );
    expect(toEastmoneySecid(normalizeSymbol('INX', { market: 'US' }))).toBe(
      '100.SPX'
    );
    expect(toEastmoneySecid(normalizeSymbol('IXIC', { market: 'US' }))).toBe(
      '100.NDX'
    );
  });
});

describe('round-trip 稳定性', () => {
  it('腾讯前缀 → normalize → toTencentSymbol 还原', () => {
    for (const s of ['sh600519', 'sz000001', 'hk00700', 'usAAPL']) {
      expect(toTencentSymbol(normalizeSymbol(s))).toBe(s);
    }
  });

  it('特殊指数 secid:产出必可回读(emit → normalize → emit 不动点)', () => {
    for (const bare of ['930955', '932000', '931071', 'H30533', 'HSHCI', 'GDAXI']) {
      const secid = toEastmoneySecid(normalizeSymbol(bare));
      expect(toEastmoneySecid(normalizeSymbol(secid))).toBe(secid);
    }
  });
});
