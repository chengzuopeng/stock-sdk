import { eastmoney, sina, tencent } from '../providers';
import {
  EM_POLICY_RETRY,
  EM_PROBE_ONCE,
} from '../providers/eastmoney/aShareKline';
import {
  assertAdjustType,
  assertKlinePeriod,
  assertMinutePeriod,
  type RequestClient,
} from '../core';
import { SourceRouter, type RouteOptions, type SourceAdapter } from '../router';
import type {
  HistoryKline,
  MinuteTimeline,
  MinuteKline,
  HKHistoryKline,
  HKMinuteKline,
  HKMinuteTimeline,
  USHistoryKline,
  USMinuteKline,
  USMinuteTimeline,
} from '../types';
import { BaseService } from './baseService';

export interface HistoryKlineInput {
  symbol: string;
  options: eastmoney.HistoryKlineOptions;
}

export interface MinuteKlineInput {
  symbol: string;
  options: eastmoney.MinuteKlineOptions;
}

export interface HKHistoryKlineInput {
  symbol: string;
  options: eastmoney.HKKlineOptions;
}

export interface USHistoryKlineInput {
  symbol: string;
  options: eastmoney.USKlineOptions;
}

const EASTMONEY_KLINE_FIELDS: ReadonlySet<string> = new Set([
  'open',
  'close',
  'high',
  'low',
  'volume',
  'amount',
  'amplitude',
  'changePercent',
  'change',
  'turnoverRate',
]);

const BASIC_KLINE_FIELDS: ReadonlySet<string> = new Set([
  'open',
  'close',
  'high',
  'low',
  'volume',
  'amplitude',
  'changePercent',
  'change',
]);

/**
 * 创建 A 股历史 / 分钟 K 线的标准三源适配器（东财 / 腾讯 / 新浪）。
 * 可供 `StockSDK` 与 `StockNodeSDK` 共享注册到各自的 `SourceRouter`。
 */
export function createUniversalCnKlineAdapters(
  client: RequestClient
): SourceAdapter<unknown, unknown>[] {
  const emHistory: SourceAdapter<HistoryKlineInput, HistoryKline[]> = {
    id: 'eastmoney:kline.cn.history',
    capability: 'kline.cn.history',
    provider: 'eastmoney',
    priority: 10,
    providedFields: EASTMONEY_KLINE_FIELDS,
    supports: () => true,
    fetch: (input, ctx) =>
      eastmoney.getHistoryKline(
        client,
        input.symbol,
        input.options,
        ctx.hasFallback ? EM_PROBE_ONCE : EM_POLICY_RETRY
      ),
  };

  const tencentHistory: SourceAdapter<HistoryKlineInput, HistoryKline[]> = {
    id: 'tencent:kline.cn.history',
    capability: 'kline.cn.history',
    provider: 'tencent',
    priority: 20,
    providedFields: BASIC_KLINE_FIELDS,
    supports: () => true,
    fetch: (input) =>
      tencent.getTencentHistoryKline(client, input.symbol, input.options),
  };

  const sinaHistory: SourceAdapter<HistoryKlineInput, HistoryKline[]> = {
    id: 'sina:kline.cn.history',
    capability: 'kline.cn.history',
    provider: 'sina',
    priority: 30,
    providedFields: BASIC_KLINE_FIELDS,
    // 新浪日 K 仅支持不复权；在严格能力模式（stock-node-sdk 默认）下，
    // 请求 qfq/hfq 时自动跳过新浪，防止静默拿不复权冒充复权数据。
    supports: (input) => (input.options.adjust ?? 'qfq') === '',
    fetch: (input) =>
      sina.getSinaHistoryKline(client, input.symbol, input.options),
  };

  const emMinute: SourceAdapter<MinuteKlineInput, MinuteTimeline[] | MinuteKline[]> = {
    id: 'eastmoney:kline.cn.minute',
    capability: 'kline.cn.minute',
    provider: 'eastmoney',
    priority: 10,
    providedFields: EASTMONEY_KLINE_FIELDS,
    supports: () => true,
    fetch: (input, ctx) =>
      eastmoney.getMinuteKline(
        client,
        input.symbol,
        input.options,
        ctx.hasFallback ? EM_PROBE_ONCE : EM_POLICY_RETRY
      ),
  };

  const tencentMinute: SourceAdapter<MinuteKlineInput, MinuteKline[]> = {
    id: 'tencent:kline.cn.minute',
    capability: 'kline.cn.minute',
    provider: 'tencent',
    priority: 20,
    providedFields: BASIC_KLINE_FIELDS,
    supports: (input) => (input.options.period ?? '1') !== '1',
    fetch: (input) => {
      const period = (input.options.period ?? '5') as '5' | '15' | '30' | '60';
      return tencent.getTencentMinuteKline(client, input.symbol, {
        period,
        startDate: input.options.startDate,
        endDate: input.options.endDate,
      });
    },
  };

  const sinaMinute: SourceAdapter<MinuteKlineInput, MinuteKline[]> = {
    id: 'sina:kline.cn.minute',
    capability: 'kline.cn.minute',
    provider: 'sina',
    priority: 30,
    providedFields: BASIC_KLINE_FIELDS,
    supports: (input) => (input.options.period ?? '1') !== '1',
    fetch: (input) => {
      const period = (input.options.period ?? '5') as '5' | '15' | '30' | '60';
      return sina.getSinaMinuteKline(client, input.symbol, {
        period,
        startDate: input.options.startDate,
        endDate: input.options.endDate,
      });
    },
  };

  return [
    emHistory as SourceAdapter<unknown, unknown>,
    tencentHistory as SourceAdapter<unknown, unknown>,
    sinaHistory as SourceAdapter<unknown, unknown>,
    emMinute as SourceAdapter<unknown, unknown>,
    tencentMinute as SourceAdapter<unknown, unknown>,
    sinaMinute as SourceAdapter<unknown, unknown>,
  ];
}

