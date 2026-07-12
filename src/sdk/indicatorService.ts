import { addIndicators, estimateIndicatorLookback, hasCumulativeIndicator, type IndicatorOptions, type KlineWithIndicators } from '../indicators';

/**
 * 全量 refetch 后切片的 lookback 下限(根),仅对【递归型】指标组合生效。
 * estimateIndicatorLookback 的 requiredBars 是"窗口期能算出值"的下限,
 * 不足以让递归型指标(KDJ/RSI/ATR/DMI)的平滑状态收敛到 round(3) 之下;
 * 500 根下 Wilder-14 的状态差衰减至 ~2e-16,对 3 位小数输出即逐值一致。
 *
 * Review P2-7:500 只按默认周期标定 —— 非默认大周期(如 rsi periods:[100])
 * 的 Wilder-100 在 400 步后仅衰减到 ~1.8%,round(3) 可见。实际下限取
 * max(500, 15 × maxRecursiveLookback):暖机内首个有效值前还要消耗 ~N 根种子,
 * 有效衰减步数 ≈ (15-1)N,Wilder-N 衰减 14N 步 ≈ e^-14 ≈ 1e-6 ——
 * 远低于 3 位舍入半步(5e-4,余量 ~500×),.xxx5 刀尖位也不会翻转
 * (10× 时曾在 2 位输出下实测单 bar ±0.01,故取 15×)。
 *
 * Review R3-12:倍增基数从全局 maxLookback 收窄为 maxRecursiveLookback
 * (registry 按 recursive/emaBased 声明)—— 纯窗口型指标(SMA/BOLL/WR 等)
 * 只看固定窗口,requiredBars 即精确,此前纯 ma:[250] 也被放大到 3750 根,
 * 白算 3000+;混合组合(如 ma[250]+macd)按递归成员的周期放大(macd 87 →
 * 1305),不再被窗口型的大周期(250 → 3750)绑架。
 */
const RECURSIVE_WARMUP = 500;
const WARMUP_LOOKBACK_MULTIPLIER = 15;


import type { AnyHistoryKline } from '../types';
import type { KlineService } from './klineService';
import type { QuoteService } from './quoteService';
import { marketOf } from '../symbols';
import { InvalidArgumentError } from '../core/errors';
import { addDays } from '../core/time';
import { calcSignals, type Signal } from '../signals';

export type MarketType = 'A' | 'HK' | 'US';

/**
 * `getKlineWithIndicators` 的请求参数
 */
export interface KlineWithIndicatorsOptions {
  /**
   * 市场类型
   * - 不传时由 SDK 根据 `symbol` 自动识别
   * - A 股 / 港股 / 美股 => 'A' / 'HK' / 'US'
   */
  market?: MarketType;
  /** K 线周期，默认 `'daily'` */
  period?: 'daily' | 'weekly' | 'monthly';
  /** 复权方式：`''` 不复权 / `'qfq'` 前复权 / `'hfq'` 后复权 */
  adjust?: '' | 'qfq' | 'hfq';
  /**
   * 起始日期（`YYYYMMDD` 或 `YYYY-MM-DD`）
   * - SDK 会根据指标依赖自动向前多取若干 bar，以保证首日指标有效
   */
  startDate?: string;
  /** 结束日期（`YYYYMMDD` 或 `YYYY-MM-DD`） */
  endDate?: string;
  /**
   * 指标配置
   * - 仅传入 key（如 `{ ma: [5, 10] }`）即可启用对应指标
   * - 完整选项参见 `IndicatorOptions`
   */
  indicators?: IndicatorOptions;
  /**
   * 窗口前额外保留的 bar 数（内部选项，信号闭环用；默认 0）。
   * `getKlineSignals` 传 1：交叉识别需要窗口首日的前一根做锚点，按**下标**多留
   * 一根已算好指标的 bar —— 对任意长度的停牌缺口都精确（区别于按天数回推的
   * 启发式）。仅 `startDate` 存在时生效；保留的 bar 日期早于 startDate。
   */
  leadingBars?: number;
}

