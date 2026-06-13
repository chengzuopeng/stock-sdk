import { addIndicators, estimateIndicatorLookback, type IndicatorOptions, type KlineWithIndicators } from '../indicators';
import type { AnyHistoryKline } from '../types';
import type { KlineService } from './klineService';
import type { QuoteService } from './quoteService';
import { normalizeSymbol } from '../symbols';

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
    // 复用统一符号模型,避免与 normalizeSymbol 双轨漂移
    // (如 '0700' 4 位港股、'hk700'、'116.00700'、'00700.HK' 都能正确归类到 HK)
    try {
      const ns = normalizeSymbol(symbol);
      return ns.market === 'HK' ? 'HK' : ns.market === 'US' ? 'US' : 'A';
    } catch {
      return 'A';
    }
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

  private calcActualStartDateByCalendar(
    startDate: string,
    tradingDays: number,
    calendar: string[]
  ): string | undefined {
    if (!calendar || calendar.length === 0) {
      return undefined;
    }

    const normalized = this.normalizeDate(startDate);
    let startIndex = calendar.findIndex((date) => date >= normalized);
    if (startIndex === -1) {
      startIndex = calendar.length - 1;
    }
    const targetIndex = Math.max(0, startIndex - tradingDays);
    return this.toCompactDate(calendar[targetIndex]);
  }

  private normalizeDate(dateStr: string): string {
    if (dateStr.includes('-')) {
      return dateStr;
    }
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  }

  private toCompactDate(dateStr: string): string {
    return dateStr.replace(/-/g, '');
  }

  async getKlineWithIndicators(
    symbol: string,
    options: KlineWithIndicatorsOptions = {}
  ): Promise<KlineWithIndicators<AnyHistoryKline>[]> {
    const { startDate, endDate, indicators = {} } = options;
    const market = options.market ?? this.detectMarket(symbol);
    const { requiredBars } = estimateIndicatorLookback(indicators);
    const ratioMap = { A: 1.5, HK: 1.46, US: 1.45 };
    let actualStartDate: string | undefined;

    if (startDate) {
      if (market === 'A') {
        try {
          const calendar = await this.quoteService.getTradingCalendar();
          actualStartDate =
            this.calcActualStartDateByCalendar(startDate, requiredBars, calendar) ??
            this.calcActualStartDate(startDate, requiredBars, ratioMap[market]);
        } catch {
          actualStartDate = this.calcActualStartDate(
            startDate,
            requiredBars,
            ratioMap[market]
          );
        }
      } else {
        actualStartDate = this.calcActualStartDate(
          startDate,
          requiredBars,
          ratioMap[market]
        );
      }
    }

    const klineOptions = {
      period: options.period,
      adjust: options.adjust,
      startDate: actualStartDate,
      // provider 透传到东方财富的 beg/end 仅接受 YYYYMMDD，
      // 这里统一归一化，避免 'YYYY-MM-DD' 入参导致 HK/US 返回 0 条
      endDate: options.endDate ? this.toCompactDate(options.endDate) : undefined,
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
    // 返回的第一根 K 线日期已【晚于】请求的 actualStartDate,说明上游在
    // actualStartDate 之前本就没有更多历史(标的上市晚),refetch 只会拿回
    // 完全相同的数据 —— 每次调用白白双倍上游流量。
    // 仅当返回为空、或首根 <= actualStartDate(数据可能确实被 beg 截断)时
    // 才保留原有的全量 refetch。日期统一归一成 'YYYY-MM-DD' 后按字符串比较
    // (allKlines[0].date 是 'YYYY-MM-DD',actualStartDate 是 'YYYYMMDD')。
    const mayHaveEarlierData =
      allKlines.length === 0 ||
      actualStartDate === undefined ||
      this.normalizeDate(allKlines[0].date) <= this.normalizeDate(actualStartDate);

    if (startDate && allKlines.length < requiredBars && mayHaveEarlierData) {
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

    // F37:先裁剪后算指标。
    // 原逻辑对全量历史先 addIndicators 算完全部指标,再逐 bar `new Date()` 过滤,
    // 窄窗口查询时 >99% 的计算结果直接被丢弃(refetch 全量历史时尤甚)。
    // 现在先按日期字符串定位窗口首根,向前保留 requiredBars 根 lookback 再计算:
    // requiredBars 本就是 estimateIndicatorLookback 给出的"指标需要的前置根数"
    // (EMA 类的 1.5x buffer 已含余量),窗口内指标值与全量计算一致
    // (见 test/unit/sdk/perf-request.test.ts 的全量 vs 切片对拍)。
    // 最终过滤同样改为归一化日期字符串比较(ISO 'YYYY-MM-DD' 字典序即时间序),
    // 消除逐 bar 的 new Date() 分配。
    if (startDate) {
      const startNorm = this.normalizeDate(startDate);
      const endNorm = endDate ? this.normalizeDate(endDate) : undefined;

      const windowStartIdx = allKlines.findIndex(
        (kline) => this.normalizeDate(kline.date) >= startNorm
      );
      if (windowStartIdx === -1) {
        // 所有 K 线都早于 startDate → 窗口为空,任何指标计算都会被丢弃,直接短路
        return [];
      }

      const sliced = allKlines.slice(Math.max(0, windowStartIdx - requiredBars));
      return addIndicators(sliced, indicators).filter((item) => {
        const date = this.normalizeDate(item.date);
        return date >= startNorm && (endNorm === undefined || date <= endNorm);
      });
    }

    return addIndicators(allKlines, indicators);
  }
}
