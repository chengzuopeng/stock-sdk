import { AsyncLocalStorage } from 'node:async_hooks';
import { clearClientScopedCaches } from '@stock-sdk/core/core';
import {
  SourceRouter,
  type CapabilityId,
  type RouteOptions,
  type RouteTrace,
  type SourceAdapter,
  type SourceHealthStats,
  type SourceRouterOptions,
} from '@stock-sdk/core/router';
import {
  BoardService,
  ChipService,
  DataService,
  DragonTigerService,
  FundFlowService,
  FundService,
  FuturesService,
  IndicatorService,
  KlineService,
  MarketEventService,
  NorthboundService,
  OptionsService,
  QuoteService,
  TradingCalendarService,
} from '@stock-sdk/core/sdk/index';
import type {
  GetAllAShareQuotesOptions,
  GetAllHKQuotesOptions,
  GetAllUSQuotesOptions,
} from '@stock-sdk/core/providers/tencent/batch';
import type { DividendDetail, SearchResult } from '@stock-sdk/core/types';
import type { FullQuote, HKQuote, SimpleQuote, USQuote } from './quoteTypes';
import {
  NodeHttpClient,
  type NodeHttpClientOptions,
} from './transport/nodeHttpClient';
import { OVERSEAS_PROVIDERS, registerDefaultNodeAdapters } from './adapters';
import {
  BondService,
  CorporateService,
  FinancialService,
  NewsService,
  type NodeCacheConfig,
} from './services/nodeDomainServices';

/**
 * `new StockNodeSDK(options)` 构造参数。
 * 完全兼容 `StockSDKOptions`，并扩展 Node 端代理池、Cookie/会话、多源路由策略、持久化缓存与自定义适配器。
 */
export interface StockNodeSDKOptions extends NodeHttpClientOptions {
  /**
   * A 股 K 线在东方财富失败时是否自动切备用源，默认 `true`。
   * 设为 `false` 时锁定仅请求东方财富。
   */
  klineFallback?: boolean;
  /**
   * 是否启用海外数据源包（CNBC / Nasdaq / SEC EDGAR），默认 `true`。
   * - 默认开启（海外行情与 K 线源优先级低于国内主力源，平时走国内源零开销，故障时跨区域容错；同时提供美股 SEC 官方公告与 Nasdaq 财报/分红备源）；
   * - 中国大陆无代理直连环境如不希望在降级时尝试海外接口，可设为 `false` 一键关闭（仅使用大陆可直连的腾讯 / 东财 / 新浪 / 巨潮 / 港交所披露易）。
   */
  overseas?: boolean;
  /**
   * 多源路由全局策略（优先级覆盖、禁用源名单、冷却时长、失败阈值等）。
   */
  routing?: Omit<SourceRouterOptions, 'onRoute'>;
  /**
   * 可选持久化/外部缓存配置（如内置 `FileCacheStore` 或自定义 Redis/SQLite `CacheStore`）。
   */
  cache?: NodeCacheConfig;
  /**
   * 注册自定义或第三方数据源适配器（可覆盖同 id 默认适配器，或接入自建数据源）。
   */
  customAdapters?: readonly SourceAdapter<unknown, unknown>[];
  /**
   * 每次多源路由完成后的可观测性钩子。
   */
  onRoute?: (trace: RouteTrace) => void;
}

/**
 * `sdk.withMeta(fn)` 的返回值：保留原始业务数据，同时附带本次异步上下文中全部多源路由轨迹。
 */
export interface ResultWithMeta<T> {
  /** 业务返回数据 */
  data: T;
  /** 最近一次路由轨迹（单接口调用即本次调用的完整溯源） */
  trace?: RouteTrace;
  /** 回调期间产生的全部路由轨迹（组合调用如 withIndicators 可能触发多次路由） */
  traces: RouteTrace[];
}

