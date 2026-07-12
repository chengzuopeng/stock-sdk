/**
 * F36 rolling 重写对拍测试
 *
 * 把改写前的「逐窗重算」实现以本地副本(ref*)形式固化在本文件作 reference，
 * 用确定性伪随机序列(线性同余、固定种子,含 null 间隙/平段/剧烈波动)
 * 与真实形态序列,断言新实现(滑窗 rolling / 单调队列)与旧实现逐值全等：
 * - sma/ema/wma/boll/cci/kdj/atr 输出本身已 round(·,3)，直接 toEqual；
 * - obv.obvMa / roc.signal 旧实现不舍入(裸浮点)，对拍前两侧统一 round(·,3)
 *   (rolling 与逐窗的求和顺序不同，裸浮点允许 ~1ulp 差异，round 后须全等)。
 *
 * 数据域说明：序列用**全精度浮点**价格(不量化到 2 位小数)。若把价格量化成
 * 2 位小数，窗口均值会大量**恰好**落在 x.xxx5 舍入半步上 —— 这类刀尖值的舍入
 * 方向在旧实现里本身就由求和顺序的 ±1ulp 残差决定(同一窗口换个加法次序也
 * 会翻)，不构成可对拍的行为契约；全精度输入下 .005 边界是零测度，
 * 1ulp 级差异不可能翻转舍入,对拍即为逐值位级契约。详见 ma.ts
 * SlidingWindowSum 注释的「已知边界」。
 *
 * EMA/WMA/ATR/CCI 本轮未改动(EMA 本就 O(n) 递推、WMA 权重位置相关、ATR 扫窗
 * 仅一次性种子、CCI 的 md===0 平段判定依赖逐窗求和的精确相消,见 cci.ts 注释)，
 * 仍纳入对拍作为行为锚，防后续改动悄悄破坏契约。
 */
import { describe, it, expect } from 'vitest';
import {
  calcSMA,
  calcEMA,
  calcWMA,
  calcMA,
  calcBOLL,
  calcCCI,
  calcKDJ,
  calcOBV,
  calcROC,
  calcATR,
} from '../../../src/indicators';
import type {
  OHLCV,
  MAResult,
  BOLLResult,
  CCIResult,
  KDJResult,
  ATRResult,
} from '../../../src/indicators';
import type { OBVResult } from '../../../src/indicators/obv';
import type { ROCResult } from '../../../src/indicators/roc';

// ============================================================
// reference：改写前(commit e8d7f3b 一代)的逐窗实现，原样拷贝
// ============================================================

function round(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function refCalcSMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] !== null) {
        sum += data[j]!;
        count++;
      }
    }
    result.push(count === period ? round(sum / period) : null);
  }
  return result;
}

function refCalcEMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const alpha = 2 / (period + 1);
  let ema: number | null = null;
  let initialized = false;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    if (!initialized) {
      let sum = 0;
      let count = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (data[j] !== null) {
          sum += data[j]!;
          count++;
        }
      }
      if (count === period) {
        ema = sum / period;
        initialized = true;
      }
      result.push(ema !== null ? round(ema) : null);
      continue;
    }
    const value = data[i];
    if (value === null) {
      result.push(ema !== null ? round(ema) : null);
    } else {
      ema = alpha * value + (1 - alpha) * ema!;
      result.push(round(ema));
    }
  }
  return result;
}

function refCalcWMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const weights = Array.from({ length: period }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    let valid = true;
    for (let j = 0; j < period; j++) {
      const value = data[i - period + 1 + j];
      if (value === null) {
        valid = false;
        break;
      }
      sum += value * weights[j];
    }
    result.push(valid ? round(sum / weightSum) : null);
  }
  return result;
}

function refCalcStdDev(
  data: (number | null)[],
  period: number,
  ma: (number | null)[]
): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || ma[i] === null) {
      result.push(null);
      continue;
    }
    let sumSquares = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] !== null && ma[i] !== null) {
        sumSquares += Math.pow(data[j]! - ma[i]!, 2);
        count++;
      }
    }
    result.push(count === period ? Math.sqrt(sumSquares / period) : null);
  }
  return result;
}