/**
 * 创建港股 / 美股历史 K 线基础东方财富适配器（供双端 `StockSDK` 与 `StockNodeSDK` 共用底座）。
 */
export function createUniversalForeignKlineAdapters(
  client: RequestClient
): SourceAdapter<unknown, unknown>[] {
  const hkEastmoney: SourceAdapter<HKHistoryKlineInput, HKHistoryKline[]> = {
    id: 'eastmoney:kline.hk.history',
    capability: 'kline.hk.history',
    provider: 'eastmoney',
    priority: 10,
    providedFields: EASTMONEY_KLINE_FIELDS,
    supports: () => true,
    fetch: (input) => eastmoney.getHKHistoryKline(client, input.symbol, input.options),
  };

  const usEastmoney: SourceAdapter<USHistoryKlineInput, USHistoryKline[]> = {
    id: 'eastmoney:kline.us.history',
    capability: 'kline.us.history',
    provider: 'eastmoney',
    priority: 10,
    providedFields: EASTMONEY_KLINE_FIELDS,
    supports: () => true,
    fetch: (input) => eastmoney.getUSHistoryKline(client, input.symbol, input.options),
  };

  return [
    hkEastmoney as SourceAdapter<unknown, unknown>,
    usEastmoney as SourceAdapter<unknown, unknown>,
  ];
}

export class KlineService extends BaseService {
  private readonly router: SourceRouter;

  /**
   * @param client - 请求客户端
   * @param source - A 股 K 线的数据源策略（由 SDK 构造参数 `klineFallback` 透传）
   * @param router - 可选注入外部共享 `SourceRouter`（供 `StockNodeSDK` 扩展多源）
   */
  constructor(
    client: RequestClient,
    private readonly source: eastmoney.KlineSourceOptions = {},
    router?: SourceRouter
  ) {
    super(client);
    if (router) {
      this.router = router;
    } else {
      // 双端默认场景（StockSDK）：不开启冷却沉底（cooldownMs: 0），保持东财为主源的既有语义
      this.router = new SourceRouter({ cooldownMs: 0 });
      this.router.registerAll(createUniversalCnKlineAdapters(client));
      this.router.registerAll(createUniversalForeignKlineAdapters(client));
    }
  }