/**
 * 面向 Node.js 的多源高可用财经数据 SDK。
 *
 * - API 命名空间与 `StockSDK` 严格超集对齐，从 `stock-sdk` 升级只需替换 import；
 * - 默认屏蔽数据源差异，自动在多源间按能力过滤、健康度调度与故障容错，输出统一 Schema；
 * - 放开浏览器限制：支持 POST、自定义 Referer、CookieJar/Session 预热、ProxyPool 代理池与磁盘缓存；
 * - 扩展 `financial`（财报/指标/预告/快报）、`news`（7×24 快讯/公告）、`corporate`（股东）、`bond`（可转债）。
 */
export class StockNodeSDK {
  readonly client: NodeHttpClient;
  readonly router: SourceRouter;

  private readonly quoteService: QuoteService;
  private readonly boardService: BoardService;
  private readonly klineService: KlineService;
  private readonly futuresService: FuturesService;
  private readonly optionsService: OptionsService;
  private readonly indicatorService: IndicatorService;
  private readonly chipService: ChipService;
  private readonly fundFlowService: FundFlowService;
  private readonly northboundService: NorthboundService;
  private readonly marketEventService: MarketEventService;
  private readonly dragonTigerService: DragonTigerService;
  private readonly dataService: DataService;
  private readonly tradingCalendarService: TradingCalendarService;
  private readonly fundService: FundService;
  private readonly financialService: FinancialService;
  private readonly newsService: NewsService;
  private readonly corporateService: CorporateService;
  private readonly bondService: BondService;
  private readonly traceStorage = new AsyncLocalStorage<RouteTrace[]>();
  private readonly _ns: Record<string, unknown> = {};

  constructor(options: StockNodeSDKOptions = {}) {
    const overseasEnabled = options.overseas !== false;
    const disabledProviders = Array.from(
      new Set([
        ...(options.routing?.disabledProviders ?? []),
        ...(overseasEnabled ? [] : OVERSEAS_PROVIDERS),
      ])
    );

    this.client = new NodeHttpClient(options);
    this.router = new SourceRouter({
      ...options.routing,
      disabledProviders,
      onRoute: (trace) => {
        const bucket = this.traceStorage.getStore();
        if (bucket) {
          bucket.push(trace);
        }
        options.onRoute?.(trace);
      },
    });

    registerDefaultNodeAdapters(this.router, this.client);
    if (options.customAdapters?.length) {
      this.router.registerAll(options.customAdapters);
    }

    this.quoteService = new QuoteService(this.client);
    this.boardService = new BoardService(this.client);
    // Node 版默认开启 strictCapabilities: true（杜绝新浪不复权冒充 qfq/hfq）并共享统一多源 router
    this.klineService = new KlineService(
      this.client,
      {
        fallback: options.klineFallback,
        strictCapabilities: true,
      },
      this.router
    );
    this.futuresService = new FuturesService(this.client);
    this.optionsService = new OptionsService(this.client);
    this.indicatorService = new IndicatorService(this.klineService, this.quoteService);
    this.chipService = new ChipService(this.klineService);
    this.fundFlowService = new FundFlowService(this.client);
    this.northboundService = new NorthboundService(this.client);
    this.marketEventService = new MarketEventService(this.client, this.quoteService);
    this.dragonTigerService = new DragonTigerService(this.client);
    this.dataService = new DataService(this.client);
    this.tradingCalendarService = new TradingCalendarService(this.quoteService);
    this.fundService = new FundService(this.client);

    this.financialService = new FinancialService(this.router, options.cache);
    this.newsService = new NewsService(this.router);
    this.corporateService = new CorporateService(this.router, options.cache);
    this.bondService = new BondService(this.router, options.cache);
  }

  private memoNs<T>(key: string, build: () => T): T {
    let cached = this._ns[key];
    if (cached === undefined) {
      cached = build();
      this._ns[key] = cached;
    }
    return cached as T;
  }

  /**
   * 并发安全地捕获本次异步调用的路由溯源信息（命中源、是否降级、尝试耗时明细），
   * 不改变原业务方法的纯数组/纯对象返回形态。
   */
  async withMeta<T>(fn: () => Promise<T>): Promise<ResultWithMeta<T>> {
    const traces: RouteTrace[] = [];
    const data = await this.traceStorage.run(traces, fn);
    return {
      data,
      trace: traces[traces.length - 1],
      traces,
    };
  }

