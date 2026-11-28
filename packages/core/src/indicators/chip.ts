/**
 * 筹码分布(CYQ,成本转换分布)—— 东方财富前端算法的 TypeScript 移植。
 *
 * 算法本体来自东方财富行情页内嵌 JS(CYQCalculator):以「换手率衰减 + 当日
 * 三角形分布叠加」从日 K 线估算全体流通筹码的持仓成本分布(akshare 的
 * `stock_cyq_em` 通过 py_mini_racer 运行同一段 JS,本模块为等价纯 TS 实现,
 * 单测以原版 JS 逐日逐字段对拍钉住保真度)。
 *
 * 模型要点:
 * - 价格档:窗口内 [最低价, 最高价] 均分 150 档,档宽精度下限 0.01 元;
 * - 每根 K 线:先把存量筹码整体 ×(1 - 换手率),再把当日换手筹码按
 *   三角形分布(顶点在均价 avg=(O+C+H+L)/4)铺到 [low, high] 区间;
 *   一字板(high == low)时全部堆入单一价格档;
 * - 从分布读出:获利比例、平均成本(中位数成本,东财口径)、90/70 成本
 *   区间与集中度,以及筹码峰直方图本身。
 */
import { round, DEFAULT_INDICATOR_DECIMALS } from './round';

/** 价格档数量(东财原版 factor = 150) */
const FACTOR = 150;

/**
 * 筹码计算所需的最小 K 线形状:SDK 的 A 股 / 港股 / 美股历史日 K 线
 * (`HistoryKline` / `HKHistoryKline` / `USHistoryKline`)均满足。
 */
export interface ChipKlineLike {
  /** 日期 YYYY-MM-DD(或任意可标识该 bar 的字符串,原样透传到输出行) */
  date: string;
  /** 开盘价 */
  open: number | null;
  /** 最高价 */
  high: number | null;
  /** 最低价 */
  low: number | null;
  /** 收盘价 */
  close: number | null;
  /** 换手率 % */
  turnoverRate: number | null;
}

/**
 * 筹码峰直方图(单日分布形状)
 */
export interface ChipHistogram {
  /** 价格档(150 档,低 → 高,已按原算法保留 2 位小数) */
  prices: number[];
  /** 各价格档筹码占比(0..1,总和 ≈ 1;按 6 位小数舍入) */
  ratios: number[];
}

/**
 * `calcChipDistribution` 配置
 */
export interface ChipDistributionOptions {
  /**
   * 分布回看窗口(根)。每日分布只由最近 `range` 根 K 线推演。
   *
   * - `120`(默认):与东财 App / 网页筹码分布的显示口径一致;
   * - `0`:从序列首根全量累计(akshare `stock_cyq_em` 的口径)。
   *   注意该模式下每行成本为 O(序列长度),长序列请配合 {@link tail}。
   *
   * @default 120
   */
  range?: number;
  /**
   * 仅对输入序列**最后 `tail` 根**产出统计行(输出长度 = min(tail, 输入长度))。
   * 前面的 bar 仍参与分布推演,只是不生成输出行 —— 用于「取足暖机数据、
   * 只要尾部结果」的场景,避免 `range: 0` + 长序列时的 O(N²) 全量计算。
   * 不传时对每根输入 bar 都产出统计行;`tail <= 0` 或 `NaN` 输出空数组,
   * 非整数向下取整,`Infinity` 等价于不传(输出全部行)。
   */
  tail?: number;
  /**
   * 是否在输出行上附带筹码峰直方图:
   * - `false`(默认):不附带;
   * - `'last'` 或 `true`:仅最后一行附带(看「当前筹码峰」的常见场景);
   * - `'all'`:每行都附带(数据量为 每行 150 档 × 2 数组,注意体积)。
   *
   * @default false
   */
  includeHistogram?: boolean | 'last' | 'all';
  /**
   * 比例类字段(获利比例 / 集中度)的输出舍入小数位。
   * 价格类字段(平均成本 / 90-70 成本区间)固定 2 位小数(原算法口径),不受此项影响。
   *
   * @default 3
   */
  decimals?: number;
}