  async getHistoryKline(
    symbol: string,
    options: eastmoney.HistoryKlineOptions = {},
    routeOptions?: RouteOptions
  ): Promise<HistoryKline[]> {
    const period = options.period ?? 'daily';
    const adjust = options.adjust ?? 'qfq';
    assertKlinePeriod(period);
    assertAdjustType(adjust);

    const useFallback = this.source.fallback !== false;
    const strictCapabilities =
      routeOptions?.strictCapabilities ?? this.source.strictCapabilities ?? false;
    return this.router.execute<HistoryKlineInput, HistoryKline[]>(
      'kline.cn.history',
      { symbol, options },
      {
        ...routeOptions,
        source: routeOptions?.source ?? (useFallback ? undefined : 'eastmoney'),
        strictCapabilities,
      }
    );
  }

  /**
   * 获取带换手率要求的 A 股历史 K 线（供筹码分布 `chips.cn` 使用）。
   * 通过 `requiredFields: ['turnoverRate']` 声明式筛选具备换手率字段的源，
   * 避免切到缺少换手率的备用源导致筹码分布全为 `null`。
   */
  async getEastmoneyHistoryKline(
    symbol: string,
    options: eastmoney.HistoryKlineOptions = {}
  ): Promise<HistoryKline[]> {
    const period = options.period ?? 'daily';
    const adjust = options.adjust ?? 'qfq';
    assertKlinePeriod(period);
    assertAdjustType(adjust);

    return this.router.execute<HistoryKlineInput, HistoryKline[]>(
      'kline.cn.history',
      { symbol, options },
      {
        requiredFields: ['turnoverRate'],
        source: this.source.fallback === false ? 'eastmoney' : undefined,
      }
    );
  }

  async getMinuteKline(
    symbol: string,
    options: eastmoney.MinuteKlineOptions = {},
    routeOptions?: RouteOptions
  ): Promise<MinuteTimeline[] | MinuteKline[]> {
    const period = options.period ?? '1';
    assertMinutePeriod(period);
    if (period !== '1') {
      assertAdjustType(options.adjust ?? 'qfq');
    }

    const useFallback = this.source.fallback !== false;
    return this.router.execute<MinuteKlineInput, MinuteTimeline[] | MinuteKline[]>(
      'kline.cn.minute',
      { symbol, options },
      {
        ...routeOptions,
        source: routeOptions?.source ?? (useFallback ? undefined : 'eastmoney'),
        strictCapabilities: true,
      }
    );
  }

  async getHKHistoryKline(
    symbol: string,
    options: eastmoney.HKKlineOptions = {},
    routeOptions?: RouteOptions
  ): Promise<HKHistoryKline[]> {
    assertKlinePeriod(options.period ?? 'daily');
    assertAdjustType(options.adjust ?? 'qfq');

    const useFallback = this.source.fallback !== false;
    const strictCapabilities =
      routeOptions?.strictCapabilities ?? this.source.strictCapabilities ?? false;
    return this.router.execute<HKHistoryKlineInput, HKHistoryKline[]>(
      'kline.hk.history',
      { symbol, options },
      {
        ...routeOptions,
        source: routeOptions?.source ?? (useFallback ? undefined : 'eastmoney'),
        strictCapabilities,
      }
    );
  }

  getHKMinuteKline(
    symbol: string,
    options?: eastmoney.HKMinuteKlineOptions
  ): Promise<HKMinuteTimeline[] | HKMinuteKline[]> {
    return eastmoney.getHKMinuteKline(this.client, symbol, options);
  }

  async getUSHistoryKline(
    symbol: string,
    options: eastmoney.USKlineOptions = {},
    routeOptions?: RouteOptions
  ): Promise<USHistoryKline[]> {
    assertKlinePeriod(options.period ?? 'daily');
    assertAdjustType(options.adjust ?? 'qfq');

    const useFallback = this.source.fallback !== false;
    const strictCapabilities =
      routeOptions?.strictCapabilities ?? this.source.strictCapabilities ?? false;
    return this.router.execute<USHistoryKlineInput, USHistoryKline[]>(
      'kline.us.history',
      { symbol, options },
      {
        ...routeOptions,
        source: routeOptions?.source ?? (useFallback ? undefined : 'eastmoney'),
        strictCapabilities,
      }
    );
  }

  getUSMinuteKline(
    symbol: string,
    options?: eastmoney.USMinuteKlineOptions
  ): Promise<USMinuteTimeline[] | USMinuteKline[]> {
    return eastmoney.getUSMinuteKline(this.client, symbol, options);
  }
}
