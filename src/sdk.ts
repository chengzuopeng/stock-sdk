/**
 * Stock SDK - 门面类
 * 统一对外接口，组合各个 service
 */
import { RequestClient, type RequestClientOptions } from './core';
import type {
  FullQuote,
  SimpleQuote,
  FundFlow,
  PanelLargeOrder,
  HKQuote,
  USQuote,
  FundQuote,
  HistoryKline,
  MinuteTimeline,
  MinuteKline,
  TodayTimelineResponse,
  HKUSHistoryKline,
  IndustryBoard,
  IndustryBoardSpot,
  IndustryBoardConstituent,
  IndustryBoardKline,
  IndustryBoardMinuteTimeline,
  IndustryBoardMinuteKline,
  ConceptBoard,
  ConceptBoardSpot,
  ConceptBoardConstituent,
  ConceptBoardKline,
  ConceptBoardMinuteTimeline,
  ConceptBoardMinuteKline,
  SearchResult,
  DividendDetail,
  FuturesKline,
  GlobalFuturesQuote,
  FuturesInventorySymbol,
  FuturesInventory,
  ComexInventory,
  IndexOptionProduct,
  OptionTQuoteResult,
  OptionKline,
  ETFOptionCate,
  ETFOptionMonth,
  ETFOptionExpireDay,
  OptionMinute,
  CFFEXOptionQuote,
  OptionLHBItem,
} from './types';
import { type KlineWithIndicators } from './indicators';
import {
  BoardService,
  FuturesService,
  IndicatorService,
  KlineService,
  OptionsService,
  QuoteService,
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
  }

  /**
   * 获取 A 股完整行情（腾讯接口）
   * @param codes 股票代码数组（如 `['sh600519', 'sz000001']`）
   */
  getFullQuotes(codes: string[]): Promise<FullQuote[]> {
    return this.quoteService.getFullQuotes(codes);
  }

  /**
   * 获取 A 股简化行情（腾讯接口）
   * @param codes 股票代码数组
   */
  getSimpleQuotes(codes: string[]): Promise<SimpleQuote[]> {
    return this.quoteService.getSimpleQuotes(codes);
  }

  /**
   * 获取港股行情
   * @param codes 港股代码数组（如 `['hk00700']`）
   */
  getHKQuotes(codes: string[]): Promise<HKQuote[]> {
    return this.quoteService.getHKQuotes(codes);
  }

  /**
   * 获取美股行情
   * @param codes 美股代码数组（如 `['usAAPL']`）
   */
  getUSQuotes(codes: string[]): Promise<USQuote[]> {
    return this.quoteService.getUSQuotes(codes);
  }

  /**
   * 获取基金行情（场内/场外）
   * @param codes 基金代码数组
   */
  getFundQuotes(codes: string[]): Promise<FundQuote[]> {
    return this.quoteService.getFundQuotes(codes);
  }

  /**
   * 获取资金流向数据
   * @param codes 股票代码数组
   */
  getFundFlow(codes: string[]): Promise<FundFlow[]> {
    return this.quoteService.getFundFlow(codes);
  }

  /**
   * 获取盘口大单/异动数据
   * @param codes 股票代码数组
   */
  getPanelLargeOrder(codes: string[]): Promise<PanelLargeOrder[]> {
    return this.quoteService.getPanelLargeOrder(codes);
  }

  /**
   * 获取当日分时数据
   * @param code 单只股票代码
   */
  getTodayTimeline(code: string): Promise<TodayTimelineResponse> {
    return this.quoteService.getTodayTimeline(code);
  }

  /**
   * 获取行业板块列表（东方财富）
   */
  getIndustryList(): Promise<IndustryBoard[]> {
    return this.boardService.getIndustryList();
  }

  /**
   * 获取行业板块成分股实时行情
   * @param symbol 行业板块代码
   */
  getIndustrySpot(symbol: string): Promise<IndustryBoardSpot[]> {
    return this.boardService.getIndustrySpot(symbol);
  }

  /**
   * 获取行业板块成分股列表
   * @param symbol 行业板块代码
   */
  getIndustryConstituents(symbol: string): Promise<IndustryBoardConstituent[]> {
    return this.boardService.getIndustryConstituents(symbol);
  }

  /**
   * 获取行业板块历史 K 线
   * @param symbol 行业板块代码
   * @param options K 线参数
   */
  getIndustryKline(
    symbol: string,
    options?: import('./providers/eastmoney').IndustryBoardKlineOptions
  ): Promise<IndustryBoardKline[]> {
    return this.boardService.getIndustryKline(symbol, options);
  }

  /**
   * 获取行业板块分时/分钟 K 线
   * @param symbol 行业板块代码
   * @param options 周期参数（不传周期则返回当日分时）
   */
  getIndustryMinuteKline(
    symbol: string,
    options?: import('./providers/eastmoney').IndustryBoardMinuteKlineOptions
  ): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]> {
    return this.boardService.getIndustryMinuteKline(symbol, options);
  }

  /**
   * 获取概念板块列表（东方财富）
   */
  getConceptList(): Promise<ConceptBoard[]> {
    return this.boardService.getConceptList();
  }

  /**
   * 获取概念板块成分股实时行情
   * @param symbol 概念板块代码
   */
  getConceptSpot(symbol: string): Promise<ConceptBoardSpot[]> {
    return this.boardService.getConceptSpot(symbol);
  }

  /**
   * 获取概念板块成分股列表
   * @param symbol 概念板块代码
   */
  getConceptConstituents(symbol: string): Promise<ConceptBoardConstituent[]> {
    return this.boardService.getConceptConstituents(symbol);
  }

  /**
   * 获取概念板块历史 K 线
   * @param symbol 概念板块代码
   * @param options K 线参数
   */
  getConceptKline(
    symbol: string,
    options?: import('./providers/eastmoney').ConceptBoardKlineOptions
  ): Promise<ConceptBoardKline[]> {
    return this.boardService.getConceptKline(symbol, options);
  }

  /**
   * 获取概念板块分时/分钟 K 线
   * @param symbol 概念板块代码
   * @param options 周期参数（不传周期则返回当日分时）
   */
  getConceptMinuteKline(
    symbol: string,
    options?: import('./providers/eastmoney').ConceptBoardMinuteKlineOptions
  ): Promise<ConceptBoardMinuteTimeline[] | ConceptBoardMinuteKline[]> {
    return this.boardService.getConceptMinuteKline(symbol, options);
  }

  /**
   * 获取 A 股历史 K 线（日/周/月，含复权）
   * @param symbol 股票代码
   * @param options K 线参数
   */
  getHistoryKline(
    symbol: string,
    options?: import('./providers/eastmoney').HistoryKlineOptions
  ): Promise<HistoryKline[]> {
    return this.klineService.getHistoryKline(symbol, options);
  }

  /**
   * 获取 A 股分时/分钟 K 线
   * @param symbol 股票代码
   * @param options 周期参数（不传周期则返回当日分时）
   */
  getMinuteKline(
    symbol: string,
    options?: import('./providers/eastmoney').MinuteKlineOptions
  ): Promise<MinuteTimeline[] | MinuteKline[]> {
    return this.klineService.getMinuteKline(symbol, options);
  }

  /**
   * 获取港股历史 K 线
   * @param symbol 港股代码
   * @param options K 线参数
   */
  getHKHistoryKline(
    symbol: string,
    options?: import('./providers/eastmoney').HKKlineOptions
  ): Promise<HKUSHistoryKline[]> {
    return this.klineService.getHKHistoryKline(symbol, options);
  }

  /**
   * 获取美股历史 K 线
   * @param symbol 美股代码
   * @param options K 线参数
   */
  getUSHistoryKline(
    symbol: string,
    options?: import('./providers/eastmoney').USKlineOptions
  ): Promise<HKUSHistoryKline[]> {
    return this.klineService.getUSHistoryKline(symbol, options);
  }

  /**
   * 模糊搜索股票/指数/基金等
   * @param keyword 关键词（代码 / 名称 / 拼音）
   */
  search(keyword: string): Promise<SearchResult[]> {
    return this.quoteService.search(keyword);
  }

  /**
   * 获取 A 股全量代码列表
   * @param options 过滤选项；传 `boolean` 兼容旧版「是否包含交易所前缀」用法
   */
  getAShareCodeList(
    options?: import('./providers/tencent/batch').GetAShareCodeListOptions | boolean
  ): Promise<string[]> {
    return this.quoteService.getAShareCodeList(options);
  }

  /**
   * 获取美股全量代码列表
   * @param options 过滤选项；传 `boolean` 兼容旧版「是否包含市场前缀」用法
   */
  getUSCodeList(
    options?: import('./providers/tencent/batch').GetUSCodeListOptions | boolean
  ): Promise<string[]> {
    return this.quoteService.getUSCodeList(options);
  }

  /**
   * 获取港股全量代码列表
   */
  getHKCodeList(): Promise<string[]> {
    return this.quoteService.getHKCodeList();
  }

  /**
   * 获取基金全量代码列表
   */
  getFundCodeList(): Promise<string[]> {
    return this.quoteService.getFundCodeList();
  }

  /**
   * 批量拉取全部 A 股完整行情
   * @param options 批量请求参数（如批大小、并发等）
   */
  getAllAShareQuotes(
    options: import('./providers/tencent/batch').GetAllAShareQuotesOptions = {}
  ): Promise<FullQuote[]> {
    return this.quoteService.getAllAShareQuotes(options);
  }

  /**
   * 批量拉取全部港股行情
   * @param options 批量请求参数
   */
  getAllHKShareQuotes(
    options: import('./providers/tencent/batch').GetAllAShareQuotesOptions = {}
  ): Promise<HKQuote[]> {
    return this.quoteService.getAllHKShareQuotes(options);
  }

  /**
   * 批量拉取全部美股行情
   * @param options 批量请求参数
   */
  getAllUSShareQuotes(
    options: import('./providers/tencent/batch').GetAllUSQuotesOptions = {}
  ): Promise<USQuote[]> {
    return this.quoteService.getAllUSShareQuotes(options);
  }

  /**
   * 按给定代码列表批量拉取完整行情
   * @param codes 股票代码数组
   * @param options 批量请求参数
   */
  getAllQuotesByCodes(
    codes: string[],
    options: import('./providers/tencent/batch').GetAllAShareQuotesOptions = {}
  ): Promise<FullQuote[]> {
    return this.quoteService.getAllQuotesByCodes(codes, options);
  }

  /**
   * 直接调用腾讯批量行情原始接口（高级用法）
   * @param params 拼接后的查询参数（如 `'sh600519,sz000001'`）
   */
  batchRaw(params: string): Promise<{ key: string; fields: string[] }[]> {
    return this.quoteService.batchRaw(params);
  }

  /**
   * 获取交易日历（A 股）
   */
  getTradingCalendar(): Promise<string[]> {
    return this.quoteService.getTradingCalendar();
  }

  /**
   * 获取分红配股明细
   * @param symbol 股票代码
   */
  getDividendDetail(symbol: string): Promise<DividendDetail[]> {
    return this.quoteService.getDividendDetail(symbol);
  }

  /**
   * 获取国内期货历史 K 线
   * @param symbol 期货合约代码
   * @param options K 线参数
   */
  getFuturesKline(
    symbol: string,
    options?: import('./providers/eastmoney').FuturesKlineOptions
  ): Promise<FuturesKline[]> {
    return this.futuresService.getFuturesKline(symbol, options);
  }

  /**
   * 获取全球期货实时行情
   * @param options 筛选选项
   */
  getGlobalFuturesSpot(
    options?: import('./providers/eastmoney').GlobalFuturesSpotOptions
  ): Promise<GlobalFuturesQuote[]> {
    return this.futuresService.getGlobalFuturesSpot(options);
  }

  /**
   * 获取全球期货历史 K 线
   * @param symbol 期货合约代码
   * @param options K 线参数
   */
  getGlobalFuturesKline(
    symbol: string,
    options?: import('./providers/eastmoney').GlobalFuturesKlineOptions
  ): Promise<FuturesKline[]> {
    return this.futuresService.getGlobalFuturesKline(symbol, options);
  }

  /**
   * 获取期货库存品种列表
   */
  getFuturesInventorySymbols(): Promise<FuturesInventorySymbol[]> {
    return this.futuresService.getFuturesInventorySymbols();
  }

  /**
   * 获取指定品种的期货库存历史
   * @param symbol 品种代码
   * @param options 查询参数
   */
  getFuturesInventory(
    symbol: string,
    options?: import('./providers/eastmoney').FuturesInventoryOptions
  ): Promise<FuturesInventory[]> {
    return this.futuresService.getFuturesInventory(symbol, options);
  }

  /**
   * 获取 COMEX 黄金/白银库存
   * @param symbol `'gold'` 或 `'silver'`
   * @param options 查询参数
   */
  getComexInventory(
    symbol: 'gold' | 'silver',
    options?: import('./providers/eastmoney').ComexInventoryOptions
  ): Promise<ComexInventory[]> {
    return this.futuresService.getComexInventory(symbol, options);
  }

  /**
   * 获取股指期权 T 型报价
   * @param product 期权品种
   * @param contract 合约月份等参数
   */
  getIndexOptionSpot(
    product: IndexOptionProduct,
    contract: string
  ): Promise<OptionTQuoteResult> {
    return this.optionsService.getIndexOptionSpot(product, contract);
  }

  /**
   * 获取股指期权日 K 线
   * @param symbol 合约代码
   */
  getIndexOptionKline(symbol: string): Promise<OptionKline[]> {
    return this.optionsService.getIndexOptionKline(symbol);
  }

  /**
   * 获取中金所期权当日报价（IO/MO 等）
   * @param options 筛选选项
   */
  getCFFEXOptionQuotes(
    options?: import('./providers/eastmoney').CFFEXOptionQuotesOptions
  ): Promise<CFFEXOptionQuote[]> {
    return this.optionsService.getCFFEXOptionQuotes(options);
  }

  /**
   * 获取 ETF 期权可用月份
   * @param cate ETF 期权品种
   */
  getETFOptionMonths(cate: ETFOptionCate): Promise<ETFOptionMonth> {
    return this.optionsService.getETFOptionMonths(cate);
  }

  /**
   * 获取 ETF 期权指定月份的合约列表/到期日
   * @param cate ETF 期权品种
   * @param month 月份（如 `'202405'`）
   */
  getETFOptionExpireDay(
    cate: ETFOptionCate,
    month: string
  ): Promise<ETFOptionExpireDay> {
    return this.optionsService.getETFOptionExpireDay(cate, month);
  }

  /**
   * 获取 ETF 期权当日分时
   * @param code 合约代码
   */
  getETFOptionMinute(code: string): Promise<OptionMinute[]> {
    return this.optionsService.getETFOptionMinute(code);
  }

  /**
   * 获取 ETF 期权日 K 线
   * @param code 合约代码
   */
  getETFOptionDailyKline(code: string): Promise<OptionKline[]> {
    return this.optionsService.getETFOptionDailyKline(code);
  }

  /**
   * 获取 ETF 期权 5 日分时
   * @param code 合约代码
   */
  getETFOption5DayMinute(code: string): Promise<OptionMinute[]> {
    return this.optionsService.getETFOption5DayMinute(code);
  }

  /**
   * 获取商品期权 T 型报价
   * @param variety 品种
   * @param contract 合约
   */
  getCommodityOptionSpot(
    variety: string,
    contract: string
  ): Promise<OptionTQuoteResult> {
    return this.optionsService.getCommodityOptionSpot(variety, contract);
  }

  /**
   * 获取商品期权日 K 线
   * @param symbol 合约代码
   */
  getCommodityOptionKline(symbol: string): Promise<OptionKline[]> {
    return this.optionsService.getCommodityOptionKline(symbol);
  }

  /**
   * 获取期权龙虎榜
   * @param symbol 合约代码
   * @param date 日期 `YYYY-MM-DD`
   */
  getOptionLHB(symbol: string, date: string): Promise<OptionLHBItem[]> {
    return this.optionsService.getOptionLHB(symbol, date);
  }

  /**
   * 获取带技术指标的 K 线（A 股 / 港股 / 美股自动识别）
   * @param symbol 股票代码
   * @param options 配置（市场、周期、复权、日期范围、指标列表等）
   * @see {@link KlineWithIndicatorsOptions}
   */
  getKlineWithIndicators(
    symbol: string,
    options: KlineWithIndicatorsOptions = {}
  ): Promise<KlineWithIndicators<HistoryKline | HKUSHistoryKline>[]> {
    return this.indicatorService.getKlineWithIndicators(symbol, options);
  }
}

export type { MarketType, KlineWithIndicatorsOptions } from './sdk/index';

export default StockSDK;
