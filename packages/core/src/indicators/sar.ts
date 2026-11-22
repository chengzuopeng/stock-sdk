/**
 * SAR - Parabolic SAR（抛物线转向指标）
 * 判断趋势反转点和止损位
 */
import type { OHLCV } from './types';

/**
 * SAR 配置选项
 */
export interface SAROptions {
  /** 加速因子初始值，默认 0.02 */
  afStart?: number;
  /** 加速因子增量，默认 0.02 */
  afIncrement?: number;
  /** 加速因子最大值，默认 0.2 */
  afMax?: number;
}

/**
 * SAR 计算结果
 */
export interface SARResult {
  /** SAR 值 */
  sar: number | null;
  /** 当前趋势：1 为上升，-1 为下降 */
  trend: 1 | -1 | null;
  /** 极值点 */
  ep: number | null;
  /** 加速因子 */
  af: number | null;
}

/**
 * 计算 SAR（抛物线转向指标）
 *
 * @description
 * Parabolic SAR 用于确定价格的趋势方向和潜在的反转点：
 * - 当价格在 SAR 之上时，SAR 在价格下方，表示上升趋势
 * - 当价格在 SAR 之下时，SAR 在价格上方，表示下降趋势
 * - SAR 可用作动态止损位
 *
 * @param data K 线数据数组
 * @param options 配置选项
 * @returns SAR 结果数组
 *
 * @example
 * const sar = calcSAR(klines);
 * console.log(sar[20].sar);   // SAR 值
 * console.log(sar[20].trend); // 趋势方向
 */
export function calcSAR(data: OHLCV[], options: SAROptions = {}): SARResult[] {
  const { afStart = 0.02, afIncrement = 0.02, afMax = 0.2 } = options;
  const results: SARResult[] = [];

  if (data.length < 2) {
    return data.map(() => ({ sar: null, trend: null, ep: null, af: null }));
  }

  // R7-7: 跳过前导无效 bar，以首个 high/low 均非 null 的 bar 播种。
  // 此前 `?? 0` 把"数据缺失"当"价格为 0"注入递推：首 bar null、后续价格
  // ~100 时 SAR 从 0 缓慢爬升，反转条件长期无法触发（trend 冻结），
  // 几十到上百根垃圾值以"有效"非 null 输出。播种点前（含播种 bar）输出
  // null，与其它指标的暖机语义一致；干净数据 seed=0，与历史输出 bitwise 一致。
  let seed = 0;
  while (
    seed < data.length &&
    (data[seed].high === null || data[seed].low === null)
  ) {
    seed++;
  }
  if (seed >= data.length - 1) {
    // 全部无效 / 仅剩一根有效：无从建立趋势
    return data.map(() => ({ sar: null, trend: null, ep: null, af: null }));
  }

  // 初始化：假设开始为上升趋势
  let trend: 1 | -1 = 1;
  let af = afStart;
  let ep = data[seed].high!;
  let sar = data[seed].low!;

  // 找到初始趋势（播种 bar 与其后首根的 close 判断，data[0]/data[1] 的一般化）
  const seedBar = data[seed];
  const nextBar = data[seed + 1];
  if (
    seedBar.close !== null &&
    nextBar.close !== null &&
    nextBar.close < seedBar.close
  ) {
    trend = -1;
    ep = seedBar.low!;
    sar = seedBar.high!;
  }

  for (let i = 0; i <= seed; i++) {
    results.push({ sar: null, trend: null, ep: null, af: null });
  }

  for (let i = seed + 1; i < data.length; i++) {
    const current = data[i];
    const prev = data[i - 1];

    if (
      current.high === null ||
      current.low === null ||
      prev.high === null ||
      prev.low === null
    ) {
      results.push({ sar: null, trend: null, ep: null, af: null });
      continue;
    }

    // 计算新的 SAR
    let newSar = sar + af * (ep - sar);

    // 确保 SAR 不会穿过前两根 K 线的极值。
    // R7-7: 回看下界从 0 收紧到 seed —— 不回看播种点之前的 bar：部分 null
    // 的前导 bar（如 {high:3.2, low:null} 半解析行）非 null 一侧会经此处
    // 泄漏进 clamp，使结果偏离"裁掉前导无效 bar 后重算"的等价语义。
    // 干净数据 seed=0，表达式与历史逐位相同。
    if (trend === 1) {
      newSar = Math.min(newSar, prev.low, data[Math.max(seed, i - 2)]?.low ?? prev.low);
      if (current.low < newSar) {
        // 反转为下降趋势
        trend = -1;
        newSar = ep;
        ep = current.low;
        af = afStart;
      } else {
        // 更新 EP
        if (current.high > ep) {
          ep = current.high;
          af = Math.min(af + afIncrement, afMax);
        }
      }
    } else {
      newSar = Math.max(newSar, prev.high, data[Math.max(seed, i - 2)]?.high ?? prev.high);
      if (current.high > newSar) {
        // 反转为上升趋势
        trend = 1;
        newSar = ep;
        ep = current.high;
        af = afStart;
      } else {
        // 更新 EP
        if (current.low < ep) {
          ep = current.low;
          af = Math.min(af + afIncrement, afMax);
        }
      }
    }

    sar = newSar;
    results.push({ sar, trend, ep, af });
  }

  return results;
}
