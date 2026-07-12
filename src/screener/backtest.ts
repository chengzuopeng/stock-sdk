/**
 * 轻量回测引擎（v2 B2）—— 纯本地、单标的、多头。
 * 输入 K 线 + 策略函数，输出收益曲线 / 总收益 / 胜率 / 最大回撤 / 成交记录。
 *
 * 成交契约（回测引擎最重要的约定，误解即对不上实盘）：
 * - **同根收盘成交**：第 i 根 K 线上算出的信号，按第 i 根的收盘价成交（策略能看到
 *   该收盘价再决策）。真实交易只能在下一根成交，本引擎的零延迟约定会系统性美化
 *   「按收盘价触发」类策略（均值回归入场 / 止损出场），对比实盘请自行外加滑点。
 * - **无效价 bar 的信号挂起**：close 为 0（停牌编码）/ NaN / null 的 bar 上发出的
 *   buy/sell 不会被丢弃，而是挂起到下一根有效价 bar 成交；若届时策略给出新的非
 *   hold 信号，以新信号为准（最新意图优先）。数据在挂起信号成交前走完时：挂起的
 *   sell 按最后有效价平仓、计为策略出场（forced=false）；挂起的 buy 作废（无从建仓）。
 * - **null 空洞 bar**：klines 中 null/undefined 元素按无效价 bar 处理，且**不调用
 *   strategy**（策略可依赖 bar 恒非空）；下标对齐不受影响。
 * - **无手数约束**：全仓（或 positionSize 比例）买入允许任意小数股数，不模拟
 *   A 股 100 股整手限制与最低佣金 —— 小资金回测高价股的结果请自行审视可行性。
 */
import { InvalidArgumentError } from '../core/errors';

export type StrategySignal = 'buy' | 'sell' | 'hold';

/**
 * 策略：对每根 K 线返回操作信号。
 *
 * ⚠️ 第三个参数 `series` 是**完整 K 线数组（含当前 bar 之后的未来数据）**，仅供
 * 读取历史窗口（如 `series.slice(0, index + 1)`）。读取 `series[index + 1]` 及之后
 * 的元素即引入前视偏差（look-ahead bias），回测结果会严重虚高且不可复现于实盘。
 */
export type Strategy<T> = (
  bar: T,
  index: number,
  series: readonly T[]
) => StrategySignal;

export interface Trade {
  entryIndex: number;
  /** 出场 bar 下标；强制平仓时指向**最后一根有效价 bar**（与 exitPrice 必然对应同一根） */
  exitIndex: number;
  entryPrice: number;
  exitPrice: number;
  /** 本笔收益率（百分数，含双边费，相对本笔投入资金） */
  returnPercent: number;
  /**
   * true = 数据走完时强制平仓（非策略意图出场），统计时可据此过滤。
   * 尾部无效 bar 上挂起的 sell 视为策略意图 → forced=false（按最后有效价成交）。
   */
  forced: boolean;
  /** 入场 bar 日期（传入 getDate 时才有） */
  entryDate?: string | number;
  /** 出场 bar 日期（传入 getDate 时才有） */
  exitDate?: string | number;
}

export interface BacktestOptions<T> {
  klines: readonly T[];
  strategy: Strategy<T>;
  /** 初始资金，默认 100000（须为正有限数） */
  initialCapital?: number;
  /**
   * 手续费率，默认 0。数字 = 买卖同费率；对象形式可表达买卖不对称
   * （如 A 股卖出侧印花税：`{ buy: 0.0003, sell: 0.0013 }`）。取值须在 [0, 1)。
   */
  fee?: number | { buy: number; sell: number };
  /** 每次买入动用现金的比例，(0, 1]，默认 1（全仓） */
  positionSize?: number;
  /** 取收盘价；默认读取 `bar.close`（分时数据字段是 price 而非 close，需自传） */
  getClose?: (bar: T) => number | null;
  /** 取 bar 日期（如 `bar.date`）；传入后成交记录带 entryDate/exitDate */
  getDate?: (bar: T) => string | number | null | undefined;
}