/**
 * `getKlineSignals` 的请求参数。
 *
 * 复用 K 线的取数选项（market / period / adjust / startDate / endDate），
 * 额外用 `maFast` / `maSlow` 指定 MA 金叉/死叉的快慢线周期。其余信号族
 * （MACD / KDJ / RSI / BOLL / SAR）用固定的常用默认阈值，一次性全部识别。
 */
export interface KlineSignalsOptions {
  /** 市场类型；不传由 `symbol` 自动识别（同 {@link KlineWithIndicatorsOptions.market}） */
  market?: MarketType;
  /** K 线周期，默认 `'daily'` */
  period?: 'daily' | 'weekly' | 'monthly';
  /** 复权方式：`''` 不复权 / `'qfq'` 前复权 / `'hfq'` 后复权 */
  adjust?: '' | 'qfq' | 'hfq';
  /**
   * 起始日期（`YYYYMMDD` 或 `YYYY-MM-DD`）。
   * 不传则在全部历史上识别信号；只关心近期请传起始日期收窄窗口。
   */
  startDate?: string;
  /** 结束日期（`YYYYMMDD` 或 `YYYY-MM-DD`） */
  endDate?: string;
  /** MA 金叉/死叉快线周期，默认 5（须为正整数且小于 `maSlow`） */
  maFast?: number;
  /** MA 金叉/死叉慢线周期，默认 20（须为正整数且大于 `maFast`） */
  maSlow?: number;
}

/**
 * 一条识别出的指标信号 —— 在原始 {@link Signal} 上补充**日期与收盘价**，
 * 让 LLM / 调用方无需回查 K 线即可解读（如「MACD 金叉 · 2026-06-15 · 收 1720」）。
 */
export interface KlineSignal {
  /** 信号类型（14 种：MA/MACD/KDJ 金叉死叉、KDJ/RSI 超买超卖、BOLL 突破、SAR 反转） */
  type: Signal['type'];
  /** 信号发生 K 线的日期（原始 `date`，通常 `YYYY-MM-DD`） */
  date: string;
  /** 信号发生 K 线的时间戳（epoch 毫秒，= {@link Signal.at}） */
  timestamp: number;
  /** 信号发生 K 线的收盘价 */
  close: number | null;
  /** 附加信息（如金叉的快慢周期、超买超卖的指标值） */
  detail?: Record<string, number>;
}

export class IndicatorService {
  constructor(
    private readonly klineService: Pick<
      KlineService,
      'getHistoryKline' | 'getHKHistoryKline' | 'getUSHistoryKline'
    >,
    private readonly quoteService: Pick<QuoteService, 'getTradingCalendar'>
  ) {}

  private detectMarket(symbol: string): MarketType {
    // F42: 市场解析收编到 symbols/marketOf(与 CLI detectMarketTag 共享实现);
    // 解析失败(undefined)兜底 'A' 的决策保留在本调用方。
    const market = marketOf(symbol);
    // GLOBAL(GDAXI 等)无 K 线路由:避免落 'A' 后抛出误导性 CN hint 冲突
    if (market === 'GLOBAL') {
      throw new InvalidArgumentError(
        `No kline route for GLOBAL-market symbol '${symbol}'; ` +
          `use the US kline API with a raw secid instead (e.g. kline.us('100.GDAXI'))`
      );
    }
    return market === 'HK' ? 'HK' : market === 'US' ? 'US' : 'A';
  }

  private calcActualStartDate(
    startDate: string,
    tradingDays: number,
    ratio: number = 1.5
  ): string {
    // 兼容 'YYYY-MM-DD' 与 'YYYYMMDD' 两种入参：先归一成紧凑格式再 slice
    const compact = this.toCompactDate(startDate);
    const naturalDays = Math.ceil(tradingDays * ratio);
    const date = new Date(
      parseInt(compact.slice(0, 4)),
      parseInt(compact.slice(4, 6)) - 1,
      parseInt(compact.slice(6, 8))
    );
    date.setDate(date.getDate() - naturalDays);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }

