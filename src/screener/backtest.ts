/**
 * 轻量回测引擎（v2 B2）—— 纯本地、单标的、全仓多头。
 * 输入 K 线 + 策略函数，输出收益曲线 / 总收益 / 胜率 / 最大回撤 / 成交记录。
 */

export type StrategySignal = 'buy' | 'sell' | 'hold';

/** 策略：对每根 K 线返回操作信号 */
export type Strategy<T> = (
  bar: T,
  index: number,
  history: readonly T[]
) => StrategySignal;

export interface Trade {
  entryIndex: number;
  exitIndex: number;
  entryPrice: number;
  exitPrice: number;
  /** 本笔收益率（百分数，含双边费） */
  returnPercent: number;
}

export interface BacktestOptions<T> {
  klines: readonly T[];
  strategy: Strategy<T>;
  /** 初始资金，默认 100000 */
  initialCapital?: number;
  /** 单边费率（如 0.0003），默认 0 */
  fee?: number;
  /** 取收盘价；默认读取 `bar.close` */
  getClose?: (bar: T) => number | null;
}

export interface BacktestReport {
  initialCapital: number;
  finalEquity: number;
  /** 总收益率（百分数） */
  totalReturn: number;
  /** 胜率（百分数） */
  winRate: number;
  /** 最大回撤（百分数，正数） */
  maxDrawdown: number;
  tradeCount: number;
  trades: Trade[];
  /** 每根 K 线收盘后的权益 */
  equityCurve: number[];
}

function defaultGetClose<T>(bar: T): number | null {
  const c = (bar as { close?: number | null }).close;
  return c != null && Number.isFinite(c) ? c : null;
}

/**
 * 执行回测。规则：`buy` 且空仓 → 全仓买入；`sell` 且持仓 → 全部卖出；
 * 结束仍持仓则按最后有效收盘价平仓。
 */
export function backtest<T>(options: BacktestOptions<T>): BacktestReport {
  const {
    klines,
    strategy,
    initialCapital = 100000,
    fee = 0,
    getClose = defaultGetClose,
  } = options;

  let cash = initialCapital;
  let position = 0;
  let entryPrice = 0;
  let entryIndex = -1;
  let lastPrice = 0;
  const trades: Trade[] = [];
  const equityCurve: number[] = [];

  const recordTrade = (exitIndex: number, exitPrice: number) => {
    // 与持仓现金路径完全一致:买入扣 (1-fee)、卖出扣 (1-fee),双边手续费按复利,
    // 而非 (gross - 2*fee) 的线性近似 —— 确保 returnPercent 与 totalReturn / equityCurve 同口径,
    // winRate(按 returnPercent>0 统计)也才准确。
    const returnPercent =
      ((exitPrice / entryPrice) * (1 - fee) * (1 - fee) - 1) * 100;
    trades.push({ entryIndex, exitIndex, entryPrice, exitPrice, returnPercent });
  };

  for (let i = 0; i < klines.length; i++) {
    const rawPrice = getClose(klines[i]);
    // 仅正有限价为有效价；0(停牌/缺口编码)、NaN、null 一律视为无效
    const price =
      rawPrice != null && Number.isFinite(rawPrice) && rawPrice > 0
        ? rawPrice
        : null;
    const signal = strategy(klines[i], i, klines);

    if (price != null) {
      lastPrice = price;
      if (signal === 'buy' && position === 0) {
        position = (cash * (1 - fee)) / price;
        entryPrice = price;
        entryIndex = i;
        cash = 0;
      } else if (signal === 'sell' && position > 0) {
        cash = position * price * (1 - fee);
        recordTrade(i, price);
        position = 0;
      }
    }

    // 无效价回退到 lastPrice 做 mark-to-market，避免 equity 塌成 cash 或被 NaN 污染
    const mark = price ?? lastPrice;
    const equity = cash + position * mark;
    equityCurve.push(equity);
  }

  // 收尾平仓
  if (position > 0 && lastPrice > 0) {
    cash = position * lastPrice * (1 - fee);
    recordTrade(klines.length - 1, lastPrice);
    position = 0;
    if (equityCurve.length > 0) equityCurve[equityCurve.length - 1] = cash;
  }

  const finalEquity = equityCurve.length
    ? equityCurve[equityCurve.length - 1]
    : initialCapital;
  const totalReturn = (finalEquity / initialCapital - 1) * 100;
  const wins = trades.filter((t) => t.returnPercent > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const e of equityCurve) {
    if (e > peak) peak = e;
    const dd = peak > 0 ? ((peak - e) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    initialCapital,
    finalEquity,
    totalReturn,
    winRate,
    maxDrawdown,
    tradeCount: trades.length,
    trades,
    equityCurve,
  };
}