/**
 * 单日筹码分布统计(字段口径与 akshare `stock_cyq_em` 输出对齐)
 */
export interface ChipDistributionItem {
  /** 日期(透传输入 bar 的 date) */
  date: string;
  /** 获利比例 0..1(收盘价之下的筹码占比);收盘价缺失或分布退化时为 null */
  profitRatio: number | null;
  /** 平均成本(元,累计 50% 筹码处的价格,即中位数成本 —— 东财「平均成本」口径) */
  avgCost: number | null;
  /** 90% 筹码成本区间下沿(元) */
  cost90Low: number | null;
  /** 90% 筹码成本区间上沿(元) */
  cost90High: number | null;
  /** 90% 筹码集中度 (高-低)/(高+低) */
  concentration90: number | null;
  /** 70% 筹码成本区间下沿(元) */
  cost70Low: number | null;
  /** 70% 筹码成本区间上沿(元) */
  cost70High: number | null;
  /** 70% 筹码集中度 */
  concentration70: number | null;
  /** 筹码峰直方图(按 includeHistogram 配置附带) */
  histogram?: ChipHistogram;
}

/** bar 的 OHLC 全部有值才参与分布推演(上游脏行跳过,不中断整段计算) */
function isValidBar(bar: ChipKlineLike): bar is ChipKlineLike & {
  open: number;
  high: number;
  low: number;
  close: number;
} {
  return (
    bar.open !== null &&
    bar.high !== null &&
    bar.low !== null &&
    bar.close !== null
  );
}

/** 原版 `x.toPrecision(12) / 1` 的等价写法(读取分布值时统一压浮点尾数) */
function prec12(v: number): number {
  return Number(v.toPrecision(12));
}

/** 原版 `v.toFixed(2) / 1` 的等价写法(价格输出固定 2 位小数) */
function toPrice(v: number): number {
  return Number(v.toFixed(2));
}

/** 全字段为 null 的输出行(窗口内无有效 bar / 分布退化时) */
function emptyItem(date: string): ChipDistributionItem {
  return {
    date,
    profitRatio: null,
    avgCost: null,
    cost90Low: null,
    cost90High: null,
    concentration90: null,
    cost70Low: null,
    cost70High: null,
    concentration70: null,
  };
}

/**
 * 计算筹码分布(纯函数,零网络)。
 *
 * 输入通常为**日 K 线**(需含换手率;SDK 的 `kline.cn` / `kline.hk` / `kline.us`
 * 返回值可直接使用)。对输入的每根 bar(或 `tail` 限定的尾部)输出一行统计。
 *
 * 口径说明:
 * - `range` 默认 120(东财 App 显示口径);`range: 0` 为 akshare 全量累计口径,
 *   两者数值不同,对拍 akshare 输出时请显式传 `range: 0`;
 * - 复权方式由调用方在取 K 线时决定,分布数值随复权口径变化;
 * - 换手率缺失(null)的 bar 按 0 换手处理(沿用东财 `hsl/100 || 0` 语义);
 *   OHLC 含 null 的脏行整体跳过,不贡献分布;
 * - 窗口内累计换手极低(如长期停牌 / 仙股)时分布主要由窗口首日堆叠决定,
 *   参考价值有限;指数 / 无换手率概念的品种不适用本模型。
 *
 * @param klines - K 线序列(按时间升序)
 * @param options - 见 {@link ChipDistributionOptions}
 * @returns 每日筹码分布统计(与输入尾部 bar 一一对应)
 */
