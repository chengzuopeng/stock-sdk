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

const inflightByStore = new WeakMap<CacheStore, Map<string, Promise<unknown>>>();

async function withOptionalCache<T extends readonly unknown[]>(
  router: SourceRouter,
  capability: CapabilityId,
  cache: NodeCacheConfig | undefined,
  category: 'financial' | 'corporate',
  keyParts: readonly unknown[],
  route: RouteOptions | undefined,
  fetcher: () => Promise<T>
): Promise<T> {
  if (!cache || route?.source || (route?.requiredFields && route.requiredFields.length > 0)) {
    return fetcher();
  }
  const ttl =
    category === 'financial'
      ? (cache.financialTTL ?? DEFAULT_FINANCIAL_TTL)
      : (cache.corporateTTL ?? DEFAULT_CORPORATE_TTL);
  if (ttl <= 0) return fetcher();

  const key = createCacheKey(`node:${category}`, ...keyParts.map((v) => String(v ?? '')));
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

  let inflight = inflightByStore.get(cache.store);
  if (!inflight) {
    inflight = new Map();
    inflightByStore.set(cache.store, inflight);
  }
  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const job = (async () => {
    let capturedTrace: RouteTrace | undefined;
    const unsub = router.addRouteListener((t) => {
      if (t.capability === capability) capturedTrace = t;
    });
    try {
      const value = await fetcher();
      // 仅当非空且未发生故障降级（degraded=false）时才写入长效持久化缓存，
      // 防止主源瞬时抖动降级到少字段备源或空数组后污染磁盘缓存 6 小时。
      if (value.length > 0 && !capturedTrace?.degraded) {
        await cache.store.set(key, value, ttl);
      }
      return value;
    } finally {
      unsub();
    }
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, job);
  return job;
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
    const run = () =>
      this.router.execute<{ symbol: string; options: FinancialQueryOptions }, FinancialIndicator[]>(
        'financial.indicators',
        { symbol, options },
        route
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
    const run = () =>
      this.router.execute<{ symbol: string; options: FinancialQueryOptions }, IncomeStatement[]>(
        'financial.income',
        { symbol, options },
        route
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
    const run = () =>
      this.router.execute<{ symbol: string; options: FinancialQueryOptions }, BalanceSheet[]>(
        'financial.balance',
        { symbol, options },
        route
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
    const run = () =>
      this.router.execute<{ symbol: string; options: FinancialQueryOptions }, CashFlowStatement[]>(
        'financial.cashflow',
        { symbol, options },
        route
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
    const run = () =>
      this.router.execute<{ symbol: string; options: CorporateQueryOptions }, TopShareholder[]>(
        'corporate.topHolders',
        { symbol, options },
        route
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
    const run = () =>
      this.router.execute<{ symbol: string; options: CorporateQueryOptions }, ShareholderCount[]>(
        'corporate.holderCount',
        { symbol, options },
        route
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
    const run = () =>
      this.router.execute<CorporateQueryOptions, ConvertibleBondItem[]>(
        'bond.convertibleList',
        options,
        route
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