function refCalcBOLL(
  closes: (number | null)[],
  options: { period?: number; stdDev?: number } = {}
): BOLLResult[] {
  const { period = 20, stdDev = 2 } = options;
  const mid = refCalcSMA(closes, period);
  const std = refCalcStdDev(closes, period, mid);
  return closes.map((_, i) => {
    if (mid[i] === null || std[i] === null) {
      return { mid: null, upper: null, lower: null, bandwidth: null };
    }
    const upper = mid[i]! + stdDev * std[i]!;
    const lower = mid[i]! - stdDev * std[i]!;
    const bandwidth =
      mid[i]! !== 0 ? round(((upper - lower) / mid[i]!) * 100) : null;
    return { mid: mid[i], upper: round(upper), lower: round(lower), bandwidth };
  });
}

function refCalcCCI(data: OHLCV[], options: { period?: number } = {}): CCIResult[] {
  const { period = 14 } = options;
  const result: CCIResult[] = [];
  const tp: (number | null)[] = data.map((d) => {
    if (d.high === null || d.low === null || d.close === null) {
      return null;
    }
    return (d.high + d.low + d.close) / 3;
  });
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ cci: null });
      continue;
    }
    let sum = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (tp[j] !== null) {
        sum += tp[j]!;
        count++;
      }
    }
    if (count !== period || tp[i] === null) {
      result.push({ cci: null });
      continue;
    }
    const ma = sum / period;
    let mdSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      mdSum += Math.abs(tp[j]! - ma);
    }
    const md = mdSum / period;
    if (md === 0) {
      result.push({ cci: 0 });
    } else {
      const cci = (tp[i]! - ma) / (0.015 * md);
      result.push({ cci: round(cci) });
    }
  }
  return result;
}

function refCalcKDJ(
  data: OHLCV[],
  options: { period?: number; kPeriod?: number; dPeriod?: number } = {}
): KDJResult[] {
  const { period = 9, kPeriod = 3, dPeriod = 3 } = options;
  const result: KDJResult[] = [];
  let k = 50;
  let d = 50;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ k: null, d: null, j: null });
      continue;
    }
    let highN = -Infinity;
    let lowN = Infinity;
    let hasValidData = true;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high === null || data[j].low === null) {
        hasValidData = false;
        break;
      }
      highN = Math.max(highN, data[j].high!);
      lowN = Math.min(lowN, data[j].low!);
    }
    const close = data[i].close;
    if (!hasValidData || close === null || highN === lowN) {
      result.push({ k: null, d: null, j: null });
      continue;
    }
    const rsv = ((close - lowN) / (highN - lowN)) * 100;
    k = ((kPeriod - 1) / kPeriod) * k + (1 / kPeriod) * rsv;
    d = ((dPeriod - 1) / dPeriod) * d + (1 / dPeriod) * k;
    const j = 3 * k - 2 * d;
    result.push({ k: round(k), d: round(d), j: round(j) });
  }
  return result;
}

function refCalcOBV(data: OHLCV[], options: { maPeriod?: number } = {}): OBVResult[] {
  const { maPeriod } = options;
  const results: OBVResult[] = [];
  if (data.length === 0) {
    return results;
  }
  let obvValue = data[0].volume ?? 0;
  results.push({ obv: obvValue, obvMa: null });
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];
    if (
      current.close === null ||
      prev.close === null ||
      current.volume === null ||
      current.volume === undefined
    ) {
      results.push({ obv: null, obvMa: null });
      continue;
    }
    if (current.close > prev.close) {
      obvValue += current.volume;
    } else if (current.close < prev.close) {
      obvValue -= current.volume;
    }
    results.push({ obv: obvValue, obvMa: null });
  }
  if (maPeriod && maPeriod > 0) {
    for (let i = maPeriod - 1; i < results.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - maPeriod + 1; j <= i; j++) {
        if (results[j].obv !== null) {
          sum += results[j].obv!;
          count++;
        }
      }
      if (count === maPeriod) {
        results[i].obvMa = sum / maPeriod;
      }
    }
  }
  return results;
}

