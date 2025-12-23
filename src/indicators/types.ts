// ========== 输入类型 ==========
export interface OHLCV {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume?: number | null;
}

// ========== 配置类型 ==========
export interface MAOptions {
  /** 均线周期数组，默认 [5, 10, 20, 30, 60, 120, 250] */
  periods?: number[];
  /** 均线类型：'sma'(简单) | 'ema'(指数) | 'wma'(加权)，默认 'sma' */
  type?: 'sma' | 'ema' | 'wma';
}

export interface MACDOptions {
  /** 短期 EMA 周期，默认 12 */
  short?: number;
  /** 长期 EMA 周期，默认 26 */
  long?: number;
  /** 信号线 EMA 周期，默认 9 */
  signal?: number;
}

export interface BOLLOptions {
  /** 均线周期，默认 20 */
  period?: number;
  /** 标准差倍数，默认 2 */
  stdDev?: number;
}

export interface KDJOptions {
  /** RSV 周期，默认 9 */
  period?: number;
  /** K 值平滑周期，默认 3 */
  kPeriod?: number;
  /** D 值平滑周期，默认 3 */
  dPeriod?: number;
}

export interface RSIOptions {
  /** RSI 周期数组，默认 [6, 12, 24] */
  periods?: number[];
}

export interface WROptions {
  /** WR 周期数组，默认 [6, 10] */
  periods?: number[];
}

export interface BIASOptions {
  /** BIAS 周期数组，默认 [6, 12, 24] */
  periods?: number[];
}

export interface CCIOptions {
  /** CCI 周期，默认 14 */
  period?: number;
}

export interface ATROptions {
  /** ATR 周期，默认 14 */
  period?: number;
}

export interface IndicatorOptions {
  ma?: MAOptions | boolean;
  macd?: MACDOptions | boolean;
  boll?: BOLLOptions | boolean;
  kdj?: KDJOptions | boolean;
  rsi?: RSIOptions | boolean;
  wr?: WROptions | boolean;
  bias?: BIASOptions | boolean;
  cci?: CCIOptions | boolean;
  atr?: ATROptions | boolean;
}

// ========== 输出类型 ==========
export interface MAResult {
  [key: string]: number | null; // ma5, ma10, ma20...
}

export interface MACDResult {
  dif: number | null;
  dea: number | null;
  macd: number | null;
}

export interface BOLLResult {
  mid: number | null;
  upper: number | null;
  lower: number | null;
  bandwidth: number | null;
}

export interface KDJResult {
  k: number | null;
  d: number | null;
  j: number | null;
}

export interface RSIResult {
  [key: string]: number | null; // rsi6, rsi12, rsi24...
}

export interface WRResult {
  [key: string]: number | null; // wr6, wr10...
}

export interface BIASResult {
  [key: string]: number | null; // bias6, bias12, bias24...
}

export interface CCIResult {
  cci: number | null;
}

export interface ATRResult {
  /** 真实波幅 */
  tr: number | null;
  /** 平均真实波幅 */
  atr: number | null;
}

