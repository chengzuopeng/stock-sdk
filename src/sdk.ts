/**
 * Stock SDK - 门面类
 * 统一对外接口，组合各个 service
 */
import { RequestClient, clearClientScopedCaches, type RequestClientOptions } from './core';
import type {
  SearchResult,
} from './types';

import {
  BoardService,
  ChipService,
  FuturesService,
  IndicatorService,
  KlineService,
  OptionsService,
  QuoteService,
  FundFlowService,
  NorthboundService,
  MarketEventService,
  DragonTigerService,
  DataService,
  TradingCalendarService,
  FundService,
  type KlineWithIndicatorsOptions,
} from './sdk/index';

// 重新导出配置类型
export type {
  GetAllAShareQuotesOptions,
  AShareMarket,
  GetAShareCodeListOptions,
  USMarket,
  GetUSCodeListOptions,
  GetAllUSQuotesOptions,
} from './providers/tencent/batch';

export class StockSDK {
  private readonly client: RequestClient;
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

  /**
   * 创建 Stock SDK 实例。
   * 旧的全局 `timeout` / `retry` / `rateLimit` / `circuitBreaker` 配置继续有效，
   * 也可以通过 `providerPolicies` 为不同数据源覆盖请求治理策略而不影响既有 API。
   */
  constructor(options: RequestClientOptions = {}) {
    this.client = new RequestClient(options);
    this.quoteService = new QuoteService(this.client);
    this.boardService = new BoardService(this.client);
    this.klineService = new KlineService(this.client);
    this.futuresService = new FuturesService(this.client);
    this.optionsService = new OptionsService(this.client);
    this.indicatorService = new IndicatorService(
      this.klineService,
      this.quoteService
    );
    this.chipService = new ChipService(this.klineService);
    this.fundFlowService = new FundFlowService(this.client);
    this.northboundService = new NorthboundService(this.client);
    this.marketEventService = new MarketEventService(this.client, this.quoteService);
    this.dragonTigerService = new DragonTigerService(this.client);
    this.dataService = new DataService(this.client);
    this.tradingCalendarService = new TradingCalendarService(this.quoteService);
    this.fundService = new FundService(this.client);
  }

  /**
   * 清空本实例的全部内部缓存（代码表 / 交易日历 / 板块名称映射 / us-secid 解析）。
   *
   * R7-11 起这些缓存按实例隔离，模块级 `clearSharedCaches()` 对它们不再生效
   * —— 长驻进程需要强刷时用本方法。
   */
  clearCaches(): void {
    clearClientScopedCaches(this.client);
  }

  // ===== v2 命名空间 API（委托现有 service;v1 扁平方法已移除,仅余顶层 search）=====
  // 命名空间懒构建一次并缓存：保证引用稳定（sdk.quotes === sdk.quotes，达成 TD §7.2 目标）
  private readonly _ns: Record<string, unknown> = {};
  private memoNs<T>(key: string, build: () => T): T {
    // 注意:这里【不能】写成 `(this._ns[key] ??= build())` —— tsup 的
    // cjs+splitting+minify 管线会把 `return` 与注入的 `_nullishCoalesce` helper
    // 熔接成坏标识符 `return_nullishCoalesce`,导致 dist/*.cjs 的全部命名空间
    // getter 首次访问即抛 ReferenceError(ESM 产物正常)。
    // 回归护栏:test/unit/dist-smoke.test.ts(构建后运行)。
    let cached = this._ns[key];
    if (cached === undefined) {
      cached = build();
      this._ns[key] = cached;
    }
    return cached as T;
  }

  /** 实时行情 */
  get quotes() {
    return this.memoNs('quotes', () => {
      const s = this.quoteService;
      return {
        cn: s.getFullQuotes.bind(s),
        cnSimple: s.getSimpleQuotes.bind(s),
        hk: s.getHKQuotes.bind(s),
        us: s.getUSQuotes.bind(s),
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

  /** 批量行情 */
  get batch() {
    return this.memoNs('batch', () => {
      const s = this.quoteService;
      return {
        cn: s.getAllAShareQuotes.bind(s),
        hk: s.getAllHKShareQuotes.bind(s),
        us: s.getAllUSShareQuotes.bind(s),
        byCodes: s.getAllQuotesByCodes.bind(s),
        raw: s.batchRaw.bind(s),
      };
    });
  }

  /** K 线 / 分时 */
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
      };
    });
  }

  /** 筹码分布（A 股 / 港股 / 美股,基于日 K + 换手率本地计算） */
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

  /** 资金流向（深度） */
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
        estimate: f.getFundEstimate.bind(f),
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

  /** 参考数据（分红 / 交易日历原始数组） */
  get reference() {
    return this.memoNs('reference', () => {
      const s = this.quoteService;
      return {
        dividendDetail: s.getDividendDetail.bind(s),
        tradingCalendar: s.getTradingCalendar.bind(s),
      };
    });
  }

  // ===== 顶层快捷方法(唯一保留;其余 v1 扁平方法已按 v2 单轨硬切移除,
  // 迁移映射见 website/guide/migration-v1-to-v2.md)=====
  /**
   * 模糊搜索股票/指数/基金等
   * @param keyword 关键词（代码 / 名称 / 拼音）
   */
  search(keyword: string): Promise<SearchResult[]> {
    return this.quoteService.search(keyword);
  }
}

export type {
  MarketType,
  KlineWithIndicatorsOptions,
  ChipDistributionRequestOptions,
  IndividualChangesOptions,
  IndividualChangesHistoryOptions,
} from './sdk/index';

export default StockSDK;