  /**
   * 运行时动态注册或覆写数据源适配器（如接入自建网关或付费源）。
   */
  registerAdapter<TInput, TOutput>(adapter: SourceAdapter<TInput, TOutput>): this {
    this.router.register(adapter);
    return this;
  }

  /**
   * 查询所有或指定能力的数据源健康度与冷却状态。
   */
  getSourceHealth(capability?: CapabilityId): SourceHealthStats[] {
    return this.router.getHealthStats(capability);
  }

  /**
   * 重置路由健康状态与冷却期。
   */
  resetSourceHealth(): void {
    this.router.resetHealth();
  }

  /**
   * 清空实例级内部内存缓存。
   */
  clearCaches(): void {
    clearClientScopedCaches(this.client);
  }

  /**
   * 释放底层代理连接池（建议在脚本或服务退出时调用）。
   */
  async close(): Promise<void> {
    await this.client.close();
  }

  /** 实时行情（A/HK/US 均启用多源自动容错：腾讯 / 新浪 / 东财） */
  get quotes() {
    return this.memoNs('quotes', () => {
      const s = this.quoteService;
      return {
        cn: (codes: string[], route?: RouteOptions): Promise<FullQuote[]> =>
          codes.length === 0
            ? Promise.resolve([])
            : this.router.execute('quotes.cn', { codes }, route),
        cnSimple: (codes: string[], route?: RouteOptions): Promise<SimpleQuote[]> =>
          codes.length === 0
            ? Promise.resolve([])
            : this.router.execute('quotes.cnSimple', { codes }, route),
        hk: (codes: string[], route?: RouteOptions): Promise<HKQuote[]> =>
          codes.length === 0
            ? Promise.resolve([])
            : this.router.execute('quotes.hk', { codes }, route),
        us: (codes: string[], route?: RouteOptions): Promise<USQuote[]> =>
          codes.length === 0
            ? Promise.resolve([])
            : this.router.execute('quotes.us', { codes }, route),
        fund: s.getFundQuotes.bind(s),
        fundFlow: s.getFundFlow.bind(s),
        largeOrder: s.getPanelLargeOrder.bind(s),
        timeline: s.getTodayTimeline.bind(s),
      };
    });
  }

  /** 代码列表 */
  get codes() {
    return this.memoNs('codes', () => {
      const s = this.quoteService;
      return {
        cn: s.getAShareCodeList.bind(s),
        us: s.getUSCodeList.bind(s),
        hk: s.getHKCodeList.bind(s),
        fund: s.getFundCodeList.bind(s),
      };
    });
  }

  /** 批量行情（A/HK/US 全市场快照支持腾讯 ↔ 东财 clist 自动容错） */
  get batch() {
    return this.memoNs('batch', () => {
      const s = this.quoteService;
      return {
        cn: (
          options: GetAllAShareQuotesOptions = {},
          route?: RouteOptions
        ): Promise<FullQuote[]> =>
          this.router.execute('batch.cn', options, route),
        hk: (
          options: GetAllHKQuotesOptions = {},
          route?: RouteOptions
        ): Promise<HKQuote[]> =>
          this.router.execute('batch.hk', options, route),
        us: (
          options: GetAllUSQuotesOptions = {},
          route?: RouteOptions
        ): Promise<USQuote[]> =>
          this.router.execute('batch.us', options, route),
        byCodes: s.getAllQuotesByCodes.bind(s),
        raw: s.batchRaw.bind(s),
      };
    });
  }

  /** K 线 / 分时（A 股三源 + 港美股多源自动容错，默认严格能力校验，同时自动赋能 withIndicators / signals / chips） */
  get kline() {
    return this.memoNs('kline', () => {
      const k = this.klineService;
      const ind = this.indicatorService;
      return {
        cn: k.getHistoryKline.bind(k),
        cnMinute: k.getMinuteKline.bind(k),
        hk: k.getHKHistoryKline.bind(k),
        hkMinute: k.getHKMinuteKline.bind(k),
        us: k.getUSHistoryKline.bind(k),
        usMinute: k.getUSMinuteKline.bind(k),
        withIndicators: ind.getKlineWithIndicators.bind(ind),
        signals: ind.getKlineSignals.bind(ind),
      };
    });
  }

