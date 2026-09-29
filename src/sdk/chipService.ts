/**
 * 筹码分布 Service:拉取对应市场日 K 线(含暖机段)→ 本地计算 → 裁剪返回。
 * 计算本体在 `src/indicators/chip.ts`(纯函数,零网络),本 service 只做编排。
 */
import {
  calcChipDistribution,
  type ChipDistributionItem,
  type ChipDistributionOptions,
} from '../indicators';
import type { AnyHistoryKline } from '../types';
import { InvalidArgumentError } from '../core/errors';
import { addDays, todayInTz, MARKET_TZ, type MarketTz } from '../core/time';
import type { KlineService } from './klineService';

/** `chips.cn / hk / us` 的请求参数 */
export interface ChipDistributionRequestOptions
  extends Pick<ChipDistributionOptions, 'range' | 'includeHistogram' | 'decimals'> {
  /**
   * 返回最近多少个交易日的筹码分布序列。
   * @default 90
   */
  days?: number;
  /**
   * 复权方式(与对应市场 `kline.*` 一致,默认 `'qfq'` 前复权)。
   * 分布数值随复权口径变化;需对齐 akshare `stock_cyq_em` 默认输出时传 `''`。
   * @default 'qfq'
   */
  adjust?: '' | 'qfq' | 'hfq';
}

/**
 * K 线取数天数估算比例:交易日 → 自然日 ≈ 365/243 ≈ 1.5,与
 * indicatorService 的 A 股口径一致(对 HK/US 略宽松,多取几根无害);
 * 长假 / 停牌导致的不足由「不足则全量 refetch」兜底。
 */
const NATURAL_DAYS_RATIO = 1.5;

/**
 * F35 同款 IPO 短路容差:首根 K 线日期已明显晚于请求起点(上市晚),
 * 说明上游本就没有更早历史,refetch 只会拿回相同数据,跳过。
 */
const REFETCH_TOLERANCE_DAYS = 30;

export class ChipService {
  constructor(
    private readonly klineService: Pick<
      KlineService,
      'getEastmoneyHistoryKline' | 'getHKHistoryKline' | 'getUSHistoryKline'
    >
  ) {}

  /**
   * A 股筹码分布(基于日 K 线 + 换手率本地计算,东财 CYQ 算法)。
   *
   * 只用东方财富日 K:腾讯、新浪备用源没有换手率,东财失败时直接抛出其错误,
   * 不受 `klineFallback` 影响。
   *
   * @param symbol 股票代码,如 `'600519'` / `'sh600519'`
   * @param options 见 {@link ChipDistributionRequestOptions}
   */
  getChipDistribution(
    symbol: string,
    options: ChipDistributionRequestOptions = {}
  ): Promise<ChipDistributionItem[]> {
    return this.compute('A', symbol, options);
  }

  /**
   * 港股筹码分布(数据源:东财港股日 K 线,含换手率)。
   *
   * @param symbol 港股代码,如 `'00700'` / `'hk00700'`
   */
  getHKChipDistribution(
    symbol: string,
    options: ChipDistributionRequestOptions = {}
  ): Promise<ChipDistributionItem[]> {
    return this.compute('HK', symbol, options);
  }

  /**
   * 美股筹码分布(数据源:东财美股日 K 线,含换手率)。
   *
   * @param symbol 美股代码,格式 `{market}.{ticker}`,如 `'105.AAPL'`
   */
  getUSChipDistribution(
    symbol: string,
    options: ChipDistributionRequestOptions = {}
  ): Promise<ChipDistributionItem[]> {
    return this.compute('US', symbol, options);
  }

  private async compute(
    market: 'A' | 'HK' | 'US',
    symbol: string,
    options: ChipDistributionRequestOptions
  ): Promise<ChipDistributionItem[]> {
    const { days = 90, range = 120, adjust, includeHistogram, decimals } = options;
    if (!Number.isInteger(days) || days < 1) {
      throw new InvalidArgumentError(
        `days 应为正整数,得到 ${JSON.stringify(days)}`,
        { argument: 'days', value: days }
      );
    }
    if (!Number.isInteger(range) || range < 0) {
      throw new InvalidArgumentError(
        `range 应为非负整数(0 = 全量累计),得到 ${JSON.stringify(range)}`,
        { argument: 'range', value: range }
      );
    }

    const klines = await this.fetchDailyKlines(market, symbol, adjust, days, range);
    if (klines.length === 0) return [];

    return calcChipDistribution(klines, {
      range,
      tail: days,
      includeHistogram,
      decimals,
    });
  }

  /**
   * 拉取日 K 线:
   * - `range > 0`:只需尾部 `days + range` 根,按自然日比例估算起始日期;
   *   返回不足且上游可能有更早数据时全量 refetch(F35 同款 IPO 短路);
   * - `range = 0`(全量累计口径):分布依赖完整历史,直接全量拉取。
   */
  private async fetchDailyKlines(
    market: 'A' | 'HK' | 'US',
    symbol: string,
    adjust: '' | 'qfq' | 'hfq' | undefined,
    days: number,
    range: number
  ): Promise<AnyHistoryKline[]> {
    const fetch = (startDate?: string): Promise<AnyHistoryKline[]> => {
      const opts = { period: 'daily' as const, adjust, startDate };
      switch (market) {
        case 'HK':
          return this.klineService.getHKHistoryKline(symbol, opts);
        case 'US':
          return this.klineService.getUSHistoryKline(symbol, opts);
        default:
          return this.klineService.getEastmoneyHistoryKline(symbol, opts);
      }
    };

    if (range === 0) {
      return fetch(undefined);
    }

    const tzMap: Record<'A' | 'HK' | 'US', MarketTz> = {
      A: MARKET_TZ.CN,
      HK: MARKET_TZ.HK,
      US: MARKET_TZ.US,
    };
    const needed = days + range;
    const today = todayInTz(tzMap[market]);
    const estStart = addDays(today, -Math.ceil(needed * NATURAL_DAYS_RATIO));
    const estStartCompact = estStart.replace(/-/g, '');

    let klines = await fetch(estStartCompact);
    // 首根日期仍贴着估算起点 → 更早历史可能存在,不足额时值得全量 refetch;
    // 首根明显晚于起点(上市晚)→ 上游没有更早数据,refetch 无意义。
    // 已知边界(indicatorService F35 同款"流量换正确性"权衡):跨估算起点、
    // 超过 REFETCH_TOLERANCE_DAYS 的长期停牌会被误判为"上市晚"而跳过
    // refetch,此时头部输出行以短于 range 的窗口计算,数值与全量数据下略有差异
    const mayHaveEarlierData =
      klines.length === 0 ||
      klines[0].date <= addDays(estStart, REFETCH_TOLERANCE_DAYS);
    if (klines.length < needed && mayHaveEarlierData) {
      klines = await fetch(undefined);
    }
    return klines;
  }
}
