/**
 * 指标信号层类型（v2 B1）
 */

/** 信号类型 */
export type SignalType =
  | 'ma_golden_cross'
  | 'ma_death_cross'
  | 'macd_golden_cross'
  | 'macd_death_cross'
  | 'kdj_golden_cross'
  | 'kdj_death_cross'
  | 'kdj_overbought'
  | 'kdj_oversold'
  | 'rsi_overbought'
  | 'rsi_oversold'
  | 'boll_break_upper'
  | 'boll_break_lower'
  | 'sar_reversal_up'
  | 'sar_reversal_down';

/** 单条信号 */
export interface Signal {
  type: SignalType;
  /** 对应 K 线的 timestamp（恒非空：calcSignals 跳过 timestamp 为 null 的 K 线） */
  at: number;
  /** 对应 K 线在输入数组中的下标 */
  index: number;
  /** 附加信息（如金叉的快慢周期、超买超卖的指标值） */
  detail?: Record<string, number>;
}

/** 信号计算选项；只为传入的指标计算信号 */
export interface SignalOptions {
  /** MA 金叉/死叉：fast 上穿/下穿 slow */
  ma?: { fast: number; slow: number };
  /** MACD 金叉/死叉：DIF 上穿/下穿 DEA */
  macd?: boolean;
  /** KDJ 金叉死叉 + 超买超卖（默认 80/20） */
  kdj?: { overbought?: number; oversold?: number };
  /** RSI 超买超卖（默认 period=6，70/30） */
  rsi?: { period?: number; overbought?: number; oversold?: number };
  /** BOLL 收盘突破上/下轨 */
  boll?: boolean;
  /** SAR 趋势反转 */
  sar?: boolean;
}