  /** 筹码分布（A/HK/US） */
  get chips() {
    return this.memoNs('chips', () => {
      const c = this.chipService;
      return {
        cn: c.getChipDistribution.bind(c),
        hk: c.getHKChipDistribution.bind(c),
        us: c.getUSChipDistribution.bind(c),
      };
    });
  }

  /** 板块（行业 / 概念） */
  get board() {
    return this.memoNs('board', () => {
      const b = this.boardService;
      return {
        industry: {
          list: b.getIndustryList.bind(b),
          spot: b.getIndustrySpot.bind(b),
          constituents: b.getIndustryConstituents.bind(b),
          kline: b.getIndustryKline.bind(b),
          minuteKline: b.getIndustryMinuteKline.bind(b),
        },
        concept: {
          list: b.getConceptList.bind(b),
          spot: b.getConceptSpot.bind(b),
          constituents: b.getConceptConstituents.bind(b),
          kline: b.getConceptKline.bind(b),
          minuteKline: b.getConceptMinuteKline.bind(b),
        },
      };
    });
  }

  /** 期权 */
  get options() {
    return this.memoNs('options', () => {
      const o = this.optionsService;
      return {
        index: {
          spot: o.getIndexOptionSpot.bind(o),
          kline: o.getIndexOptionKline.bind(o),
        },
        etf: {
          months: o.getETFOptionMonths.bind(o),
          expireDay: o.getETFOptionExpireDay.bind(o),
          minute: o.getETFOptionMinute.bind(o),
          dailyKline: o.getETFOptionDailyKline.bind(o),
          fiveDayMinute: o.getETFOption5DayMinute.bind(o),
        },
        commodity: {
          spot: o.getCommodityOptionSpot.bind(o),
          kline: o.getCommodityOptionKline.bind(o),
        },
        cffex: {
          quotes: o.getCFFEXOptionQuotes.bind(o),
        },
        lhb: o.getOptionLHB.bind(o),
      };
    });
  }

  /** 期货 */
  get futures() {
    return this.memoNs('futures', () => {
      const f = this.futuresService;
      return {
        kline: f.getFuturesKline.bind(f),
        globalSpot: f.getGlobalFuturesSpot.bind(f),
        globalKline: f.getGlobalFuturesKline.bind(f),
        inventorySymbols: f.getFuturesInventorySymbols.bind(f),
        inventory: f.getFuturesInventory.bind(f),
        comexInventory: f.getComexInventory.bind(f),
      };
    });
  }

  /** 资金流向 */
  get fundFlow() {
    return this.memoNs('fundFlow', () => {
      const f = this.fundFlowService;
      return {
        individual: f.getIndividualFundFlow.bind(f),
        market: f.getMarketFundFlow.bind(f),
        rank: f.getFundFlowRank.bind(f),
        sectorRank: f.getSectorFundFlowRank.bind(f),
        sectorHistory: f.getSectorFundFlowHistory.bind(f),
      };
    });
  }

  /** 沪深港通 / 北向 */
  get northbound() {
    return this.memoNs('northbound', () => {
      const n = this.northboundService;
      return {
        minute: n.getNorthboundMinute.bind(n),
        summary: n.getNorthboundFlowSummary.bind(n),
        holdingRank: n.getNorthboundHoldingRank.bind(n),
        history: n.getNorthboundHistory.bind(n),
        individual: n.getNorthboundIndividual.bind(n),
      };
    });
  }

  /** 涨停 / 盘口异动 */
  get marketEvent() {
    return this.memoNs('marketEvent', () => {
      const m = this.marketEventService;
      return {
        ztPool: m.getZTPool.bind(m),
        stockChanges: m.getStockChanges.bind(m),
        boardChanges: m.getBoardChanges.bind(m),
        unusualFluctuation: m.getUnusualFluctuation.bind(m),
        individualChanges: m.getIndividualChanges.bind(m),
        individualChangesHistory: m.getIndividualChangesHistory.bind(m),
      };
    });
  }

