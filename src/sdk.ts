import {
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
  TodayTimeline,
  TodayTimelineResponse,
} from './types';
import {
  decodeGBK,
  parseResponse,
  safeNumber,
  safeNumberOrNull,
  chunkArray,
  asyncPool,
} from './utils';

const BASE_URL = 'https://qt.gtimg.cn';
const MINUTE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/minute/query';
const CODE_LIST_URL = 'https://assets.linkdiary.cn/shares/ashare-code.json';
const EM_KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
const EM_TRENDS_URL = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get';

/**
 * 根据股票代码获取东方财富市场代码
 * 支持带前缀(sh/sz/bj)或纯代码
 */
function getMarketCode(symbol: string): string {
  // 如果有前缀，直接根据前缀判断
  if (symbol.startsWith('sh')) return '1';
  if (symbol.startsWith('sz') || symbol.startsWith('bj')) return '0';
  // 纯代码：6 开头为上海(1)，其他为深圳/北交所(0)
  return symbol.startsWith('6') ? '1' : '0';
}

/**
 * 将字符串转换为数字，空值返回 null
 */
function toNumber(val: string | undefined): number | null {
  if (!val || val === '' || val === '-') return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

/**
 * 获取全部 A 股行情的配置选项
 */
export interface GetAllAShareQuotesOptions {
  /** 单次请求的股票数量，默认 500 */
  batchSize?: number;
  /** 最大并发请求数，默认 7 */
  concurrency?: number;
  /** 进度回调函数 */
  onProgress?: (completed: number, total: number) => void;
}

export class StockSDK {
  private baseUrl: string;
  private timeout: number;

  constructor(options: { baseUrl?: string; timeout?: number } = {}) {
    this.baseUrl = options.baseUrl ?? BASE_URL;
    this.timeout = options.timeout ?? 10000;
  }

  private async request(params: string): Promise<{ key: string; fields: string[] }[]> {
    const url = `${this.baseUrl}/?q=${encodeURIComponent(params)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const resp = await fetch(url, {
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const buffer = await resp.arrayBuffer();
      const text = decodeGBK(buffer);
      return parseResponse(text);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ---------- 实时全量行情 ----------
  /**
   * 获取 A 股 / 指数 全量行情
   * @param codes 如 ['sz000858', 'sh600000']
   */
  async getFullQuotes(codes: string[]): Promise<FullQuote[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const data = await this.request(codes.join(','));
    return data
      .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
      .map((d) => this.parseFullQuote(d.fields));
  }

  private parseFullQuote(f: string[]): FullQuote {
    const bid: { price: number; volume: number }[] = [];
    for (let i = 0; i < 5; i++) {
      bid.push({ price: safeNumber(f[9 + i * 2]), volume: safeNumber(f[10 + i * 2]) });
    }
    const ask: { price: number; volume: number }[] = [];
    for (let i = 0; i < 5; i++) {
      ask.push({ price: safeNumber(f[19 + i * 2]), volume: safeNumber(f[20 + i * 2]) });
    }
    return {
      marketId: f[0] ?? '',
      name: f[1] ?? '',
      code: f[2] ?? '',
      price: safeNumber(f[3]),
      prevClose: safeNumber(f[4]),
      open: safeNumber(f[5]),
      volume: safeNumber(f[6]),
      outerVolume: safeNumber(f[7]),
      innerVolume: safeNumber(f[8]),
      bid,
      ask,
      time: f[30] ?? '',
      change: safeNumber(f[31]),
      changePercent: safeNumber(f[32]),
      high: safeNumber(f[33]),
      low: safeNumber(f[34]),
      volume2: safeNumber(f[36]),
      amount: safeNumber(f[37]),
      turnoverRate: safeNumberOrNull(f[38]),
      pe: safeNumberOrNull(f[39]),
      amplitude: safeNumberOrNull(f[43]),
      circulatingMarketCap: safeNumberOrNull(f[44]),
      totalMarketCap: safeNumberOrNull(f[45]),
      pb: safeNumberOrNull(f[46]),
      limitUp: safeNumberOrNull(f[47]),
      limitDown: safeNumberOrNull(f[48]),
      volumeRatio: safeNumberOrNull(f[49]),
      avgPrice: safeNumberOrNull(f[51]),
      peStatic: safeNumberOrNull(f[52]),
      peDynamic: safeNumberOrNull(f[53]),
      high52w: safeNumberOrNull(f[67]),
      low52w: safeNumberOrNull(f[68]),
      circulatingShares: safeNumberOrNull(f[72]),
      totalShares: safeNumberOrNull(f[73]),
      raw: f,
    };
  }

  // ---------- 简要行情 ----------
  /**
   * 获取简要行情
   * @param codes 如 ['sz000858', 'sh000001']（自动添加 s_ 前缀）
   */
  async getSimpleQuotes(codes: string[]): Promise<SimpleQuote[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const prefixedCodes = codes.map((code) => `s_${code}`);
    const data = await this.request(prefixedCodes.join(','));
    return data
      .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
      .map((d) => this.parseSimpleQuote(d.fields));
  }

  private parseSimpleQuote(f: string[]): SimpleQuote {
    return {
      marketId: f[0] ?? '',
      name: f[1] ?? '',
      code: f[2] ?? '',
      price: safeNumber(f[3]),
      change: safeNumber(f[4]),
      changePercent: safeNumber(f[5]),
      volume: safeNumber(f[6]),
      amount: safeNumber(f[7]),
      marketCap: safeNumberOrNull(f[9]),
      marketType: f[10] ?? '',
      raw: f,
    };
  }

  // ---------- 资金流向 ----------
  /**
   * 获取资金流向
   * @param codes 股票代码数组，如 ['sz000858', 'sh600000']（自动添加 ff_ 前缀）
   */
  async getFundFlow(codes: string[]): Promise<FundFlow[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const prefixedCodes = codes.map((code) => `ff_${code}`);
    const data = await this.request(prefixedCodes.join(','));
    return data
      .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
      .map((d) => this.parseFundFlow(d.fields));
  }

  private parseFundFlow(f: string[]): FundFlow {
    return {
      code: f[0] ?? '',
      mainInflow: safeNumber(f[1]),
      mainOutflow: safeNumber(f[2]),
      mainNet: safeNumber(f[3]),
      mainNetRatio: safeNumber(f[4]),
      retailInflow: safeNumber(f[5]),
      retailOutflow: safeNumber(f[6]),
      retailNet: safeNumber(f[7]),
      retailNetRatio: safeNumber(f[8]),
      totalFlow: safeNumber(f[9]),
      name: f[12] ?? '',
      date: f[13] ?? '',
      raw: f,
    };
  }

  // ---------- 盘口大单占比 ----------
  /**
   * 获取盘口大单占比
   * @param codes 股票代码数组，如 ['sz000858', 'sh600000']（自动添加 s_pk 前缀）
   */
  async getPanelLargeOrder(codes: string[]): Promise<PanelLargeOrder[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const prefixedCodes = codes.map((code) => `s_pk${code}`);
    const data = await this.request(prefixedCodes.join(','));
    return data
      .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
      .map((d) => this.parsePanelLargeOrder(d.fields));
  }

  private parsePanelLargeOrder(f: string[]): PanelLargeOrder {
    return {
      buyLargeRatio: safeNumber(f[0]),
      buySmallRatio: safeNumber(f[1]),
      sellLargeRatio: safeNumber(f[2]),
      sellSmallRatio: safeNumber(f[3]),
      raw: f,
    };
  }

  // ---------- 港股扩展行情 ----------
  /**
   * 获取港股扩展行情
   * @param codes 港股代码数组，如 ['09988', '00700']（自动添加 r_hk 前缀）
   */
  async getHKQuotes(codes: string[]): Promise<HKQuote[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const prefixedCodes = codes.map((code) => `r_hk${code}`);
    const data = await this.request(prefixedCodes.join(','));
    return data
      .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
      .map((d) => this.parseHKQuote(d.fields));
  }

  private parseHKQuote(f: string[]): HKQuote {
    return {
      marketId: f[0] ?? '',
      name: f[1] ?? '',
      code: f[2] ?? '',
      price: safeNumber(f[3]),
      prevClose: safeNumber(f[4]),
      open: safeNumber(f[5]),
      volume: safeNumber(f[6]),
      time: f[30] ?? '',
      change: safeNumber(f[31]),
      changePercent: safeNumber(f[32]),
      high: safeNumber(f[33]),
      low: safeNumber(f[34]),
      amount: safeNumber(f[36]),
      lotSize: safeNumberOrNull(f[40]),
      circulatingMarketCap: safeNumberOrNull(f[46]),
      totalMarketCap: safeNumberOrNull(f[47]),
      currency: f[f.length - 3] ?? '',
      raw: f,
    };
  }

  // ---------- 美股简要行情 ----------
  /**
   * 获取美股简要行情
   * @param codes 美股代码数组，如 ['BABA', 'AAPL']（自动添加 s_us 前缀）
   */
  async getUSQuotes(codes: string[]): Promise<USQuote[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const prefixedCodes = codes.map((code) => `s_us${code}`);
    const data = await this.request(prefixedCodes.join(','));
    return data
      .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
      .map((d) => this.parseUSQuote(d.fields));
  }

  private parseUSQuote(f: string[]): USQuote {
    return {
      marketId: f[0] ?? '',
      name: f[1] ?? '',
      code: f[2] ?? '',
      price: safeNumber(f[3]),
      change: safeNumber(f[4]),
      changePercent: safeNumber(f[5]),
      volume: safeNumber(f[6]),
      amount: safeNumber(f[7]),
      marketCap: safeNumberOrNull(f[8]),
      raw: f,
    };
  }

  // ---------- 公募基金行情 ----------
  /**
   * 获取公募基金行情
   * @param codes 基金代码数组，如 ['000001', '110011']（自动添加 jj 前缀）
   */
  async getFundQuotes(codes: string[]): Promise<FundQuote[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const prefixedCodes = codes.map((code) => `jj${code}`);
    const data = await this.request(prefixedCodes.join(','));
    return data
      .filter((d) => d.fields && d.fields.length > 0 && d.fields[0] !== '')
      .map((d) => this.parseFundQuote(d.fields));
  }

  private parseFundQuote(f: string[]): FundQuote {
    return {
      code: f[0] ?? '',
      name: f[1] ?? '',
      nav: safeNumber(f[5]),
      accNav: safeNumber(f[6]),
      change: safeNumber(f[7]),
      navDate: f[8] ?? '',
      raw: f,
    };
  }

  // ---------- 批量混合查询 ----------
  /**
   * 批量混合查询，返回原始解析结果（key + fields）
   * @param params 如 'sz000858,s_sh000001,jj000001'
   */
  async batchRaw(params: string): Promise<{ key: string; fields: string[] }[]> {
    return this.request(params);
  }

  // ---------- 当日分时走势 ----------
  /**
   * 获取当日分时走势数据
   * @param code 股票代码，如 'sz000001' 或 'sh600000'
   * @returns 当日分时数据
   */
  async getTodayTimeline(code: string): Promise<TodayTimelineResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const resp = await fetch(`${MINUTE_URL}?code=${code}`, {
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const json = await resp.json();

      if (json.code !== 0) {
        throw new Error(json.msg || 'API error');
      }

      const stockData = json.data?.[code];
      if (!stockData) {
        return {
          code,
          date: '',
          data: [],
        };
      }

      const rawData: string[] = stockData.data?.data || [];
      const date: string = stockData.data?.date || '';

      // 解析分时数据："0930 11.47 1715 1967105.00"
      // 格式：时间 成交价 累计成交量 累计成交额
      // 注意：接口返回的成交量单位不一致，主板/创业板是"手"，科创板是"股"
      // 需要通过首条数据的 成交额/成交量 与 价格 的比值来判断单位
      // 输出统一为"股"
      let isVolumeInLots = false; // 成交量是否以"手"为单位
      if (rawData.length > 0) {
        const firstParts = rawData[0].split(' ');
        const firstPrice = parseFloat(firstParts[1]) || 0;
        const firstVolume = parseInt(firstParts[2], 10) || 0;
        const firstAmount = parseFloat(firstParts[3]) || 0;
        if (firstVolume > 0 && firstPrice > 0) {
          // 计算 成交额/成交量，如果接近 价格×100，说明单位是"手"
          const ratio = firstAmount / firstVolume;
          if (ratio > firstPrice * 50) {
            isVolumeInLots = true;
          }
        }
      }

      const data: TodayTimeline[] = rawData.map((line: string) => {
        const parts = line.split(' ');
        const timeRaw = parts[0]; // "0930"
        const time = `${timeRaw.slice(0, 2)}:${timeRaw.slice(2, 4)}`; // "09:30"
        const rawVolume = parseInt(parts[2], 10) || 0;
        const amount = parseFloat(parts[3]) || 0;
        // 统一成交量为"股"：如果原始单位是"手"，则乘以 100
        const volume = isVolumeInLots ? rawVolume * 100 : rawVolume;
        // 计算均价：累计成交额 / 累计成交量（股）
        const avgPrice = volume > 0 ? amount / volume : 0;
        return {
          time,
          price: parseFloat(parts[1]) || 0,
          volume,
          amount,
          avgPrice: Math.round(avgPrice * 100) / 100, // 保留两位小数
        };
      });

      return {
        code,
        date,
        data,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ---------- 获取 A 股代码列表 ----------
  /**
   * 从远程获取 A 股代码列表
   * @param includeExchange 是否包含交易所前缀（如 sh、sz、bj），默认 true
   * @returns A 股代码数组
   */
  async getAShareCodeList(includeExchange: boolean = true): Promise<string[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const resp = await fetch(CODE_LIST_URL, {
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const codeList: string[] = await resp.json();

      if (includeExchange) {
        return codeList;
      }

      // 移除交易所前缀（sh、sz、bj）
      return codeList.map((code) => code.replace(/^(sh|sz|bj)/, ''));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ---------- 获取全部 A 股行情 ----------
  /**
   * 获取全部 A 股实时行情（从远程获取股票代码列表）
   * @param options 配置选项
   * @param options.batchSize 单次请求的股票数量，默认 500
   * @param options.concurrency 最大并发请求数，默认 7
   * @param options.onProgress 进度回调函数
   * @returns 全部 A 股的实时行情数据
   */
  async getAllAShareQuotes(options: GetAllAShareQuotesOptions = {}): Promise<FullQuote[]> {
    const { batchSize = 500, concurrency = 7, onProgress } = options;

    // 从远程获取股票代码列表
    const codeList = await this.getAShareCodeList();

    // 将股票代码分批
    const chunks = chunkArray(codeList, batchSize);
    const totalChunks = chunks.length;
    let completedChunks = 0;

    // 创建批量请求任务
    const tasks = chunks.map((chunk) => async () => {
      const result = await this.getFullQuotes(chunk);
      completedChunks++;
      if (onProgress) {
        onProgress(completedChunks, totalChunks);
      }
      return result;
    });

    // 并发执行任务
    const results = await asyncPool(tasks, concurrency);

    // 合并所有结果
    return results.flat();
  }

  /**
   * 获取全部 A 股实时行情（使用自定义股票代码列表）
   * @param codes 股票代码列表
   * @param options 配置选项
   */
  async getAllQuotesByCodes(
    codes: string[],
    options: GetAllAShareQuotesOptions = {}
  ): Promise<FullQuote[]> {
    const { batchSize = 500, concurrency = 7, onProgress } = options;

    const chunks = chunkArray(codes, batchSize);
    const totalChunks = chunks.length;
    let completedChunks = 0;

    const tasks = chunks.map((chunk) => async () => {
      const result = await this.getFullQuotes(chunk);
      completedChunks++;
      if (onProgress) {
        onProgress(completedChunks, totalChunks);
      }
      return result;
    });

    const results = await asyncPool(tasks, concurrency);
    return results.flat();
  }

  // ---------- A 股历史 K 线（东方财富数据源）----------
  /**
   * 获取 A 股历史 K 线（日/周/月）
   * @param symbol 股票代码（6位纯数字，如 '000001'，或带前缀如 'sz000001'）
   * @param options 配置选项
   * @param options.period K线周期：'daily' | 'weekly' | 'monthly'，默认 'daily'
   * @param options.adjust 复权类型：'' (不复权) | 'qfq' (前复权) | 'hfq' (后复权)，默认 'hfq'
   * @param options.startDate 开始日期 YYYYMMDD，默认 '19700101'
   * @param options.endDate 结束日期 YYYYMMDD，默认 '20500101'
   * @returns 历史 K 线数据
   */
  async getHistoryKline(
    symbol: string,
    options: {
      period?: 'daily' | 'weekly' | 'monthly';
      adjust?: '' | 'qfq' | 'hfq';
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<HistoryKline[]> {
    const {
      period = 'daily',
      adjust = 'hfq',
      startDate = '19700101',
      endDate = '20500101',
    } = options;

    // 移除可能的交易所前缀
    const pureSymbol = symbol.replace(/^(sh|sz|bj)/, '');

    const periodMap = { daily: '101', weekly: '102', monthly: '103' } as const;
    const adjustMap = { '': '0', qfq: '1', hfq: '2' } as const;
    const secid = `${getMarketCode(pureSymbol)}.${pureSymbol}`;

    const params = new URLSearchParams({
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f116',
      ut: '7eea3edcaed734bea9cbfc24409ed989',
      klt: periodMap[period],
      fqt: adjustMap[adjust],
      secid,
      beg: startDate,
      end: endDate,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const resp = await fetch(`${EM_KLINE_URL}?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const json = await resp.json();
      const klines: string[] | undefined = json?.data?.klines;

      if (!Array.isArray(klines) || klines.length === 0) {
        return [];
      }

      return klines.map((line) => {
        const [date, open, close, high, low, volume, amount, amplitude, changePercent, change, turnoverRate] =
          line.split(',');
        return {
          date,
          code: pureSymbol,
          open: toNumber(open),
          close: toNumber(close),
          high: toNumber(high),
          low: toNumber(low),
          volume: toNumber(volume),
          amount: toNumber(amount),
          amplitude: toNumber(amplitude),
          changePercent: toNumber(changePercent),
          change: toNumber(change),
          turnoverRate: toNumber(turnoverRate),
        };
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ---------- A 股分钟 K 线 / 分时（东方财富数据源）----------
  /**
   * 获取 A 股分钟 K 线或分时数据
   * @param symbol 股票代码（6位纯数字，如 '000001'，或带前缀如 'sz000001'）
   * @param options 配置选项
   * @param options.period K线周期：'1' (分时) | '5' | '15' | '30' | '60'，默认 '1'
   * @param options.adjust 复权类型（仅 5/15/30/60 分钟有效）：'' | 'qfq' | 'hfq'，默认 'hfq'
   * @param options.startDate 开始时间 'YYYY-MM-DD HH:mm:ss'
   * @param options.endDate 结束时间 'YYYY-MM-DD HH:mm:ss'
   * @returns 分钟 K 线或分时数据
   */
  async getMinuteKline(
    symbol: string,
    options: {
      period?: '1' | '5' | '15' | '30' | '60';
      adjust?: '' | 'qfq' | 'hfq';
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<MinuteTimeline[] | MinuteKline[]> {
    const {
      period = '1',
      adjust = 'hfq',
      startDate = '1979-09-01 09:32:00',
      endDate = '2222-01-01 09:32:00',
    } = options;

    // 移除可能的交易所前缀
    const pureSymbol = symbol.replace(/^(sh|sz|bj)/, '');
    const secid = `${getMarketCode(pureSymbol)}.${pureSymbol}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      if (period === '1') {
        // 1 分钟分时数据，使用 trends2/get 接口
        const params = new URLSearchParams({
          fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
          fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
          ut: '7eea3edcaed734bea9cbfc24409ed989',
          ndays: '5',
          iscr: '0',
          secid,
        });

        const resp = await fetch(`${EM_TRENDS_URL}?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }

        const json = await resp.json();
        const trends: string[] | undefined = json?.data?.trends;

        if (!Array.isArray(trends) || trends.length === 0) {
          return [];
        }

        // 时间范围过滤
        const start = startDate.replace('T', ' ').slice(0, 16);
        const end = endDate.replace('T', ' ').slice(0, 16);

        return trends
          .map((line) => {
            const [time, open, close, high, low, volume, amount, avgPrice] = line.split(',');
            return {
              time,
              open: toNumber(open),
              close: toNumber(close),
              high: toNumber(high),
              low: toNumber(low),
              volume: toNumber(volume),
              amount: toNumber(amount),
              avgPrice: toNumber(avgPrice),
            } as MinuteTimeline;
          })
          .filter((row) => row.time >= start && row.time <= end);
      } else {
        // 5/15/30/60 分钟 K 线，使用 kline/get 接口
        const adjustMap = { '': '0', qfq: '1', hfq: '2' } as const;
        const params = new URLSearchParams({
          fields1: 'f1,f2,f3,f4,f5,f6',
          fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
          ut: '7eea3edcaed734bea9cbfc24409ed989',
          klt: period,
          fqt: adjustMap[adjust],
          secid,
          beg: '0',
          end: '20500000',
        });

        const resp = await fetch(`${EM_KLINE_URL}?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }

        const json = await resp.json();
        const klines: string[] | undefined = json?.data?.klines;

        if (!Array.isArray(klines) || klines.length === 0) {
          return [];
        }

        // 时间范围过滤
        const start = startDate.replace('T', ' ').slice(0, 16);
        const end = endDate.replace('T', ' ').slice(0, 16);

        return klines
          .map((line) => {
            const [time, open, close, high, low, volume, amount, amplitude, changePercent, change, turnoverRate] =
              line.split(',');
            return {
              time,
              open: toNumber(open),
              close: toNumber(close),
              high: toNumber(high),
              low: toNumber(low),
              changePercent: toNumber(changePercent),
              change: toNumber(change),
              volume: toNumber(volume),
              amount: toNumber(amount),
              amplitude: toNumber(amplitude),
              turnoverRate: toNumber(turnoverRate),
            } as MinuteKline;
          })
          .filter((row) => row.time >= start && row.time <= end);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export default StockSDK;