function refCalcROC(
  data: OHLCV[],
  options: { period?: number; signalPeriod?: number } = {}
): ROCResult[] {
  const { period = 12, signalPeriod } = options;
  const results: ROCResult[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      results.push({ roc: null, signal: null });
      continue;
    }
    const current = data[i].close;
    const previous = data[i - period].close;
    if (current === null || previous === null || previous === 0) {
      results.push({ roc: null, signal: null });
      continue;
    }
    const roc = ((current - previous) / previous) * 100;
    results.push({ roc, signal: null });
  }
  if (signalPeriod && signalPeriod > 0) {
    for (let i = period + signalPeriod - 1; i < results.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - signalPeriod + 1; j <= i; j++) {
        if (results[j].roc !== null) {
          sum += results[j].roc!;
          count++;
        }
      }
      if (count === signalPeriod) {
        results[i].signal = sum / signalPeriod;
      }
    }
  }
  return results;
}

function refCalcATR(data: OHLCV[], options: { period?: number } = {}): ATRResult[] {
  const { period = 14 } = options;
  const result: ATRResult[] = [];
  const tr: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    const { high, low, close } = data[i];
    if (high === null || low === null || close === null) {
      tr.push(null);
      continue;
    }
    if (i === 0) {
      tr.push(high - low);
    } else {
      const prevClose = data[i - 1].close;
      if (prevClose === null) {
        tr.push(high - low);
      } else {
        const hl = high - low;
        const hpc = Math.abs(high - prevClose);
        const lpc = Math.abs(low - prevClose);
        tr.push(Math.max(hl, hpc, lpc));
      }
    }
  }
  // R7-6 同步：与 calcATR 的滑窗重试播种语义一致（未播种即逐窗扫描，
  // 全非 null 时简单平均播种），保持独立实现继续对拍
  let atr: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ tr: tr[i] !== null ? round(tr[i]!) : null, atr: null });
      continue;
    }
    if (atr === null) {
      let sum = 0;
      let count = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (tr[j] !== null) {
          sum += tr[j]!;
          count++;
        }
      }
      if (count === period) {
        atr = sum / period;
      }
    } else if (tr[i] !== null) {
      atr = (atr * (period - 1) + tr[i]!) / period;
    }
    result.push({
      tr: tr[i] !== null ? round(tr[i]!) : null,
      atr: atr !== null ? round(atr) : null,
    });
  }
  return result;
}

// ============================================================
// 确定性测试数据
// ============================================================

/** 线性同余伪随机(固定种子,跨平台/跨运行确定) */
function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 随机游走收盘序列：含 null 间隙、平段、±20% 跳空(全精度浮点,见文件头) */
function buildCloseSeries(n: number, seed: number): (number | null)[] {
  const rnd = makeLcg(seed);
  const out: (number | null)[] = [];
  let price = 100;
  while (out.length < n) {
    const dice = rnd();
    if (dice < 0.04) {
      // null 间隙：1~8 根连续缺数据
      const gap = 1 + Math.floor(rnd() * 8);
      for (let g = 0; g < gap && out.length < n; g++) out.push(null);
      continue;
    }
    if (dice < 0.1) {
      // 平段：8~40 根横盘(触发方差≈0 / 窗口最值并列 / CCI md=0 等边界)
      const flat = price;
      const len = 8 + Math.floor(rnd() * 33);
      for (let f = 0; f < len && out.length < n; f++) out.push(flat);
      continue;
    }
    if (dice < 0.13) {
      // 剧烈波动：±20%/+25% 跳空
      price = price * (rnd() < 0.5 ? 0.8 : 1.25);
    }
    price = Math.max(1, price * (1 + (rnd() - 0.5) * 0.06));
    out.push(price);
  }
  return out;
}

/** 真实形态序列：趋势 + 双周期波动 + 周期性回调,无 null */
function buildTrendSeries(n: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const trend = 50 + i * 0.03;
    const wave = 8 * Math.sin(i / 23) + 3 * Math.sin(i / 7 + 1.3);
    const pullback = i % 211 < 30 ? -6 : 0;
    out.push(trend + wave + pullback);
  }
  return out;
}