  /** 龙虎榜 */
  get dragonTiger() {
    return this.memoNs('dragonTiger', () => {
      const d = this.dragonTigerService;
      return {
        detail: d.getDragonTigerDetail.bind(d),
        stockStats: d.getDragonTigerStockStats.bind(d),
        institution: d.getDragonTigerInstitution.bind(d),
        branchRank: d.getDragonTigerBranchRank.bind(d),
        seatDetail: d.getDragonTigerStockSeatDetail.bind(d),
      };
    });
  }

  /** 大宗交易 */
  get blockTrade() {
    return this.memoNs('blockTrade', () => {
      const d = this.dataService;
      return {
        marketStat: d.getBlockTradeMarketStat.bind(d),
        detail: d.getBlockTradeDetail.bind(d),
        dailyStat: d.getBlockTradeDailyStat.bind(d),
      };
    });
  }

  /** 融资融券 */
  get margin() {
    return this.memoNs('margin', () => {
      const d = this.dataService;
      return {
        accountInfo: d.getMarginAccountInfo.bind(d),
        targetList: d.getMarginTargetList.bind(d),
      };
    });
  }

  /** 公募基金扩展 */
  get fund() {
    return this.memoNs('fund', () => {
      const f = this.fundService;
      return {
        dividendList: f.getFundDividendList.bind(f),
        navHistory: f.getFundNavHistory.bind(f),
        rankHistory: f.getFundRankHistory.bind(f),
        profile: f.getFundProfile.bind(f),
        theme: f.theme,
      };
    });
  }

  /** 交易日历 / 市场状态 */
  get calendar() {
    return this.memoNs('calendar', () => {
      const c = this.tradingCalendarService;
      return {
        isTradingDay: c.isTradingDay.bind(c),
        nextTradingDay: c.nextTradingDay.bind(c),
        prevTradingDay: c.prevTradingDay.bind(c),
        marketStatus: c.getMarketStatus.bind(c),
      };
    });
  }

  /** 参考数据（个股分红支持东财 ↔ 新浪 HTML 自动容错 / 交易日历） */
  get reference() {
    return this.memoNs('reference', () => {
      const s = this.quoteService;
      return {
        dividendDetail: (
          symbol: string,
          route?: RouteOptions
        ): Promise<DividendDetail[]> =>
          this.router.execute('reference.dividendDetail', { symbol }, route),
        tradingCalendar: s.getTradingCalendar.bind(s),
      };
    });
  }

  /** [Node 专属] 财务与基本面（指标 / 三大表 / 业绩预告 / 业绩快报） */
  get financial() {
    return this.memoNs('financial', () => {
      const f = this.financialService;
      return {
        indicators: f.indicators.bind(f),
        income: f.income.bind(f),
        balance: f.balance.bind(f),
        cashflow: f.cashflow.bind(f),
        forecast: f.forecast.bind(f),
        express: f.express.bind(f),
      };
    });
  }

  /** [Node 专属] 7×24 财经快讯与上市公司公告（多源容错） */
  get news() {
    return this.memoNs('news', () => {
      const n = this.newsService;
      return {
        flash: n.flash.bind(n),
        announcements: n.announcements.bind(n),
      };
    });
  }

  /** [Node 专属] 公司治理与股东（十大流通股东 / 股东户数） */
  get corporate() {
    return this.memoNs('corporate', () => {
      const c = this.corporateService;
      return {
        topHolders: c.topHolders.bind(c),
        holderCount: c.holderCount.bind(c),
      };
    });
  }

  /** [Node 专属] 债券与可转债 */
  get bond() {
    return this.memoNs('bond', () => {
      const b = this.bondService;
      return {
        convertibleList: b.convertibleList.bind(b),
      };
    });
  }

  /** 模糊搜索股票 / 指数 / 基金 */
  search(keyword: string): Promise<SearchResult[]> {
    return this.quoteService.search(keyword);
  }
}

export default StockNodeSDK;
