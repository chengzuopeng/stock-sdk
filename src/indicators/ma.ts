import { MAOptions, MAResult } from './types';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * F36: 滑动窗口累计器（进窗加、出窗减），把逐 bar 重扫整窗的 O(n×period)
 * 求和降为 O(n)。供本文件 calcSMA 及 boll/obv/roc 的同款窗口求和复用
 * （cci 评估后不接入，原因见 cci.ts 注释）。
 *
 * 语义与「逐窗重算」完全对齐：
 * - null 不入和、不计数；调用方用 `nonNullCount === period` 判断窗口是否完整
 *   （即窗口内任一 null → 不出值），与旧实现一致。
 * - 浮点一致性：rolling 累减的求和顺序与逐窗重算不同，会引入不同的浮点误差。
 *   这里用 Kahan 补偿求和把累计误差压到 ~1ulp 量级（与逐窗重算同档），
 *   round(·, 2) 后的输出由 rolling-parity 对拍测试保证与旧实现逐值全等。
 *   已知边界：当输入是十进制定点值（如 2 位小数报价）且窗口均值**恰好**落在
 *   半分位（x.xx5）上时，舍入方向由 ±1ulp 残差决定 —— 这类刀尖值在旧实现里
 *   本身就取决于求和顺序（同一窗口换个加法次序也会翻），不存在数学上的
 *   "正确方向"；rolling 在这些点可能与旧实现差 ±0.01，其余位置逐值全等。
 * - 非有限值兜底：契约内输入是 (number | null)，但若混入 NaN/Infinity，
 *   朴素 rolling 会被永久污染（NaN 出窗后 sum 仍为 NaN）；检测到非有限 sum
 *   时按当前窗口逐项重算，行为退化回旧实现（含非有限值的窗口输出同款
 *   NaN/Infinity，离窗后恢复）。
 *
 * 用法约束：`advance(i)` 必须按 i = 0,1,2,... 顺序调用。
 */
export class SlidingWindowSum {
  private readonly data: ArrayLike<number | null>;
  private readonly period: number;
  private sum = 0;
  private comp = 0; // Kahan 补偿项
  private count = 0; // 窗口内非 null 计数

  constructor(data: ArrayLike<number | null>, period: number) {
    this.data = data;
    this.period = period;
  }

  /** 把窗口推进到以 i 结尾（覆盖 data[i-period+1 .. i]，左端裁剪到 0）。 */
  advance(i: number): void {
    const incoming = this.data[i];
    if (incoming !== null) {
      this.add(incoming);
      this.count++;
    }
    if (i >= this.period) {
      const outgoing = this.data[i - this.period];
      if (outgoing !== null) {
        this.add(-outgoing);
        this.count--;
      }
    }
    if (!Number.isFinite(this.sum)) {
      this.refill(i);
    }
  }

  /** 当前窗口非 null 值之和。 */
  get value(): number {
    return this.sum;
  }

  /** 当前窗口非 null 值个数。 */
  get nonNullCount(): number {
    return this.count;
  }

  private add(v: number): void {
    const y = v - this.comp;
    const t = this.sum + y;
    this.comp = t - this.sum - y;
    this.sum = t;
  }

  private refill(i: number): void {
    this.sum = 0;
    this.comp = 0;
    const start = Math.max(0, i - this.period + 1);
    // 升序逐项重算，与旧逐窗实现同序 —— 窗口内仍含非有限值时输出也逐位一致
    for (let j = start; j <= i; j++) {
      const v = this.data[j];
      if (v !== null) this.add(v);
    }
  }
}

/**
 * 计算简单移动平均线 SMA
 *
 * F36: 旧实现逐 bar 重扫整窗（O(n×period)，默认 7 周期 × 3000 bar ≈ 150 万次
 * 内循环），改为 SlidingWindowSum 滑窗累计（O(n)）。null 语义（窗口内任一
 * null → 该位输出 null）与 round(·, 2) 舍入保持不变。
 */
export function calcSMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array<number | null>(data.length);
  const win = new SlidingWindowSum(data, period);

  for (let i = 0; i < data.length; i++) {
    win.advance(i);
    result[i] =
      i >= period - 1 && win.nonNullCount === period
        ? round(win.value / period)
        : null;
  }

  return result;
}

/**
 * 计算指数移动平均线 EMA
 * 使用前 N 天的 SMA 作为 EMA 初始值，避免首日偏差
 *
 * F36: 不改 —— EMA 本身是 O(n) 递推，仅种子 SMA 做一次性扫窗；
 * 改写无收益且会扰动浮点结果。
 */
export function calcEMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const alpha = 2 / (period + 1);
  let ema: number | null = null;
  let initialized = false;

  for (let i = 0; i < data.length; i++) {
    // 前 period-1 天数据不足，返回 null
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    // 第 period 天：用 SMA 初始化 EMA
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

    // 后续使用 EMA 公式递推
    const value = data[i];
    if (value === null) {
      result.push(ema !== null ? round(ema) : null); // 遇到空值，保持上一个 EMA
    } else {
      ema = alpha * value + (1 - alpha) * ema!;
      result.push(round(ema));
    }
  }

  return result;
}

/**
 * 计算加权移动平均线 WMA
 *
 * F36: 不改 —— 权重随窗口内位置变化，rolling 化需要额外维护两条累计
 * （Σx 与 Σw·x）且浮点误差放大，收益与正确性风险不成比例，保持逐窗实现。
 */
export function calcWMA(data: (number | null)[], period: number): (number | null)[] {
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

/**
 * 批量计算均线
 */
export function calcMA(
  closes: (number | null)[],
  options: MAOptions = {}
): MAResult[] {
  const { periods = [5, 10, 20, 30, 60, 120, 250], type = 'sma' } = options;

  const calcFn = type === 'ema' ? calcEMA : type === 'wma' ? calcWMA : calcSMA;

  // 计算各周期均线
  const maArrays: { [key: string]: (number | null)[] } = {};
  for (const period of periods) {
    maArrays[`ma${period}`] = calcFn(closes, period);
  }

  // 转换为按索引的结果数组
  return closes.map((_, i) => {
    const result: MAResult = {};
    for (const period of periods) {
      result[`ma${period}`] = maArrays[`ma${period}`][i];
    }
    return result;
  });
}

