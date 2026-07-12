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

  it('恒生系东财 secid:HSI/HSCEI 走 100. 前缀;HSTECH 东财无码回退 116.(仅腾讯可用)', () => {
    expect(toEastmoneySecid(normalizeSymbol('HSI', { market: 'HK' }))).toBe('100.HSI');
    expect(toEastmoneySecid(normalizeSymbol('HSCEI', { market: 'HK' }))).toBe(
      '100.HSCEI'
    );
    expect(toEastmoneySecid(normalizeSymbol('HSTECH', { market: 'HK' }))).toBe(
      '116.HSTECH'
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