export interface BacktestReport {
  initialCapital: number;
  finalEquity: number;
  /** 总收益率（百分数） */
  totalReturn: number;
  /**
   * 胜率（百分数）。按 `returnPercent > 0` 计胜：恰好 0（纯费差平局）与强制平仓单
   * 均计入分母 —— 过滤强平单请用 `trades.filter(t => !t.forced)` 自行统计。
   */
  winRate: number;
  /** 最大回撤（百分数，正数；以初始资金为起始基线） */
  maxDrawdown: number;
  /** 买入持有基准收益率（百分数，首根有效收盘 → 末根有效收盘，不含费） */
  buyHoldReturn: number;
  /** 有效价 bar 数。为 0 说明所有 bar 都取不到有效收盘价（如字段名不是 close） */
  validBars: number;
  tradeCount: number;
  trades: Trade[];
  /** 每根 K 线收盘后的权益 */
  equityCurve: number[];
}

function defaultGetClose<T>(bar: T): number | null {
  // 有效性（有限、>0）统一由主循环把关，这里只做取值 + 空值归一
  const c = (bar as { close?: number | null } | null | undefined)?.close;
  return c ?? null;
}

/** 校验费率取值 ∈ [0, 1)（fee ≥ 1 会让仓位归零/变负、引擎永久卡死，负费率则凭空生钱）。 */
function assertFeeRate(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new InvalidArgumentError(
      `${name} 必须在 [0, 1) 内（如 0.0003 表示万分之三），得到 ${value}`,
      { [name]: value }
    );
  }
}

/**
 * 执行回测。规则：`buy` 且空仓 → 按 positionSize 买入；`sell` 且持仓 → 全部卖出；
 * 结束仍持仓则按最后有效收盘价强制平仓（Trade.forced = true）。
 * 成交时点 / 无效价挂起 / 手数简化等契约见文件头注释。
 */
