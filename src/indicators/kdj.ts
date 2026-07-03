import { OHLCV, KDJOptions, KDJResult } from './types';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算 KDJ 指标
 *
 * F36: N 日最高/最低改用单调队列（monotonic deque）O(n) 滑动最值，
 * 替换旧的逐 bar 重扫整窗（O(n×period)）。
 * - null 语义不变：窗口内任一 bar 的 high/low 为 null → 该位输出全 null，
 *   且 **不更新** k/d 平滑状态（与旧实现的 continue 路径一致）。
 *   实现上用滑动计数 invalidInWindow 把关；high/low 均非 null 的 bar 才入队
 *   —— 含 null 的窗口本就整窗判 null，该 bar 入不入队不影响任何有效窗口。
 * - 浮点一致性：最值只做比较不做算术，highN/lowN 与旧实现**逐位相同**，
 *   k/d/j 的递推与舍入完全不变。
 */
export function calcKDJ(
  data: OHLCV[],
  options: KDJOptions = {}
): KDJResult[] {
  const { period = 9, kPeriod = 3, dPeriod = 3 } = options;

  const result: KDJResult[] = [];
  let k = 50;
  let d = 50;

  // 单调队列存索引：maxIdx 对应 high 严格递减、minIdx 对应 low 严格递增；
  // 用 head 指针代替 shift() 避免 O(n) 搬移。
  const maxIdx: number[] = [];
  let maxHead = 0;
  const minIdx: number[] = [];
  let minHead = 0;
  let invalidInWindow = 0; // 窗口内 high/low 含 null 的 bar 数

  for (let i = 0; i < data.length; i++) {
    // 进窗
    const bar = data[i];
    if (bar.high === null || bar.low === null) {
      invalidInWindow++;
    } else {
      while (
        maxIdx.length > maxHead &&
        data[maxIdx[maxIdx.length - 1]].high! <= bar.high
      ) {
        maxIdx.pop();
      }
      maxIdx.push(i);
      while (
        minIdx.length > minHead &&
        data[minIdx[minIdx.length - 1]].low! >= bar.low
      ) {
        minIdx.pop();
      }
      minIdx.push(i);
    }
    // 出窗
    const windowStart = i - period + 1;
    if (i >= period) {
      const gone = data[i - period];
      if (gone.high === null || gone.low === null) invalidInWindow--;
    }
    while (maxIdx.length > maxHead && maxIdx[maxHead] < windowStart) maxHead++;
    while (minIdx.length > minHead && minIdx[minHead] < windowStart) minHead++;

    if (i < period - 1) {
      result.push({ k: null, d: null, j: null });
      continue;
    }

    // N 日内最高价和最低价（队首即窗口最值；空窗时与旧实现的初值语义一致）
    const highN = maxIdx.length > maxHead ? data[maxIdx[maxHead]].high! : -Infinity;
    const lowN = minIdx.length > minHead ? data[minIdx[minHead]].low! : Infinity;

    const close = data[i].close;
    if (invalidInWindow > 0 || close === null || highN === lowN) {
      result.push({ k: null, d: null, j: null });
      continue;
    }

    // 计算 RSV
    const rsv = ((close - lowN) / (highN - lowN)) * 100;

    // 计算 K 值（平滑）
    k = ((kPeriod - 1) / kPeriod) * k + (1 / kPeriod) * rsv;

    // 计算 D 值（平滑）
    d = ((dPeriod - 1) / dPeriod) * d + (1 / dPeriod) * k;

    // 计算 J 值
    const j = 3 * k - 2 * d;

    result.push({
      k: round(k),
      d: round(d),
      j: round(j),
    });
  }

  return result;
}

