import { createCacheKey, type CacheStore } from '@stock-sdk/core/cache';
import type {
  BalanceSheet,
  CashFlowStatement,
  ConvertibleBondItem,
  CorporateQueryOptions,
  FinancialIndicator,
  FinancialQueryOptions,
  IncomeStatement,
  MarketNewsFlash,
  NewsFlashOptions,
  PerformanceExpress,
  PerformanceForecast,
  PerformanceListOptions,
  StockAnnouncement,
  AnnouncementQueryOptions,
  ShareholderCount,
  TopShareholder,
} from '@stock-sdk/core/types';
import type {
  CapabilityId,
  ProviderId,
  RouteOptions,
  RouteTrace,
  SourceRouter,
} from '@stock-sdk/core/router';

export interface NodeCacheConfig {
  store: CacheStore;
  /** 财务类默认 TTL（毫秒），默认 6 小时 */
  financialTTL?: number;
  /** 公司治理/可转债默认 TTL（毫秒），默认 6 小时 */
  corporateTTL?: number;
}

const DEFAULT_FINANCIAL_TTL = 6 * 3_600_000;
const DEFAULT_CORPORATE_TTL = 6 * 3_600_000;

interface RoutedValue<T> {
  data: T;
  trace?: RouteTrace;
}

const inflightByRouter = new WeakMap<SourceRouter, Map<string, Promise<RoutedValue<readonly unknown[]>>>>();

