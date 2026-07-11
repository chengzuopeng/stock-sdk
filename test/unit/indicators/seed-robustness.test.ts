/**
 * R7-6/R7-7 脏数据播种回归：
 * - ATR：暖机期一根 null bar 此前让整条序列永远 null（一次性播种放弃）；
 *   现在窗口滑过脏点后恢复播种，calcKC 连带恢复。
 * - SAR：首根 null bar 此前以 `?? 0` 假价播种（长段非 null 垃圾、trend 冻结）；
 *   现在跳过前导无效 bar，输出与"裁掉前导后重算"逐位等价 ——
 *   含【部分 null】前导 bar（clamp 回看下界收紧到 seed 的专项回归）。
 */
import { describe, it, expect } from 'vitest';
import { calcATR } from '../../../src/indicators/atr';
import { calcSAR } from '../../../src/indicators/sar';
import { calcKC } from '../../../src/indicators/kc';
import type { OHLCV } from '../../../src/indicators/types';

function bar(base: number): OHLCV {
  return { open: base, high: base + 2, low: base - 2, close: base + 1, volume: 1000 };
}

function nullBar(): OHLCV {
  return { open: null, high: null, low: null, close: null, volume: null };
}

function series(n: number, start = 100): OHLCV[] {
  return Array.from({ length: n }, (_, i) => bar(start + Math.sin(i / 3) * 10));
}

describe('R7-6 ATR 暖机脏数据恢复', () => {
  it('暖机期一根 null bar：窗口滑过脏点后恢复播种（此前整条序列永远 null）', () => {
    const data = series(40);
    data[5] = nullBar();
    const result = calcATR(data, { period: 14 });

    // tr[5] = null → 窗口 [i-13..i] 含下标 5 时不可播种
    for (let i = 13; i <= 18; i++) {
      expect(result[i].atr, `i=${i} 窗口仍含脏点`).toBeNull();
    }
    // i=19 起窗口 [6..19] 全非 null → 播种恢复
    expect(result[19].atr).not.toBeNull();
    expect(result[39].atr).not.toBeNull();
  });

  it('播种后的 null bar 维持既有 hold 语义（本轮不改）', () => {
    const data = series(40);
    data[20] = nullBar();
    const result = calcATR(data, { period: 14 });
    expect(result[20].atr).toBe(result[19].atr);
    expect(result[21].atr).not.toBeNull();
  });

  it('calcKC 随 ATR 恢复（此前连带全灭）', () => {
    const data = series(60);
    data[5] = nullBar();
    const kc = calcKC(data);
    expect(kc[59].upper).not.toBeNull();
    expect(kc[59].lower).not.toBeNull();
  });

  it('全 null 序列仍全 null（不误播种）', () => {
    const data = Array.from({ length: 30 }, nullBar);
    const result = calcATR(data, { period: 14 });
    expect(result.every((r) => r.atr === null)).toBe(true);
  });
});

describe('R7-7 SAR 前导无效 bar 播种', () => {
  function expectTrimEquivalence(data: OHLCV[], seed: number) {
    const full = calcSAR(data);
    const trimmed = calcSAR(data.slice(seed));
    // 播种点前全 null
    for (let i = 0; i < seed; i++) {
      expect(full[i]).toEqual({ sar: null, trend: null, ep: null, af: null });
    }
    // 播种点起与"裁掉前导后重算"逐位等价
    expect(full.slice(seed)).toEqual(trimmed);
  }

  it('首根全 null：不再以 0 价播种（此前 SAR 从 0 爬升、trend 冻结）', () => {
    const data = [nullBar(), ...series(60)];
    expectTrimEquivalence(data, 1);
    // 修复前形态回归：SAR 值不应远低于价格区间
    const full = calcSAR(data);
    expect(full[10].sar).not.toBeNull();
    expect(full[10].sar!).toBeGreaterThan(50);
  });

  it('前 3 根全 null 同样等价', () => {
    const data = [nullBar(), nullBar(), nullBar(), ...series(60)];
    expectTrimEquivalence(data, 3);
  });

  it('部分 null 前导 bar（half-parsed 行）：残留一侧不再经 clamp 泄漏', () => {
    // {high:3.2, low:null} 会被播种扫描跳过，但绝对下标回看（修复前
    // Math.max(0, i-2)）会让 high=3.2 参与 trend=-1 的 clamp
    const partial: OHLCV = { open: null, high: 3.2, low: null, close: null, volume: null };
    // 用下跌开局的序列诱发 trend=-1 路径
    const down = Array.from({ length: 60 }, (_, i) => bar(150 - i));
    const data = [partial, ...down];
    expectTrimEquivalence(data, 1);
  });

  it('全 null / 仅剩一根有效：全 null 输出', () => {
    expect(calcSAR([nullBar(), nullBar(), nullBar()])).toEqual([
      { sar: null, trend: null, ep: null, af: null },
      { sar: null, trend: null, ep: null, af: null },
      { sar: null, trend: null, ep: null, af: null },
    ]);
    const onlyLast = [nullBar(), nullBar(), bar(100)];
    expect(calcSAR(onlyLast).every((r) => r.sar === null)).toBe(true);
  });
});
