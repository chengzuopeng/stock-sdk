import { OHLCV, CCIOptions, CCIResult } from './types';

/**
 * 统一精度处理
 */
function round(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * 计算商品通道指数 CCI
 * 
 * 公式：
 * TP（典型价格）= (最高价 + 最低价 + 收盘价) / 3
 * MA = TP 的 N 日简单移动平均
 * MD = TP 与 MA 的平均绝对偏差
 * CCI = (TP - MA) / (0.015 × MD)
 * 
 * CCI 用于判断超买超卖：
 * - CCI > 100：超买区域
 * - CCI < -100：超卖区域
 * - CCI 在 -100 ~ 100 之间：正常区域
 */
export function calcCCI(
  data: OHLCV[],
  options: CCIOptions = {}
): CCIResult[] {
  const { period = 14 } = options;

  const result: CCIResult[] = [];

  // 计算典型价格 TP
  const tp: (number | null)[] = data.map((d) => {
    if (d.high === null || d.low === null || d.close === null) {
      return null;
    }
    return (d.high + d.low + d.close) / 3;
  });

  // F36 评估后**两个窗口循环都保持逐窗**，理由：
  // 1) MD 围绕每个窗口各自的均值取绝对偏差，均值逐窗变化导致 |tp_j − ma|
  //    各项随窗口整体改变，无法像 Σx/Σx² 那样增量维护 —— MD 这层 O(n×period)
  //    无论如何省不掉，整体复杂度阶不因均值 rolling 而改变。
  // 2) 均值若改 rolling，累计的 ±1ulp 残差会破坏平段（横盘/停牌/一字板）上
  //    `md === 0` 的精确判定：旧实现逐窗求和在全等窗口上常得 md 恰为 0 →
  //    cci 输出 0；rolling 残差使 md 变成 ~1e-13 ≠ 0，cci 会翻成
  //    (tp−ma)/(0.015·md) ≈ ±66.67 的纯噪声 —— 真实行情的平段上属实打实的
  //    行为回归。收益（省一半内循环常数）配不上这个正确性代价，不改。
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ cci: null });
      continue;
    }

    // 计算 TP 的 N 日简单移动平均
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

    // 计算平均绝对偏差 MD
    let mdSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      mdSum += Math.abs(tp[j]! - ma);
    }
    const md = mdSum / period;

    // 计算 CCI
    if (md === 0) {
      result.push({ cci: 0 });
    } else {
      const cci = (tp[i]! - ma) / (0.015 * md);
      result.push({ cci: round(cci) });
    }
  }

  return result;
}