async function withOptionalCache<T extends readonly unknown[]>(
  router: SourceRouter,
  capability: CapabilityId,
  cache: NodeCacheConfig | undefined,
  category: 'financial' | 'corporate',
  keyParts: readonly unknown[],
  route: RouteOptions | undefined,
  fetcher: (onTrace?: (trace: RouteTrace) => void) => Promise<T>
): Promise<T> {
  // 单次取消或字段要求的查询直接取数，独立于其他调用方。
  if (!cache || route?.signal || route?.requiredFields?.length) {
    return fetcher();
  }
  const ttl =
    category === 'financial'
      ? (cache.financialTTL ?? DEFAULT_FINANCIAL_TTL)
      : (cache.corporateTTL ?? DEFAULT_CORPORATE_TTL);
  if (ttl <= 0) return fetcher();

  const key = createCacheKey(
    `node:${category}:v2`,
    capability,
    router.getCacheScope(capability, route),
    ...keyParts.map((v) => String(v ?? ''))
  );
  const cached = await cache.store.get(key);
  if (Array.isArray(cached)) {
    const firstItem = cached[0] as { source?: ProviderId } | undefined;
    const provider = firstItem?.source;
    router.notifyCachedRoute({
      capability,
      selectedProvider: provider,
      selectedAdapterId: provider ? `${provider}:${capability}#cache` : `${capability}#cache`,
      degraded: false,
      attempts: provider
        ? [{ provider, adapterId: `${provider}:${capability}#cache`, durationMs: 0, status: 'success' }]
        : [],
      totalDurationMs: 0,
    });
    return cached as unknown as T;
  }

  let inflight = inflightByRouter.get(router);
  if (!inflight) {
    inflight = new Map();
    inflightByRouter.set(router, inflight);
  }
  const pending = inflight.get(key);
  if (pending) {
    const result = (await pending) as RoutedValue<T>;
    if (result.trace) router.notifyCachedRoute(result.trace);
    return result.data;
  }

  const job = (async () => {
    let trace: RouteTrace | undefined;
    const data = await fetcher((completed) => {
      trace = completed;
    });
    // 非空的首选源结果才适合长时间复用。
    if (data.length > 0 && trace && !trace.degraded) {
      await cache.store.set(key, data, ttl);
    }
    return { data, trace };
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, job);
  return (await job).data;
}

/**
 * 财务与基本面服务（基于 SourceRouter 调度 + 可选持久化缓存）。
 */
export class FinancialService {
  constructor(
    private readonly router: SourceRouter,
    private readonly cache?: NodeCacheConfig
  ) {}

  indicators(
    symbol: string,
    options: FinancialQueryOptions = {},
    route?: RouteOptions
  ): Promise<FinancialIndicator[]> {
    const run = (onTrace?: (trace: RouteTrace) => void) =>
      this.router.execute<{ symbol: string; options: FinancialQueryOptions }, FinancialIndicator[]>(
        'financial.indicators',
        { symbol, options },
        route,
        onTrace
      );
    return withOptionalCache(
      this.router,
      'financial.indicators',
      this.cache,
      'financial',
      ['indicators', symbol, options.page ?? 1, options.pageSize ?? 20],
      route,
      run
    );
  }

  income(
    symbol: string,
    options: FinancialQueryOptions = {},
    route?: RouteOptions
  ): Promise<IncomeStatement[]> {
    const run = (onTrace?: (trace: RouteTrace) => void) =>
      this.router.execute<{ symbol: string; options: FinancialQueryOptions }, IncomeStatement[]>(
        'financial.income',
        { symbol, options },
        route,
        onTrace
      );
    return withOptionalCache(
      this.router,
      'financial.income',
      this.cache,
      'financial',
      ['income', symbol, options.page ?? 1, options.pageSize ?? 20],
      route,
      run
    );
  }

  balance(
    symbol: string,
    options: FinancialQueryOptions = {},
    route?: RouteOptions
  ): Promise<BalanceSheet[]> {
    const run = (onTrace?: (trace: RouteTrace) => void) =>
      this.router.execute<{ symbol: string; options: FinancialQueryOptions }, BalanceSheet[]>(
        'financial.balance',
        { symbol, options },
        route,
        onTrace
      );
    return withOptionalCache(
      this.router,
      'financial.balance',
      this.cache,
      'financial',
      ['balance', symbol, options.page ?? 1, options.pageSize ?? 20],
      route,
      run
    );
  }

  cashflow(
    symbol: string,
    options: FinancialQueryOptions = {},
    route?: RouteOptions
  ): Promise<CashFlowStatement[]> {
    const run = (onTrace?: (trace: RouteTrace) => void) =>
      this.router.execute<{ symbol: string; options: FinancialQueryOptions }, CashFlowStatement[]>(
        'financial.cashflow',
        { symbol, options },
        route,
        onTrace
      );
    return withOptionalCache(
      this.router,
      'financial.cashflow',
      this.cache,
      'financial',
      ['cashflow', symbol, options.page ?? 1, options.pageSize ?? 20],
      route,
      run
    );
  }

  forecast(
    options: PerformanceListOptions = {},
    route?: RouteOptions
  ): Promise<PerformanceForecast[]> {
    return this.router.execute<PerformanceListOptions, PerformanceForecast[]>(
      'financial.forecast',
      options,
      route
    );
  }

  express(
    options: PerformanceListOptions = {},
    route?: RouteOptions
  ): Promise<PerformanceExpress[]> {
    return this.router.execute<PerformanceListOptions, PerformanceExpress[]>(
      'financial.express',
      options,
      route
    );
  }
}

/**
 * 财经资讯与上市公司公告服务（双源容错，实时资讯默认不缓存）。
 */
export class NewsService {
  constructor(private readonly router: SourceRouter) {}

  flash(options: NewsFlashOptions = {}, route?: RouteOptions): Promise<MarketNewsFlash[]> {
    return this.router.execute<NewsFlashOptions, MarketNewsFlash[]>('news.flash', options, route);
  }

  announcements(
    options: AnnouncementQueryOptions = {},
    route?: RouteOptions
  ): Promise<StockAnnouncement[]> {
    return this.router.execute<AnnouncementQueryOptions, StockAnnouncement[]>(
      'news.announcements',
      options,
      route
    );
  }
}

/**
 * 公司治理与股东服务。
 */
export class CorporateService {
  constructor(
    private readonly router: SourceRouter,
    private readonly cache?: NodeCacheConfig
  ) {}

  topHolders(
    symbol: string,
    options: CorporateQueryOptions = {},
    route?: RouteOptions
  ): Promise<TopShareholder[]> {
    const run = (onTrace?: (trace: RouteTrace) => void) =>
      this.router.execute<{ symbol: string; options: CorporateQueryOptions }, TopShareholder[]>(
        'corporate.topHolders',
        { symbol, options },
        route,
        onTrace
      );
    return withOptionalCache(
      this.router,
      'corporate.topHolders',
      this.cache,
      'corporate',
      ['topHolders', symbol, options.page ?? 1, options.pageSize ?? 20],
      route,
      run
    );
  }

  holderCount(
    symbol: string,
    options: CorporateQueryOptions = {},
    route?: RouteOptions
  ): Promise<ShareholderCount[]> {
    const run = (onTrace?: (trace: RouteTrace) => void) =>
      this.router.execute<{ symbol: string; options: CorporateQueryOptions }, ShareholderCount[]>(
        'corporate.holderCount',
        { symbol, options },
        route,
        onTrace
      );
    return withOptionalCache(
      this.router,
      'corporate.holderCount',
      this.cache,
      'corporate',
      ['holderCount', symbol, options.page ?? 1, options.pageSize ?? 20],
      route,
      run
    );
  }
}

/**
 * 债券与可转债服务。
 */
export class BondService {
  constructor(
    private readonly router: SourceRouter,
    private readonly cache?: NodeCacheConfig
  ) {}

  convertibleList(
    options: CorporateQueryOptions = {},
    route?: RouteOptions
  ): Promise<ConvertibleBondItem[]> {
    const run = (onTrace?: (trace: RouteTrace) => void) =>
      this.router.execute<CorporateQueryOptions, ConvertibleBondItem[]>(
        'bond.convertibleList',
        options,
        route,
        onTrace
      );
    return withOptionalCache(
      this.router,
      'bond.convertibleList',
      this.cache,
      'corporate',
      ['convertibleList', options.page ?? 1, options.pageSize ?? 20],
      route,
      run
    );
  }
}
