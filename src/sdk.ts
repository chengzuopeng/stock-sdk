/**
 * Stock SDK - 门面类
 * 统一对外接口，组合各模块
 */
import { RequestClient, type RequestClientOptions } from './core';
import { tencent, eastmoney } from './providers';
import { addIndicators, type IndicatorOptions, type KlineWithIndicators } from './indicators';
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
} from './types';

// 重新导出配置类型
export type { GetAllAShareQuotesOptions } from './providers/tencent/batch';

/**
 * 市场类型
 */
export type MarketType = 'A' | 'HK' | 'US';

export class StockSDK {
  private client: RequestClient;

  constructor(options: RequestClientOptions = {}) {
    this.client = new RequestClient(options);
  }

  // ==================== 行情 ====================

  /**
   * 获取 A 股 / 指数 全量行情
   * @param codes 股票代码数组，如 ['sz000858', 'sh600000']
   */
  getFullQuotes(codes: string[]): Promise<FullQuote[]> {
    return tencent.getFullQuotes(this.client, codes);
  }

  /**
   * 获取简要行情
   * @param codes 股票代码数组，如 ['sz000858', 'sh000001']
   */
  getSimpleQuotes(codes: string[]): Promise<SimpleQuote[]> {
    return tencent.getSimpleQuotes(this.client, codes);
  }

  /**
   * 获取港股扩展行情
   * @param codes 港股代码数组，如 ['09988', '00700']
   */
  getHKQuotes(codes: string[]): Promise<HKQuote[]> {
    return tencent.getHKQuotes(this.client, codes);
  }

  /**
   * 获取美股简要行情
   * @param codes 美股代码数组，如 ['BABA', 'AAPL']
   */
  getUSQuotes(codes: string[]): Promise<USQuote[]> {
    return tencent.getUSQuotes(this.client, codes);
  }

  /**
   * 获取公募基金行情
   * @param codes 基金代码数组，如 ['000001', '110011']
   */
  getFundQuotes(codes: string[]): Promise<FundQuote[]> {
    return tencent.getFundQuotes(this.client, codes);
  }

  // ==================== 资金流向 ====================

  /**
   * 获取资金流向
   * @param codes 股票代码数组，如 ['sz000858', 'sh600000']
   */
  getFundFlow(codes: string[]): Promise<FundFlow[]> {
    return tencent.getFundFlow(this.client, codes);
  }

  /**
   * 获取盘口大单占比
   * @param codes 股票代码数组，如 ['sz000858', 'sh600000']
   */
  getPanelLargeOrder(codes: string[]): Promise<PanelLargeOrder[]> {
    return tencent.getPanelLargeOrder(this.client, codes);
  }

  // ==================== 分时 ====================

  /**
   * 获取当日分时走势数据
   * @param code 股票代码，如 'sz000001' 或 'sh600000'
   */
  getTodayTimeline(code: string): Promise<TodayTimelineResponse> {
    return tencent.getTodayTimeline(this.client, code);
  }

  // ==================== 行业板块 ====================

  /**
   * 获取行业板块名称列表
   * @returns 行业板块列表
   */
  getIndustryBoardList(): Promise<IndustryBoard[]> {
    return eastmoney.getIndustryBoardList(this.client);
  }

  /**
   * 获取行业板块实时行情
   * @param symbol 行业板块名称（如"小金属"）或代码（如"BK1027"）
   * @returns 实时行情指标列表
   */
  getIndustryBoardSpot(symbol: string): Promise<IndustryBoardSpot[]> {
    return eastmoney.getIndustryBoardSpot(this.client, symbol);
  }

  /**
   * 获取行业板块成分股
   * @param symbol 行业板块名称（如"小金属"）或代码（如"BK1027"）
   * @returns 成分股列表
   */
  getIndustryBoardConstituents(
    symbol: string
  ): Promise<IndustryBoardConstituent[]> {
    return eastmoney.getIndustryBoardConstituents(this.client, symbol);
  }

  /**
   * 获取行业板块历史 K 线（日/周/月）
   * @param symbol 行业板块名称（如"小金属"）或代码（如"BK1027"）
   * @param options 配置选项
   * @returns 历史 K 线数据
   */
  getIndustryBoardKline(
    symbol: string,
    options?: eastmoney.IndustryBoardKlineOptions
  ): Promise<IndustryBoardKline[]> {
    return eastmoney.getIndustryBoardKline(this.client, symbol, options);
  }