/** 由收盘序列派生 OHLCV(确定性 spread；null 位轮换缺 high/low/close/volume) */
function buildOhlcv(closes: (number | null)[], seed: number): OHLCV[] {
  const rnd = makeLcg(seed);
  return closes.map((close, idx) => {
    if (close === null) {
      const base = 100 + (idx % 7);
      switch (idx % 4) {
        case 0:
          return { open: null, high: null, low: null, close: null, volume: null };
        case 1:
          return { open: base, high: null, low: base - 1, close: base, volume: 1000 };
        case 2:
          return { open: base, high: base + 1, low: null, close: base, volume: 1000 };
        default:
          return { open: base, high: base + 1, low: base - 1, close: null, volume: null };
      }
    }
    // 6% 概率零振幅(触发 KDJ highN===lowN);2% 概率 volume 缺失(OBV null 分支)
    const spread = rnd() < 0.06 ? 0 : close * 0.02 * rnd();
    const volume = rnd() < 0.02 ? null : 1000 + Math.floor(rnd() * 99000);
    return {
      open: close,
      high: close + spread,
      low: close - spread,
      close,
      volume,
    };
  });
}

const closesA = buildCloseSeries(2600, 42); // 长度 ≥ 2000,含 null/平段/跳空
const closesB = buildTrendSeries(2200); // 真实形态,无 null
const closeSets = [closesA, closesB];
const ohlcvA = buildOhlcv(closesA, 0x9e3779b9);
const ohlcvB = buildOhlcv(closesB, 7);
const ohlcvSets = [ohlcvA, ohlcvB];

/**
 * 对裸浮点输出(obvMa/roc/signal)统一 round(·,3) 后再比对。
 * -0 归一为 0：平段上 roc 全为精确 0，逐窗求和得 +0,而 rolling 出窗残差可能是
 * -1e-16 → round 后 -0;数值差 1e-16 无语义,但 toEqual 区分 ±0。
 */
function norm<T>(value: T): T {
  if (typeof value === 'number') {
    const r = round(value);
    return (r === 0 ? 0 : r) as T;
  }
  if (Array.isArray(value)) return value.map(norm) as unknown as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = norm(v);
    return out as T;
  }
  return value;
}

// ============================================================
// 对拍
// ============================================================