export function calcChipDistribution(
  klines: ChipKlineLike[],
  options: ChipDistributionOptions = {}
): ChipDistributionItem[] {
  const {
    range = 120,
    tail,
    includeHistogram = false,
    decimals = DEFAULT_INDICATOR_DECIMALS,
  } = options;

  const n = klines.length;
  if (n === 0) return [];

  // 文档口径:输出长度 = min(tail, 输入长度)。tail <= 0 输出为空,非整数向下取整
  const outStart =
    tail !== undefined ? n - Math.min(n, Math.max(0, Math.floor(tail))) : 0;
  const histogramMode: false | 'last' | 'all' =
    includeHistogram === true ? 'last' : includeHistogram || false;

  const result: ChipDistributionItem[] = [];
  for (let index = outStart; index < n; index++) {
    const wantHistogram =
      histogramMode === 'all' || (histogramMode === 'last' && index === n - 1);
    result.push(computeAt(klines, index, range, decimals, wantHistogram));
  }
  return result;
}

/**
 * 对单个 index 重算窗口分布(忠实移植东财 CYQCalculator:窗口每日整体重算,
 * 不做跨日增量 —— 滑动窗口下旧 bar 的乘法衰减链无法安全撤销)。
 */
function computeAt(
  klines: ChipKlineLike[],
  index: number,
  range: number,
  decimals: number,
  wantHistogram: boolean
): ChipDistributionItem {
  const date = klines[index].date;
  const start = range ? Math.max(0, index - range + 1) : 0;
  const kdata = klines.slice(start, Math.max(1, index + 1));

  // 窗口价格域(原版 `!maxprice ? high : max(...)` 的 0 兜底语义一并保留)
  // 原版用 `!maxprice ? high : max(...)` 的 0 兜底做首次赋值;这里改为
  // ±Infinity 初始化(超出原版的安全加固):前复权价格可为 0 甚至负数
  // (高分红老股 qfq 早年价格),原版写法在累计值恰为 0 时会被下一根 bar
  // 直接覆盖。正价数据下两种写法逐位等价(黄金对拍钉住)
  let maxprice = -Infinity;
  let minprice = Infinity;
  let hasValidBar = false;
  for (const bar of kdata) {
    if (!isValidBar(bar)) continue;
    hasValidBar = true;
    maxprice = Math.max(maxprice, bar.high);
    minprice = Math.min(minprice, bar.low);
  }
  if (!hasValidBar) return emptyItem(date);

  // 精度不小于 0.01(产品逻辑,与东财一致)
  const accuracy = Math.max(0.01, (maxprice - minprice) / (FACTOR - 1));

  // 筹码堆叠:逐 bar 衰减 + 三角形分布叠加
  const xdata: number[] = new Array<number>(FACTOR).fill(0);
  for (const bar of kdata) {
    if (!isValidBar(bar)) continue;
    const { open, close, high, low } = bar;
    const avg = (open + close + high + low) / 4;
    // 原版仅 Math.min 夹上界;这里补下界 0(超出原版的安全加固):脏数据的
    // 负换手率会让衰减因子 >1(存量筹码越"衰减"越多)并叠加负筹码,
    // 夹到 0 即"当日不换手"的安全语义
    const turnoverRate = Math.max(
      0,
      Math.min(1, ((bar.turnoverRate ?? 0) / 100) || 0)
    );

    // 档位索引夹逼到 [0, FACTOR-1](超出原版的安全加固):合法 OHLC 下
    // H/L/gIndex 有数学边界保证(accuracy ≥ (max-min)/149)永不越界;但
    // isValidBar 不校验 open/close ∈ [low, high],脏数据会让 avg 偏出价格域,
    // 越界写会把 xdata 撑成稀疏巨数组 → 后续 decay 按 length 遍历直接卡死
    const clampBucket = (i: number): number =>
      Math.min(FACTOR - 1, Math.max(0, i));
    const H = clampBucket(Math.floor((high - minprice) / accuracy));
    const L = clampBucket(Math.ceil((low - minprice) / accuracy));
    // G 点:一字板时 X 为进度因子(矩形面积是三角形的 2 倍)
    const gFactor = high === low ? FACTOR - 1 : 2 / (high - low);
    const gIndex = clampBucket(Math.floor((avg - minprice) / accuracy));

    // 衰减:当日换手部分从存量筹码中等比例移除
    for (let i = 0; i < xdata.length; i++) {
      xdata[i] *= 1 - turnoverRate;
    }

    if (high === low) {
      xdata[gIndex] += (gFactor * turnoverRate) / 2;
    } else {
      for (let j = L; j <= H; j++) {
        const curprice = minprice + accuracy * j;
        if (curprice <= avg) {
          // 上半三角(low → avg 线性上升)
          xdata[j] +=
            Math.abs(avg - low) < 1e-8
              ? gFactor * turnoverRate
              : ((curprice - low) / (avg - low)) * gFactor * turnoverRate;
        } else {
          // 下半三角(avg → high 线性下降)
          xdata[j] +=
            Math.abs(high - avg) < 1e-8
              ? gFactor * turnoverRate
              : ((high - curprice) / (high - avg)) * gFactor * turnoverRate;
        }
      }
    }
  }

  // bar 循环结束后 xdata 不再变更;读出阶段(totalChips / getCostByChip ×5 /
  // getBenefitPart / 直方图)共 6-8 次全档扫描,预计算一份 toPrecision 归一化值,
  // 免去每次扫描重复的字符串往返(prec12 为纯函数,逐位等价于原版逐次调用)
  const xp: number[] = new Array<number>(FACTOR);
  let totalChips = 0;
  for (let i = 0; i < FACTOR; i++) {
    xp[i] = prec12(xdata[i]);
    totalChips += xp[i];
  }
  // 分布退化(窗口内换手全为 0/缺失):原版会输出全 0,这里输出 null 更诚实
  if (totalChips === 0) return emptyItem(date);

  /** 累计到指定筹码量处的成本价(原版 getCostByChip) */
  const getCostByChip = (chip: number): number => {
    let cost = 0;
    let sum = 0;
    for (let i = 0; i < FACTOR; i++) {
      const x = xp[i];
      if (sum + x > chip) {
        cost = minprice + i * accuracy;
        break;
      }
      sum += x;
    }
    return cost;
  };

  /** 指定价格的获利比例(原版 getBenefitPart) */
  const getBenefitPart = (price: number): number => {
    let below = 0;
    for (let i = 0; i < FACTOR; i++) {
      if (price >= minprice + i * accuracy) {
        below += xp[i];
      }
    }
    return below / totalChips;
  };

  /** 中间 percent 筹码的价格区间与集中度(原版 computePercentChips) */
  const computePercentChips = (
    percent: number
  ): { low: number; high: number; concentration: number } => {
    const prLow = getCostByChip(totalChips * ((1 - percent) / 2));
    const prHigh = getCostByChip(totalChips * ((1 + percent) / 2));
    return {
      low: toPrice(prLow),
      high: toPrice(prHigh),
      concentration:
        prLow + prHigh === 0 ? 0 : (prHigh - prLow) / (prLow + prHigh),
    };
  };

  const close = klines[index].close;
  const p90 = computePercentChips(0.9);
  const p70 = computePercentChips(0.7);

  const item: ChipDistributionItem = {
    date,
    profitRatio: close !== null ? round(getBenefitPart(close), decimals) : null,
    avgCost: toPrice(getCostByChip(totalChips * 0.5)),
    cost90Low: p90.low,
    cost90High: p90.high,
    concentration90: round(p90.concentration, decimals),
    cost70Low: p70.low,
    cost70High: p70.high,
    concentration70: round(p70.concentration, decimals),
  };

  if (wantHistogram) {
    const prices: number[] = new Array<number>(FACTOR);
    const ratios: number[] = new Array<number>(FACTOR);
    for (let i = 0; i < FACTOR; i++) {
      prices[i] = toPrice(minprice + accuracy * i);
      ratios[i] = round(xp[i] / totalChips, 6);
    }
    item.histogram = { prices, ratios };
  }

  return item;
}