  /**
   * 获取行业板块分时行情（1/5/15/30/60 分钟）
   * @param symbol 行业板块名称（如"小金属"）或代码（如"BK1027"）
   * @param options 配置选项
   * @returns 分时行情数据
   */
  getIndustryBoardMinuteKline(
    symbol: string,
    options?: eastmoney.IndustryBoardMinuteKlineOptions
  ): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]> {
    return eastmoney.getIndustryBoardMinuteKline(this.client, symbol, options);
  }

  // ==================== 概念板块 ====================

  /**
   * 获取概念板块名称列表
   * @returns 概念板块列表
   */
  getConceptBoardList(): Promise<ConceptBoard[]> {
    return eastmoney.getConceptBoardList(this.client);
  }

  /**
   * 获取概念板块实时行情
   * @param symbol 概念板块名称（如"人工智能"）或代码（如"BK0800"）
   * @returns 实时行情指标列表
   */
  getConceptBoardSpot(symbol: string): Promise<ConceptBoardSpot[]> {
    return eastmoney.getConceptBoardSpot(this.client, symbol);
  }

  /**
   * 获取概念板块成分股
   * @param symbol 概念板块名称（如"人工智能"）或代码（如"BK0800"）
   * @returns 成分股列表
   */
  getConceptBoardConstituents(
    symbol: string
  ): Promise<ConceptBoardConstituent[]> {
    return eastmoney.getConceptBoardConstituents(this.client, symbol);
  }

  /**
   * 获取概念板块历史 K 线（日/周/月）
   * @param symbol 概念板块名称（如"人工智能"）或代码（如"BK0800"）
   * @param options 配置选项
   * @returns 历史 K 线数据
   */
  getConceptBoardKline(
    symbol: string,
    options?: eastmoney.ConceptBoardKlineOptions
  ): Promise<ConceptBoardKline[]> {
    return eastmoney.getConceptBoardKline(this.client, symbol, options);
  }

  /**
   * 获取概念板块分时行情（1/5/15/30/60 分钟）
   * @param symbol 概念板块名称（如"人工智能"）或代码（如"BK0800"）
   * @param options 配置选项
   * @returns 分时行情数据
   */
  getConceptBoardMinuteKline(
    symbol: string,
    options?: eastmoney.ConceptBoardMinuteKlineOptions
  ): Promise<ConceptBoardMinuteTimeline[] | ConceptBoardMinuteKline[]> {
    return eastmoney.getConceptBoardMinuteKline(this.client, symbol, options);
  }

  // ==================== K 线 ====================

  /**
   * 获取 A 股历史 K 线（日/周/月）
   */
  getHistoryKline(
    symbol: string,
    options?: eastmoney.HistoryKlineOptions
  ): Promise<HistoryKline[]> {
    return eastmoney.getHistoryKline(this.client, symbol, options);
  }

  /**
   * 获取 A 股分钟 K 线或分时数据
   */
  getMinuteKline(
    symbol: string,
    options?: eastmoney.MinuteKlineOptions
  ): Promise<MinuteTimeline[] | MinuteKline[]> {
    return eastmoney.getMinuteKline(this.client, symbol, options);
  }

  /**
   * 获取港股历史 K 线（日/周/月）
   */
  getHKHistoryKline(
    symbol: string,
    options?: eastmoney.HKKlineOptions
  ): Promise<HKUSHistoryKline[]> {
    return eastmoney.getHKHistoryKline(this.client, symbol, options);
  }

  /**
   * 获取美股历史 K 线（日/周/月）
   */
  getUSHistoryKline(
    symbol: string,
    options?: eastmoney.USKlineOptions
  ): Promise<HKUSHistoryKline[]> {
    return eastmoney.getUSHistoryKline(this.client, symbol, options);
  }

  // ==================== 批量 ====================

  /**
   * 从远程获取 A 股代码列表
   * @param includeExchange 是否包含交易所前缀（如 sh、sz、bj），默认 true
   */
  getAShareCodeList(includeExchange: boolean = true): Promise<string[]> {
    return tencent.getAShareCodeList(this.client, includeExchange);
  }

  /**
   * 从远程获取美股代码列表
   * @param includeMarket 是否包含市场前缀（如 105.、106.），默认 true
   */
  getUSCodeList(includeMarket: boolean = true): Promise<string[]> {
    return tencent.getUSCodeList(this.client, includeMarket);
  }

  /**
   * 从远程获取港股代码列表
   */
  getHKCodeList(): Promise<string[]> {
    return tencent.getHKCodeList(this.client);
  }

  /**
   * 获取全部 A 股实时行情
   */
  async getAllAShareQuotes(
    options: tencent.GetAllAShareQuotesOptions = {}
  ): Promise<FullQuote[]> {
    const codes = await this.getAShareCodeList();
    return this.getAllQuotesByCodes(codes, options);
  }

  /**
   * 获取全部港股实时行情
   */
  async getAllHKShareQuotes(
    options: tencent.GetAllAShareQuotesOptions = {}
  ): Promise<HKQuote[]> {
    const codes = await this.getHKCodeList();
    return tencent.getAllHKQuotesByCodes(this.client, codes, options);
  }

  /**
   * 获取全部美股实时行情
   */
  async getAllUSShareQuotes(
    options: tencent.GetAllAShareQuotesOptions = {}
  ): Promise<USQuote[]> {
    // 使用不带市场前缀的代码
    const codes = await this.getUSCodeList(false);
    return tencent.getAllUSQuotesByCodes(this.client, codes, options);
  }

  /**
   * 获取全部股票实时行情（使用自定义股票代码列表）
   */
  getAllQuotesByCodes(
    codes: string[],
    options: tencent.GetAllAShareQuotesOptions = {}
  ): Promise<FullQuote[]> {
    return tencent.getAllQuotesByCodes(this.client, codes, options);
  }

  /**
   * 批量混合查询，返回原始解析结果（key + fields）
   * @param params 如 'sz000858,s_sh000001,jj000001'
   */
  async batchRaw(params: string): Promise<{ key: string; fields: string[] }[]> {
    return this.client.getTencentQuote(params);
  }

  // ==================== 技术指标 ====================

  /**
   * 市场类型识别
   */
  private detectMarket(symbol: string): MarketType {
    // 美股: 市场代码.股票代码，如 105.MSFT, 106.BABA
    if (/^\d{3}\.[A-Z]+$/i.test(symbol)) {
      return 'US';
    }
    // 港股: 5 位纯数字，如 00700, 09988
    if (/^\d{5}$/.test(symbol)) {
      return 'HK';
    }
    // A 股: 6 位数字或带 sh/sz/bj 前缀
    return 'A';
  }

  /**
   * 安全获取数组最大值
   */
  private safeMax(arr: number[], defaultValue: number = 0): number {
    if (!arr || arr.length === 0) return defaultValue;
    return Math.max(...arr);
  }

  /**
   * 计算各指标所需的最大前置天数
   */
  private calcRequiredLookback(options: IndicatorOptions): number {
    let maxLookback = 0;
    let hasEmaBasedIndicator = false;

    // MA 均线
    if (options.ma) {
      const cfg = typeof options.ma === 'object' ? options.ma : {};
      const periods = cfg.periods ?? [5, 10, 20, 30, 60, 120, 250];
      const type = cfg.type ?? 'sma';
      maxLookback = Math.max(maxLookback, this.safeMax(periods, 20));
      if (type === 'ema') hasEmaBasedIndicator = true;
    }

    // MACD
    if (options.macd) {
      const cfg = typeof options.macd === 'object' ? options.macd : {};
      const long = cfg.long ?? 26;
      const signal = cfg.signal ?? 9;
      maxLookback = Math.max(maxLookback, long * 3 + signal);
      hasEmaBasedIndicator = true;
    }

    // BOLL
    if (options.boll) {
      const period =
        typeof options.boll === 'object' && options.boll.period
          ? options.boll.period
          : 20;
      maxLookback = Math.max(maxLookback, period);
    }

    // KDJ
    if (options.kdj) {
      const period =
        typeof options.kdj === 'object' && options.kdj.period
          ? options.kdj.period
          : 9;
      maxLookback = Math.max(maxLookback, period);
    }

    // RSI
    if (options.rsi) {
      const periods =
        typeof options.rsi === 'object' && options.rsi.periods
          ? options.rsi.periods
          : [6, 12, 24];
      maxLookback = Math.max(maxLookback, this.safeMax(periods, 14) + 1);
    }

    // WR
    if (options.wr) {
      const periods =
        typeof options.wr === 'object' && options.wr.periods
          ? options.wr.periods
          : [6, 10];
      maxLookback = Math.max(maxLookback, this.safeMax(periods, 10));
    }

    // BIAS
    if (options.bias) {
      const periods =
        typeof options.bias === 'object' && options.bias.periods
          ? options.bias.periods
          : [6, 12, 24];
      maxLookback = Math.max(maxLookback, this.safeMax(periods, 12));
    }

    // CCI
    if (options.cci) {
      const period =
        typeof options.cci === 'object' && options.cci.period
          ? options.cci.period
          : 14;
      maxLookback = Math.max(maxLookback, period);
    }

    // ATR
    if (options.atr) {
      const period =
        typeof options.atr === 'object' && options.atr.period
          ? options.atr.period
          : 14;
      maxLookback = Math.max(maxLookback, period);
    }

    const buffer = hasEmaBasedIndicator ? 1.5 : 1.2;
    return Math.ceil(maxLookback * buffer);
  }

  /**
   * 计算实际请求的开始日期
   */
  private calcActualStartDate(
    startDate: string,
    tradingDays: number,
    ratio: number = 1.5
  ): string {
    const naturalDays = Math.ceil(tradingDays * ratio);
    const date = new Date(
      parseInt(startDate.slice(0, 4)),
      parseInt(startDate.slice(4, 6)) - 1,
      parseInt(startDate.slice(6, 8))
    );
    date.setDate(date.getDate() - naturalDays);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }

  /**
   * 日期字符串转时间戳
   */
  private dateToTimestamp(dateStr: string): number {
    const normalized = dateStr.includes('-')
      ? dateStr
      : `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    return new Date(normalized).getTime();
  }

  /**
   * 获取带技术指标的历史 K 线
   */
  async getKlineWithIndicators(
    symbol: string,
    options: {
      /** 市场类型，不传则自动识别 */
      market?: MarketType;
      /** K 线周期 */
      period?: 'daily' | 'weekly' | 'monthly';
      /** 复权类型 */
      adjust?: '' | 'qfq' | 'hfq';
      /** 开始日期 YYYYMMDD */
      startDate?: string;
      /** 结束日期 YYYYMMDD */
      endDate?: string;
      /** 技术指标配置 */
      indicators?: IndicatorOptions;
    } = {}
  ): Promise<KlineWithIndicators<HistoryKline | HKUSHistoryKline>[]> {
    const { startDate, endDate, indicators = {} } = options;

    // 步骤 1: 识别市场
    const market = options.market ?? this.detectMarket(symbol);

    // 步骤 2: 计算所需前置 K 线根数
    const requiredBars = this.calcRequiredLookback(indicators);

    // 步骤 3: 计算实际请求的开始日期
    const ratioMap = { A: 1.5, HK: 1.46, US: 1.45 };
    const ratio = ratioMap[market];
    const actualStartDate = startDate
      ? this.calcActualStartDate(startDate, requiredBars, ratio)
      : undefined;

    // 步骤 4: 请求扩展范围的 K 线数据
    const klineOptions = {
      period: options.period,
      adjust: options.adjust,
      startDate: actualStartDate,
      endDate: options.endDate,
    };

    let allKlines: (HistoryKline | HKUSHistoryKline)[];
    switch (market) {
      case 'HK':
        allKlines = await this.getHKHistoryKline(symbol, klineOptions);
        break;
      case 'US':
        allKlines = await this.getUSHistoryKline(symbol, klineOptions);
        break;
      default:
        allKlines = await this.getHistoryKline(symbol, klineOptions);
    }

    // 步骤 5: 检查是否有足够的前置数据（按需补拉策略）
    if (startDate && allKlines.length < requiredBars) {
      switch (market) {
        case 'HK':
          allKlines = await this.getHKHistoryKline(symbol, {
            ...klineOptions,
            startDate: undefined,
          });
          break;
        case 'US':
          allKlines = await this.getUSHistoryKline(symbol, {
            ...klineOptions,
            startDate: undefined,
          });
          break;
        default:
          allKlines = await this.getHistoryKline(symbol, {
            ...klineOptions,
            startDate: undefined,
          });
      }
    }

    // 步骤 6: 计算技术指标
    const withIndicators = addIndicators(allKlines, indicators);

    // 步骤 7: 过滤返回用户请求的日期范围
    if (startDate) {
      const startTs = this.dateToTimestamp(startDate);
      const endTs = endDate ? this.dateToTimestamp(endDate) : Infinity;
      return withIndicators.filter((k) => {
        const ts = this.dateToTimestamp(k.date);
        return ts >= startTs && ts <= endTs;
      });
    }

    return withIndicators;
  }
}

export default StockSDK;
