import { BOLLOptions, BOLLResult } from './types';
import { calcSMA, SlidingWindowSum } from './ma';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算标准差
 *
 * F36: 旧实现逐 bar 重扫整窗求 Σ(x−m)²（O(n×period)），改为滑窗维护 Σx 与 Σx²
 * （O(n)），按恒等式 Σ(x−m)² = Σx² − 2m·Σx + n·m² 还原。注意这里的 m 是
 * calcSMA 产出的**已舍入** SMA（与旧实现口径一致），所以不能用
 * Var = E[x²] − E[x]²（那是未舍入均值的特例），必须带 m 的完整展开式。
 * null 语义不变：窗口不完整（任一 null）→ 输出 null。
 * 浮点：展开式存在大数相消，真实方差≈0 时可能算出微负值，clamp 到 0
 * 防 sqrt 产 NaN；与旧实现的逐值（round 后）一致性由 rolling-parity 对拍保证。
 * 契约外输入：NaN 在窗时两版同样输出 NaN、离窗后同样恢复；±Infinity 在窗时
 * 本式产 NaN（旧实现产 Infinity），均为垃圾值，离窗后同样恢复。
 */
function calcStdDev(
  data: (number | null)[],
  period: number,
  ma: (number | null)[]
): (number | null)[] {
  const result: (number | null)[] = new Array<number | null>(data.length);
  // x² 序列一次性物化（每次 calcBOLL 仅一个数组），两条滑窗共用同一 null 分布
  const squares: (number | null)[] = data.map((v) => (v === null ? null : v * v));
  const sumWin = new SlidingWindowSum(data, period);
  const sqWin = new SlidingWindowSum(squares, period);

  for (let i = 0; i < data.length; i++) {
    sumWin.advance(i);
    sqWin.advance(i);

    const m = ma[i];
    if (i < period - 1 || m === null) {
      result[i] = null;
      continue;
    }

    if (sumWin.nonNullCount !== period) {
      result[i] = null;
      continue;
    }

    const sumSquares = sqWin.value - 2 * m * sumWin.value + period * m * m;
    result[i] = Math.sqrt(Math.max(0, sumSquares) / period);
  }

  return result;
}

/**
 * 计算布林带
 */
export function calcBOLL(
  closes: (number | null)[],
  options: BOLLOptions = {}
): BOLLResult[] {
  const { period = 20, stdDev = 2 } = options;

  // 计算中轨（MA）
  const mid = calcSMA(closes, period);

  // 计算标准差
  const std = calcStdDev(closes, period, mid);

  // 计算上下轨和带宽
  return closes.map((_, i) => {
    if (mid[i] === null || std[i] === null) {
      return { mid: null, upper: null, lower: null, bandwidth: null };
    }

    const upper = mid[i]! + stdDev * std[i]!;
    const lower = mid[i]! - stdDev * std[i]!;
    const bandwidth =
      mid[i]! !== 0 ? round(((upper - lower) / mid[i]!) * 100) : null;

    return {
      mid: mid[i],
      upper: round(upper),
      lower: round(lower),
      bandwidth,
    };
  });
}