export function backtest<T>(options: BacktestOptions<T>): BacktestReport {
  const {
    klines,
    strategy,
    initialCapital = 100000,
    fee = 0,
    positionSize = 1,
    getClose = defaultGetClose,
    getDate,
  } = options;

  // 入口校验（对齐 screener.top(n) 的 InvalidArgumentError 先例）：
  // 不校验时 fee>=1 / 负本金 / NaN 会产出「maxDrawdown 0 + 收益符号反转」的静默垃圾报告
  if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
    throw new InvalidArgumentError(
      `initialCapital 必须为正有限数，得到 ${initialCapital}`,
      { initialCapital }
    );
  }
  // fee 形态归一：null 视同未传（沿袭旧引擎宽容语义）；数字 = 双边同费率；
  // 对象 = 逐侧；其余类型（字符串等）以准确文案拒绝，而非误导性的 fee.buy=undefined
  let feeBuy: number;
  let feeSell: number;
  if (fee == null) {
    feeBuy = feeSell = 0;
  } else if (typeof fee === 'number') {
    feeBuy = feeSell = fee;
    assertFeeRate('fee', fee);
  } else if (typeof fee === 'object') {
    feeBuy = fee.buy;
    feeSell = fee.sell;
    assertFeeRate('fee.buy', feeBuy);
    assertFeeRate('fee.sell', feeSell);
  } else {
    throw new InvalidArgumentError(
      `fee 必须是数字或 { buy, sell } 对象，得到 ${String(fee)}`,
      { fee }
    );
  }
  if (!Number.isFinite(positionSize) || positionSize <= 0 || positionSize > 1) {
    throw new InvalidArgumentError(
      `positionSize 必须在 (0, 1] 内，得到 ${positionSize}`,
      { positionSize }
    );
  }

  let cash = initialCapital;
  let position = 0;
  let entryPrice = 0;
  let entryIndex = -1;
  let lastPrice = 0;
  let lastPriceIndex = -1;
  let firstValidPrice = 0;
  let validBars = 0;
  // 无效价 bar 上的最新非 hold 意图，挂起到下一根有效价 bar
  let pending: 'buy' | 'sell' | null = null;
  const trades: Trade[] = [];
  const equityCurve: number[] = [];

  const dateOf = (i: number): string | number | undefined => {
    if (!getDate || i < 0 || klines[i] == null) return undefined;
    return getDate(klines[i]) ?? undefined;
  };

  const recordTrade = (exitIndex: number, exitPrice: number, forced: boolean) => {
    // 与持仓现金路径完全一致:买入扣 (1-feeBuy)、卖出扣 (1-feeSell),双边手续费按复利,
    // 而非 (gross - 2*fee) 的线性近似 —— 确保 returnPercent 相对本笔投入资金的口径
    // 与 equityCurve 一致(positionSize=1 单笔时与 totalReturn 数值相等),
    // winRate(按 returnPercent>0 统计)也才准确。
    const returnPercent =
      ((exitPrice / entryPrice) * (1 - feeBuy) * (1 - feeSell) - 1) * 100;
    const t: Trade = { entryIndex, exitIndex, entryPrice, exitPrice, returnPercent, forced };
    const entryDate = dateOf(entryIndex);
    if (entryDate !== undefined) t.entryDate = entryDate;
    const exitDate = dateOf(exitIndex);
    if (exitDate !== undefined) t.exitDate = exitDate;
    trades.push(t);
  };

  for (let i = 0; i < klines.length; i++) {
    // bar 本身为 null/undefined（JSON 空洞）时既不进 getClose 也不进 strategy ——
    // 策略作者可依赖「bar 恒非空」，引擎与用户代码都不因空洞抛裸 TypeError
    const isHole = klines[i] == null;
    const rawPrice = isHole ? null : getClose(klines[i]);
    // 仅正有限价为有效价；0(停牌/缺口编码)、NaN、null 一律视为无效
    const price =
      rawPrice != null && Number.isFinite(rawPrice) && rawPrice > 0
        ? rawPrice
        : null;
    const signal: StrategySignal = isHole ? 'hold' : strategy(klines[i], i, klines);

    if (price != null) {
      validBars++;
      lastPrice = price;
      lastPriceIndex = i;
      if (firstValidPrice === 0) firstValidPrice = price;
      // 当根信号优先；当根 hold 时执行挂起意图（无效 bar 上发出的信号在此成交）
      const effective = signal !== 'hold' ? signal : pending;
      pending = null;
      if (effective === 'buy' && position === 0) {
        const invest = cash * positionSize;
        position = (invest * (1 - feeBuy)) / price;
        entryPrice = price;
        entryIndex = i;
        cash -= invest;
      } else if (effective === 'sell' && position > 0) {
        cash += position * price * (1 - feeSell);
        recordTrade(i, price, false);
        position = 0;
      }
    } else if (signal !== 'hold') {
      pending = signal;
    }

    // 无效价回退到 lastPrice 做 mark-to-market，避免 equity 塌成 cash 或被 NaN 污染
    const mark = price ?? lastPrice;
    const equity = cash + position * mark;
    equityCurve.push(equity);
  }

  // 收尾平仓：exitIndex 指向最后一根有效价 bar（价格与下标必然对应同一根 K 线）。
  // 挂起的 sell（发在尾部无效 bar 上、没等到下一根有效价）视为策略意图出场
  // （forced=false），仅「数据走完仍持仓且无出场意图」才标 forced=true。
  if (position > 0 && lastPrice > 0) {
    cash += position * lastPrice * (1 - feeSell);
    recordTrade(lastPriceIndex, lastPrice, pending !== 'sell');
    position = 0;
    // 结算记账在出场 bar（与 exitIndex 同根，卖出费即刻体现），其后的无效尾 bar
    // 一律标为现金 —— 否则 exitIndex 与权益结算落点分离，停牌尾部会出现幽灵费差
    for (let j = Math.max(lastPriceIndex, 0); j < equityCurve.length; j++) {
      equityCurve[j] = cash;
    }
  }

  const finalEquity = equityCurve.length
    ? equityCurve[equityCurve.length - 1]
    : initialCapital;
  const totalReturn = (finalEquity / initialCapital - 1) * 100;
  const wins = trades.filter((t) => t.returnPercent > 0).length;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const buyHoldReturn =
    firstValidPrice > 0 ? (lastPrice / firstValidPrice - 1) * 100 : 0;

  // peak 以 initialCapital 播种:首笔买入的手续费回撤才会被看见
  // (此前 bar0 买入 vs bar1 买入,同一经济学产出 2 倍差异的 maxDrawdown)
  let peak = initialCapital;
  let maxDrawdown = 0;
  for (const e of equityCurve) {
    if (e > peak) peak = e;
    const dd = ((peak - e) / peak) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    initialCapital,
    finalEquity,
    totalReturn,
    winRate,
    maxDrawdown,
    buyHoldReturn,
    validBars,
    tradeCount: trades.length,
    trades,
    equityCurve,
  };
}
