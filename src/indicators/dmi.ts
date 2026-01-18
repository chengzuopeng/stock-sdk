/**
 * DMI/ADX - Directional Movement Index（趋向指标）
 * 判断趋势的方向和强度
 */
import type { OHLCV } from './types';

/**
 * DMI 配置选项
 */
export interface DMIOptions {
  /** 周期，默认 14 */
  period?: number;
  /** ADX 平滑周期，默认与 period 相同 */
  adxPeriod?: number;
}

/**
 * DMI 计算结果
 */
export interface DMIResult {
  /** +DI 值 */
  pdi: number | null;
  /** -DI 值 */
  mdi: number | null;
  /** ADX 值（趋势强度） */
  adx: number | null;
  /** ADXR 值（ADX 的平均） */
  adxr: number | null;
}

/**
 * 计算 DMI/ADX（趋向指标）
 *
 * @description
 * DMI 包含三个指标：
 * - +DI：上升方向指标
 * - -DI：下降方向指标
 * - ADX：平均趋向指数，衡量趋势强度
 *
 * 信号解读：
 * - +DI > -DI：上升趋势
 * - -DI > +DI：下降趋势
 * - ADX > 25：趋势明显
 * - ADX < 20：横盘整理
 *
 * @param data K 线数据数组
 * @param options 配置选项
 * @returns DMI 结果数组
 *
 * @example
 * const dmi = calcDMI(klines, { period: 14 });
 * console.log(dmi[20].pdi);  // +DI
 * console.log(dmi[20].mdi);  // -DI
 * console.log(dmi[20].adx);  // ADX
 */
export function calcDMI(data: OHLCV[], options: DMIOptions = {}): DMIResult[] {
  const { period = 14, adxPeriod = period } = options;
  const results: DMIResult[] = [];

  if (data.length < 2) {
    return data.map(() => ({ pdi: null, mdi: null, adx: null, adxr: null }));
  }

  // 计算 +DM, -DM, TR
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      plusDM.push(0);
      minusDM.push(0);
      tr.push(0);
      results.push({ pdi: null, mdi: null, adx: null, adxr: null });
      continue;
    }

    const current = data[i];
    const prev = data[i - 1];

    if (
      current.high === null ||
      current.low === null ||
      current.close === null ||
      prev.high === null ||
      prev.low === null ||
      prev.close === null
    ) {
      plusDM.push(0);
      minusDM.push(0);
      tr.push(0);
      results.push({ pdi: null, mdi: null, adx: null, adxr: null });
      continue;
    }

    // 计算 True Range
    const hl = current.high - current.low;
    const hc = Math.abs(current.high - prev.close);
    const lc = Math.abs(current.low - prev.close);
    tr.push(Math.max(hl, hc, lc));

    // 计算 +DM 和 -DM
    const upMove = current.high - prev.high;
    const downMove = prev.low - current.low;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }

    results.push({ pdi: null, mdi: null, adx: null, adxr: null });
  }

  // 计算平滑后的 +DM, -DM, TR 和 +DI, -DI
  let smoothTR = 0;
  let smoothPlusDM = 0;
  let smoothMinusDM = 0;
  const dx: number[] = [];

  for (let i = 1; i < data.length; i++) {
    if (i < period) {
      smoothTR += tr[i];
      smoothPlusDM += plusDM[i];
      smoothMinusDM += minusDM[i];
      dx.push(0);
      continue;
    }

    if (i === period) {
      // 初始化
      smoothTR = smoothTR;
      smoothPlusDM = smoothPlusDM;
      smoothMinusDM = smoothMinusDM;
    } else {
      // Wilder 平滑
      smoothTR = smoothTR - smoothTR / period + tr[i];
      smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
      smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    }

    const pdi = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const mdi = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

    results[i].pdi = pdi;
    results[i].mdi = mdi;

    // 计算 DX
    const diSum = pdi + mdi;
    const dxValue = diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0;
    dx.push(dxValue);
  }

  // 计算 ADX (DX 的平滑移动平均)
  let adxSum = 0;
  let adxCount = 0;
  let prevAdx = 0;

  for (let i = period; i < data.length; i++) {
    if (i < period * 2 - 1) {
      adxSum += dx[i - period + 1] || 0;
      adxCount++;
      continue;
    }

    if (i === period * 2 - 1) {
      // 初始 ADX 使用简单平均
      adxSum += dx[i - period + 1] || 0;
      prevAdx = adxSum / adxPeriod;
      results[i].adx = prevAdx;
    } else {
      // Wilder 平滑
      const currentDx = dx[i - period + 1] || 0;
      prevAdx = (prevAdx * (adxPeriod - 1) + currentDx) / adxPeriod;
      results[i].adx = prevAdx;
    }
  }

  // 计算 ADXR
  for (let i = period * 2 - 1 + adxPeriod; i < data.length; i++) {
    const currentAdx = results[i].adx;
    const prevAdxValue = results[i - adxPeriod]?.adx;
    if (currentAdx !== null && prevAdxValue !== null) {
      results[i].adxr = (currentAdx + prevAdxValue) / 2;
    }
  }

  return results;
}
