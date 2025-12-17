import {
  FullQuote,
  SimpleQuote,
  FundFlow,
  PanelLargeOrder,
  HKQuote,
  USQuote,
  FundQuote,
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
const CODE_LIST_URL = 'https://assets.linkdiary.cn/shares/ashare-code.json';

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
   * @param codes 如 ['ff_sz000858']
   */
  async getFundFlow(codes: string[]): Promise<FundFlow[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const data = await this.request(codes.join(','));
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
   * @param codes 如 ['s_pksz000858']
   */
  async getPanelLargeOrder(codes: string[]): Promise<PanelLargeOrder[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const data = await this.request(codes.join(','));
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
   * @param codes 如 ['r_hk09988']
   */
  async getHKQuotes(codes: string[]): Promise<HKQuote[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const data = await this.request(codes.join(','));
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
   * @param codes 如 ['s_usBABA']
   */
  async getUSQuotes(codes: string[]): Promise<USQuote[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const data = await this.request(codes.join(','));
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
   * @param codes 如 ['jj000001']
   */
  async getFundQuotes(codes: string[]): Promise<FundQuote[]> {
    if (!codes || codes.length === 0) {
      return [];
    }
    const data = await this.request(codes.join(','));
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

  // ---------- 获取 A 股代码列表 ----------
  /**
   * 从远程获取 A 股代码列表
   * @returns A 股代码数组
   */
  async getAShareCodeList(): Promise<string[]> {
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
      return codeList;
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
}

export default StockSDK;