describe('F36 rolling-parity：新实现 vs 旧逐窗实现逐值全等', () => {
  it('calcSMA(滑窗 rolling)多周期对拍', () => {
    for (const series of closeSets) {
      for (const period of [1, 2, 5, 10, 20, 30, 60, 120, 250]) {
        expect(calcSMA(series, period)).toEqual(refCalcSMA(series, period));
      }
    }
  });

  it('calcEMA / calcWMA(本轮未改动)对拍锚', () => {
    for (const series of closeSets) {
      for (const period of [5, 12, 26, 60]) {
        expect(calcEMA(series, period)).toEqual(refCalcEMA(series, period));
        expect(calcWMA(series, period)).toEqual(refCalcWMA(series, period));
      }
    }
  });

  it('calcMA 组合(默认周期 × sma/ema/wma)对拍', () => {
    const refCalcMAResult = (
      closes: (number | null)[],
      periods: number[],
      calcFn: (d: (number | null)[], p: number) => (number | null)[]
    ): MAResult[] => {
      const maArrays: { [key: string]: (number | null)[] } = {};
      for (const period of periods) maArrays[`ma${period}`] = calcFn(closes, period);
      return closes.map((_, i) => {
        const r: MAResult = {};
        for (const period of periods) r[`ma${period}`] = maArrays[`ma${period}`][i];
        return r;
      });
    };
    const defaults = [5, 10, 20, 30, 60, 120, 250];
    for (const series of closeSets) {
      expect(calcMA(series)).toEqual(refCalcMAResult(series, defaults, refCalcSMA));
      expect(calcMA(series, { periods: [5, 20], type: 'ema' })).toEqual(
        refCalcMAResult(series, [5, 20], refCalcEMA)
      );
      expect(calcMA(series, { periods: [5, 20], type: 'wma' })).toEqual(
        refCalcMAResult(series, [5, 20], refCalcWMA)
      );
    }
  });

  it('calcBOLL(rolling Σx/Σx² + 恒等式还原)对拍', () => {
    for (const series of closeSets) {
      for (const opts of [
        { period: 20, stdDev: 2 },
        { period: 5, stdDev: 3 },
        { period: 60, stdDev: 2 },
      ]) {
        expect(calcBOLL(series, opts)).toEqual(refCalcBOLL(series, opts));
      }
    }
  });

  it('calcCCI(本轮未改动,md===0 平段判定依赖逐窗精确相消)对拍锚', () => {
    for (const data of ohlcvSets) {
      for (const period of [5, 14, 30]) {
        expect(calcCCI(data, { period })).toEqual(refCalcCCI(data, { period }));
      }
    }
  });

  it('calcKDJ(单调队列滑动最值)对拍', () => {
    for (const data of ohlcvSets) {
      for (const opts of [
        { period: 9, kPeriod: 3, dPeriod: 3 },
        { period: 5, kPeriod: 2, dPeriod: 4 },
        { period: 19 },
      ]) {
        expect(calcKDJ(data, opts)).toEqual(refCalcKDJ(data, opts));
      }
    }
  });

  it('calcOBV(信号线 rolling;obvMa 裸浮点 round 后对拍)', () => {
    for (const data of ohlcvSets) {
      for (const opts of [{}, { maPeriod: 10 }, { maPeriod: 30 }]) {
        expect(norm(calcOBV(data, opts))).toEqual(norm(refCalcOBV(data, opts)));
      }
    }
  });

  it('calcROC(信号线 rolling;signal 裸浮点 round 后对拍)', () => {
    for (const data of ohlcvSets) {
      for (const opts of [
        { period: 12, signalPeriod: 6 },
        { period: 5, signalPeriod: 3 },
        { period: 12 },
      ]) {
        expect(norm(calcROC(data, opts))).toEqual(norm(refCalcROC(data, opts)));
      }
    }
  });

  it('calcATR(R7-6 滑窗重试播种)对拍锚', () => {
    for (const data of ohlcvSets) {
      for (const period of [5, 14]) {
        expect(calcATR(data, { period })).toEqual(refCalcATR(data, { period }));
      }
    }
  });

  it('边界：空数组 / 短于周期 / 全 null / period 1', () => {
    const empty: (number | null)[] = [];
    const short: (number | null)[] = [1.23, 4.56];
    const allNull: (number | null)[] = new Array<number | null>(50).fill(null);
    for (const series of [empty, short, allNull]) {
      expect(calcSMA(series, 5)).toEqual(refCalcSMA(series, 5));
      expect(calcBOLL(series, { period: 5 })).toEqual(refCalcBOLL(series, { period: 5 }));
    }
    expect(calcSMA(closesA, 1)).toEqual(refCalcSMA(closesA, 1));
    const shortOhlcv = ohlcvA.slice(0, 3);
    expect(calcKDJ(shortOhlcv, { period: 9 })).toEqual(refCalcKDJ(shortOhlcv, { period: 9 }));
    expect(calcCCI(shortOhlcv, { period: 14 })).toEqual(refCalcCCI(shortOhlcv, { period: 14 }));
    expect(norm(calcOBV([], { maPeriod: 5 }))).toEqual(norm(refCalcOBV([], { maPeriod: 5 })));
  });

  it('契约外 NaN 污染：在窗输出与旧实现同为 NaN,离窗后同样恢复(refill 兜底)', () => {
    const series: (number | null)[] = [];
    for (let i = 0; i < 60; i++) series.push(100 + Math.sin(i) * 5);
    series[20] = NaN;
    expect(calcSMA(series, 7)).toEqual(refCalcSMA(series, 7));
    expect(calcBOLL(series, { period: 7 })).toEqual(refCalcBOLL(series, { period: 7 }));
    // 离窗后确实恢复出值(不被永久污染)
    expect(calcSMA(series, 7)[40]).not.toBeNaN();
    expect(calcSMA(series, 7)[40]).not.toBeNull();
  });

  it('null 间隙跨窗：恢复段的窗口重新出值且与旧实现一致', () => {
    // 构造明确的 null 间隙：10 个值 + 3 个 null + 10 个值
    const series: (number | null)[] = [
      10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 11.0,
      null, null, null,
      11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 12.0,
    ];
    const got = calcSMA(series, 5);
    expect(got).toEqual(refCalcSMA(series, 5));
    // 间隙内与其后 4 根(窗口仍含 null)为 null,第 17 根(index)起恢复出值
    expect(got[10]).toBeNull();
    expect(got[16]).toBeNull();
    expect(got[17]).not.toBeNull();
    expect(got[17]).toBe(round((11.1 + 11.2 + 11.3 + 11.4 + 11.5) / 5));
  });
});