  /**
   * @param startDate 已经 normalizeUserDate 归一过的 'YYYY-MM-DD'(R3-1:入口
   *   前移校验后,本方法不再可能因日期格式抛错,外层 catch 恢复其本意 ——
   *   只兜 getTradingCalendar 的网络失败)
   */
  private calcActualStartDateByCalendar(
    startDate: string,
    tradingDays: number,
    calendar: string[]
  ): string | undefined {
    if (!calendar || calendar.length === 0) {
      return undefined;
    }

    let startIndex = calendar.findIndex((date) => date >= startDate);
    if (startIndex === -1) {
      startIndex = calendar.length - 1;
    }
    const targetIndex = Math.max(0, startIndex - tradingDays);
    return this.toCompactDate(calendar[targetIndex]);
  }

  /** 尝试归一日期为 'YYYY-MM-DD';不识别的格式返回 null(由调用方决定抛错或容忍)。 */
  private tryNormalizeDate(dateStr: string): string | null {
    const v = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      return v.slice(0, 10);
    }
    if (/^\d{8}$/.test(v)) {
      return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
    }
    return null;
  }

  /**
   * 严格归一【用户入参】日期为 'YYYY-MM-DD'。接受 'YYYY-MM-DD[ HH:mm...]'(截取
   * 日期部分)与 'YYYYMMDD'。Review P1-6:此前对'含横线但非补零'的串('2024-5-1')
   * 原样放行,在字典序比较下整窗丢失、进日期加法还会抛裸 RangeError ——
   * 非法格式直接抛 InvalidArgumentError(对外只抛 SdkError 契约)。
   *
   * Review R3-1:严格校验从 calcActualStartDateByCalendar 内部前移到
   * getKlineWithIndicators 入口 —— 此前 A 股日历路径的兜底 catch(本意只兜
   * getTradingCalendar 网络失败)会把它吞掉,'2024-5-1' 被切成 'NaNNaNNaN'
   * 带着垃圾起点打真实上游(HK/US 还会触发全量 refetch 双请求),最终才在窗口
   * 过滤处抛、错误信息展示 'NaNNaNNaN' 而非用户原值。现在非法入参【零上游请求】即拒。
   */
  private normalizeUserDate(dateStr: string): string {
    const normalized = this.tryNormalizeDate(dateStr);
    if (normalized === null) {
      throw new InvalidArgumentError(
        `日期格式应为 'YYYY-MM-DD' 或 'YYYYMMDD',得到 '${dateStr}'`,
        { argument: 'date', value: dateStr }
      );
    }
    return normalized;
  }

  /**
   * 宽松归一【上游行】日期(R3-1):格式匹配则归一为 'YYYY-MM-DD',不匹配返回
   * 原串照旧参与字典序比较 —— 对上游数据保持容忍:provider 个别行日期格式漂移
   * (如 '2024/02/29')最多导致该行窗口归属/排序局部错,绝不中断整个请求、
   * 更不把上游脏数据归咎为用户入参错误(严格版只用于用户入参,见 normalizeUserDate)。
   */
  private normalizeRowDate(dateStr: string): string {
    return this.tryNormalizeDate(dateStr) ?? dateStr;
  }

  private toCompactDate(dateStr: string): string {
    return dateStr.replace(/-/g, '');
  }

  async getKlineWithIndicators(
    symbol: string,
    options: KlineWithIndicatorsOptions = {}
  ): Promise<KlineWithIndicators<AnyHistoryKline>[]> {
    const { indicators = {} } = options;
    // R3-1:用户日期入参在【任何上游请求之前】严格校验并归一('YYYY-MM-DD'),
    // 非法格式立即 InvalidArgumentError(零上游请求);归一结果全程复用,
    // 后续比较中的上游行日期(allKlines[*].date)则走宽松 normalizeRowDate。
    const startNorm = options.startDate
      ? this.normalizeUserDate(options.startDate)
      : undefined;
    const endNorm = options.endDate
      ? this.normalizeUserDate(options.endDate)
      : undefined;
    const market = options.market ?? this.detectMarket(symbol);
    const { requiredBars, maxRecursiveLookback } =
      estimateIndicatorLookback(indicators);
    const ratioMap = { A: 1.5, HK: 1.46, US: 1.45 };
    let actualStartDate: string | undefined;

    // requiredBars 是【bar 数】,回推自然日/日历步长必须按周期换算 ——
    // 此前不看周期,周/月线 + startDate 的首次抓取只覆盖 requiredBars 个
    // 自然日(≈1/5、1/21 的 bar 数),必然不足 → F35 全量 refetch 每次都触发,
    // 首次抓取整个作废(get_kline_signals 的默认指标集含 MACD,默认档即中招)。
    const reqPeriod = options.period ?? 'daily';
    // 自然日/bar:周线 1 bar=7 天(+缓冲),月线 ≈31 天;日线维持按市场的经验比率
    const daysPerBar =
      reqPeriod === 'weekly' ? 7.5 : reqPeriod === 'monthly' ? 31.5 : ratioMap[market];
    // A 股日历(日粒度)步长:周线 1 bar ≈5 交易日,月线 ≈21 交易日
    const calendarStepPerBar =
      reqPeriod === 'weekly' ? 5 : reqPeriod === 'monthly' ? 21 : 1;

    if (startNorm) {
      if (market === 'A') {
        // 入口已归一,calcActualStartDateByCalendar 不会再因日期格式抛错,
        // catch 维持原语义:只兜 getTradingCalendar 的网络失败(R3-1)
        try {
          const calendar = await this.quoteService.getTradingCalendar();
          actualStartDate =
            this.calcActualStartDateByCalendar(
              startNorm,
              requiredBars * calendarStepPerBar,
              calendar
            ) ?? this.calcActualStartDate(startNorm, requiredBars, daysPerBar);
        } catch {
          actualStartDate = this.calcActualStartDate(
            startNorm,
            requiredBars,
            daysPerBar
          );
        }
      } else {
        actualStartDate = this.calcActualStartDate(
          startNorm,
          requiredBars,
          daysPerBar
        );
      }
    }

    const klineOptions = {
      period: options.period,
      adjust: options.adjust,
      startDate: actualStartDate,
      // provider 透传到东方财富的 beg/end 仅接受 YYYYMMDD，
      // 这里统一归一化，避免 'YYYY-MM-DD' 入参导致 HK/US 返回 0 条
      endDate: endNorm ? this.toCompactDate(endNorm) : undefined,
    };

    let allKlines: AnyHistoryKline[];
    switch (market) {
      case 'HK':
        allKlines = await this.klineService.getHKHistoryKline(symbol, klineOptions);
        break;
      case 'US':
        allKlines = await this.klineService.getUSHistoryKline(symbol, klineOptions);
        break;
      default:
        allKlines = await this.klineService.getHistoryKline(symbol, klineOptions);
    }

    // F35:短上市标的双请求短路。
    // 原逻辑只要 `allKlines.length < requiredBars` 就无条件全量 refetch,但若首次
    // 返回的第一根 K 线日期已明显【晚于】请求的 actualStartDate,说明上游在
    // actualStartDate 之前本就没有更多历史(标的上市晚),refetch 只会拿回
    // 完全相同的数据 —— 每次调用白白双倍上游流量。
    //
    // Review P1-4 → R3-14:容差按周期公式化 ——
    // - 日线基础容差 30 天:覆盖 A 股黄金周/春节(10-11 天)与多数个股停牌;
    //   >30 天的长期停牌仍可能被误判(代价是窗口头部指标为 null),属
    //   "流量换正确性"的已记录权衡。误判方向是宁可多 refetch。
    // - 周/月线的标签在期末(周线首根最多滞后起点 7 天、月线最多 31 天),
    //   P1-4 曾因"固定容差必误判"一律保守 refetch;R3-14 把期末标签的最大
    //   滞后并入公式(30 + 7/31),恢复 F35 短路对周/月线生效 —— 真 IPO
    //   (首根晚于容差)不再每次双请求,误判方向仍是多 refetch。
    const toleranceDays =
      30 + (reqPeriod === 'weekly' ? 7 : reqPeriod === 'monthly' ? 31 : 0);
    const mayHaveEarlierData =
      allKlines.length === 0 ||
      actualStartDate === undefined ||
      this.normalizeRowDate(allKlines[0].date) <=
        addDays(this.normalizeRowDate(actualStartDate), toleranceDays);

    let refetchedFullHistory = false;
    if (startNorm && allKlines.length < requiredBars && mayHaveEarlierData) {
      refetchedFullHistory = true;
      switch (market) {
        case 'HK':
          allKlines = await this.klineService.getHKHistoryKline(symbol, {
            ...klineOptions,
            startDate: undefined,
          });
          break;
        case 'US':
          allKlines = await this.klineService.getUSHistoryKline(symbol, {
            ...klineOptions,
            startDate: undefined,
          });
          break;
        default:
          allKlines = await this.klineService.getHistoryKline(symbol, {
            ...klineOptions,
            startDate: undefined,
          });
      }
    }

    // F37:先裁剪后算指标(仅全量 refetch 后)。
    // 原逻辑对全量历史先 addIndicators 算完全部指标,再逐 bar `new Date()` 过滤,
    // 窄窗口查询时 >99% 的计算结果直接被丢弃(refetch 全量历史时尤甚)。
    //
    // 终审修复(Review Finding 1):切片只对【全量 refetch】后的历史做 ——
    // 常规路径 fetched 本就从 actualStartDate 起(≈ 窗口 + lookback),切片是
    // 近似 no-op 的"优化",却会在 ratio 超额 1-2 根时削掉递归型指标
    // (KDJ/RSI/ATR/DMI 的平滑状态)的暖机历史,产生 round(2) 可见的数值漂移
    // (实测 |Δd| 最大 9.4)。不切片即与旧实现逐值一致。
    // refetch 路径保留切片的性能收益,但 lookback 下限提到 RECURSIVE_WARMUP:
    // Wilder-14 的状态差衰减 (13/14)^486 ≈ 2e-16、KDJ(1/3 平滑)更快,
    // 2 位舍入下与全量计算逐值一致;OBV 是全量累计型(基数取决于序列起点),
    // 启用时跳过切片以保持与旧实现(全量计算)一致。
    // 最终过滤统一为归一化日期字符串比较(ISO 字典序即时间序),
    // 消除逐 bar 的 new Date() 分配。
    if (startNorm) {
      const windowStartIdx = allKlines.findIndex(
        (kline) => this.normalizeRowDate(kline.date) >= startNorm
      );
      if (windowStartIdx === -1) {
        // 所有 K 线都早于 startDate → 窗口为空,任何指标计算都会被丢弃,直接短路
        return [];
      }

      let toCompute = allKlines;
      let windowStartInCompute = windowStartIdx;
      // 累计型指标(OBV)依赖序列起点,切片会改变绝对值 —— 由 registry 的
      // cumulative 标记驱动(P2-7),新增累计型指标时无需改这里
      if (refetchedFullHistory && !hasCumulativeIndicator(indicators)) {
        // refetch 触发条件含 length < requiredBars,requiredBars > 0 即必有指标。
        // R3-12:暖机下限只对【递归型】组合生效(P2-7 的比例放大基数改为
        // maxRecursiveLookback);纯窗口型组合(maxRecursiveLookback=0)
        // requiredBars 即精确,无需 500/15× 放大。
        const lookback =
          maxRecursiveLookback > 0
            ? Math.max(
                requiredBars,
                RECURSIVE_WARMUP,
                WARMUP_LOOKBACK_MULTIPLIER * maxRecursiveLookback
              )
            : requiredBars;
        const sliceStart = Math.max(0, windowStartIdx - lookback);
        toCompute = allKlines.slice(sliceStart);
        windowStartInCompute = windowStartIdx - sliceStart;
      }
      const leadingBars =
        Number.isInteger(options.leadingBars) && options.leadingBars! > 0
          ? options.leadingBars!
          : 0;
      if (leadingBars > 0) {
        // 信号锚点路径:窗口前按【下标】多保留 N 根(对任意停牌长度精确),
        // 尾部仍按 endNorm 过滤。行按时间升序,窗口起点之后无需再比 startNorm。
        const computed = addIndicators(toCompute, indicators);
        const outStart = Math.max(0, windowStartInCompute - leadingBars);
        const windowed = computed.slice(outStart);
        return endNorm === undefined
          ? windowed
          : windowed.filter((item) => this.normalizeRowDate(item.date) <= endNorm);
      }
      return addIndicators(toCompute, indicators).filter((item) => {
        const date = this.normalizeRowDate(item.date);
        return date >= startNorm && (endNorm === undefined || date <= endNorm);
      });
    }

    return addIndicators(allKlines, indicators);
  }

  /**
   * 识别一只标的的技术指标信号（金叉/死叉、超买/超卖、突破、反转）。
   *
   * 内部串联两步：先 `getKlineWithIndicators` 取带指标 K 线，再 `calcSignals`
   * 识别 14 种信号。指标周期与信号周期一致（MA 用 `maFast`/`maSlow`；RSI 固定
   * period=6，与 addIndicators 默认 rsi6 对齐），避免 calcSignals 因周期不匹配
   * 静默零信号或抛错。
   */
  async getKlineSignals(
    symbol: string,
    options: KlineSignalsOptions = {}
  ): Promise<KlineSignal[]> {
    const maFast = options.maFast ?? 5;
    const maSlow = options.maSlow ?? 20;
    if (
      !Number.isInteger(maFast) ||
      !Number.isInteger(maSlow) ||
      maFast <= 0 ||
      maSlow <= 0
    ) {
      throw new InvalidArgumentError(
        `maFast / maSlow 必须为正整数，得到 fast=${maFast} slow=${maSlow}`,
        { maFast, maSlow }
      );
    }
    if (maFast >= maSlow) {
      throw new InvalidArgumentError(
        `maFast(${maFast}) 必须小于 maSlow(${maSlow})，否则无法定义金叉/死叉`,
        { maFast, maSlow }
      );
    }

    // 边界修复：calcSignals 从 i=1 起逐日比对前后两根 K 线。若窗口按 date>=startDate
    // 裁齐，窗口首日失去前一根、当天的金叉/死叉永远无法产出 —— 用 leadingBars:1
    // 让 getKlineWithIndicators 按【下标】在窗口前多保留一根已算好指标的锚点 bar
    // （对任意长度的停牌缺口精确成立），信号算完再按用户 startDate 过滤掉锚点上的信号。
    const startNorm = options.startDate
      ? this.normalizeUserDate(options.startDate)
      : undefined;

    const klines = await this.getKlineWithIndicators(symbol, {
      market: options.market,
      period: options.period,
      adjust: options.adjust,
      startDate: options.startDate,
      endDate: options.endDate,
      leadingBars: startNorm ? 1 : 0,
      // 指标周期须与下方 calcSignals 的信号周期严格对齐（rsi6 是 calcSignals 默认命中键）
      indicators: {
        ma: { periods: [maFast, maSlow] },
        macd: true,
        kdj: true,
        rsi: { periods: [6] },
        boll: true,
        sar: true,
      },
    });

    const signals = calcSignals(klines, {
      ma: { fast: maFast, slow: maSlow },
      macd: true,
      kdj: {},
      rsi: { period: 6 },
      boll: true,
      sar: true,
    });

    // 用信号所在 K 线补全 date/close（signal.index 恒落在 klines 范围内）
    const enriched: KlineSignal[] = signals.map((s) => {
      const k = klines[s.index];
      return {
        type: s.type,
        date: k?.date ?? '',
        timestamp: s.at,
        close: k?.close ?? null,
        ...(s.detail !== undefined ? { detail: s.detail } : {}),
      };
    });

    // 锚点 bar 上的信号（早于用户 startDate）只用于给窗口首日提供前驱，不返回
    return startNorm
      ? enriched.filter((sig) => this.normalizeRowDate(sig.date) >= startNorm)
      : enriched;
  }
}
