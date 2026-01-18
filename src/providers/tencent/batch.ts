/**
 * 腾讯财经 - 批量操作
 */
import {
  RequestClient,
  A_SHARE_LIST_URL,
  US_LIST_URL,
  HK_LIST_URL,
  chunkArray,
  asyncPool,
  assertPositiveInteger,
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
} from '../../core';
import type { FullQuote, HKQuote, USQuote } from '../../types';
import { getFullQuotes } from './quote';
import { getHKQuotes } from './hkQuote';
import { getUSQuotes } from './usQuote';

/**
 * 股票列表接口响应格式
 */
interface StockListResponse {
  success: boolean;
  list: string[];
}

let cachedAShareCodes: string[] | null = null;
let cachedAShareCodesNoExchange: string[] | null = null;
let cachedUSCodes: string[] | null = null;
let cachedUSCodesNoMarket: string[] | null = null;
let cachedHKCodes: string[] | null = null;

/**
 * A 股市场/板块类型
 * - sh: 上交所（6 开头）
 * - sz: 深交所（0 和 3 开头，包含创业板）
 * - bj: 北交所（92 开头）
 * - kc: 科创板（688 开头）
 * - cy: 创业板（30 开头）
 */
export type AShareMarket = 'sh' | 'sz' | 'bj' | 'kc' | 'cy';

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
  /**
   * 筛选特定的交易所或板块
   * - 不传或 undefined: 返回全部 A 股
   * - 'sh': 上交所（6 开头，包含科创板）
   * - 'sz': 深交所（0 和 3 开头，包含创业板）
   * - 'bj': 北交所（92 开头）
   * - 'kc': 科创板（688 开头）
   * - 'cy': 创业板（30 开头）
   */
  market?: AShareMarket;
}

/**
 * 获取全部美股行情的配置选项
 */
export interface GetAllUSQuotesOptions {
  /** 单次请求的股票数量，默认 500 */
  batchSize?: number;
  /** 最大并发请求数，默认 7 */
  concurrency?: number;
  /** 进度回调函数 */
  onProgress?: (completed: number, total: number) => void;
  /**
   * 筛选特定市场
   * - 'NASDAQ': 纳斯达克 (105)
   * - 'NYSE': 纽交所 (106)
   * - 'AMEX': 美交所 (107)
   */
  market?: USMarket;
}

/**
 * 获取 A 股代码列表的配置选项
 */
export interface GetAShareCodeListOptions {
  /**
   * 是否返回简化的代码（不含交易所前缀）
   * - false（默认）: 返回带前缀的完整代码，如 'sh600000', 'sz000001'
   * - true: 返回纯数字代码，如 '600000', '000001'
   */
  simple?: boolean;
  /**
   * 筛选特定的交易所或板块
   * - 不传或 undefined: 返回全部 A 股
   * - 'sh': 上交所（6 开头，包含科创板）
   * - 'sz': 深交所（0 和 3 开头，包含创业板）
   * - 'bj': 北交所（92 开头）
   * - 'kc': 科创板（688 开头）
   * - 'cy': 创业板（30 开头）
   */
  market?: AShareMarket;
}

/**
 * 根据市场类型筛选股票代码
 * @param code 带交易所前缀的股票代码，如 'sh600000'
 * @param market 市场类型
 */
function matchMarket(code: string, market: AShareMarket): boolean {
  // 提取纯数字代码
  const pureCode = code.replace(/^(sh|sz|bj)/, '');

  switch (market) {
    case 'sh':
      // 上交所：6 开头
      return pureCode.startsWith('6');
    case 'sz':
      // 深交所：0 开头或 3 开头（包含创业板）
      return pureCode.startsWith('0') || pureCode.startsWith('3');
    case 'bj':
      // 北交所：92 开头
      return pureCode.startsWith('92');
    case 'kc':
      // 科创板：688 开头
      return pureCode.startsWith('688');
    case 'cy':
      // 创业板：30 开头
      return pureCode.startsWith('30');
    default:
      return true;
  }
}

/**
 * 从远程获取 A 股代码列表
 * @param client 请求客户端
 * @param options 配置选项或布尔值（向后兼容）
 *
 * @example
 * // 获取全部 A 股（带交易所前缀）
 * const codes = await getAShareCodeList(client);
 *
 * @example
 * // 获取全部 A 股（不带交易所前缀）
 * const codes = await getAShareCodeList(client, { simple: true });
 *
 * @example
 * // 获取科创板股票
 * const codes = await getAShareCodeList(client, { market: 'kc' });
 *
 * @example
 * // 获取创业板股票（不带前缀）
 * const codes = await getAShareCodeList(client, { simple: true, market: 'cy' });
 */
export async function getAShareCodeList(
  client: RequestClient,
  options?: GetAShareCodeListOptions | boolean
): Promise<string[]> {
  // 向后兼容：处理布尔参数
  let simple = false;
  let market: AShareMarket | undefined;

  if (typeof options === 'boolean') {
    // 旧 API：includeExchange = true 表示包含前缀，对应 simple = false
    simple = !options;
  } else if (options) {
    simple = options.simple ?? false;
    market = options.market;
  }

  // 确保缓存已加载
  if (!cachedAShareCodes) {
    const data = await client.get<StockListResponse>(A_SHARE_LIST_URL, {
      responseType: 'json',
    });
    const codeList = data?.list || [];
    cachedAShareCodes = codeList;
    cachedAShareCodesNoExchange = codeList.map((code) =>
      code.replace(/^(sh|sz|bj)/, '')
    );
  }

  // 筛选市场
  let result = cachedAShareCodes!;
  if (market) {
    result = result.filter((code) => matchMarket(code, market));
  }

  // 移除交易所前缀
  if (simple) {
    return result.map((code) => code.replace(/^(sh|sz|bj)/, ''));
  }

  return result.slice();
}

// 美股市场类型
export type USMarket = 'NASDAQ' | 'NYSE' | 'AMEX';

export interface GetUSCodeListOptions {
  /** 是否移除市场前缀，默认 false */
  simple?: boolean;
  /** 筛选特定市场 */
  market?: USMarket;
}

// 市场前缀映射
const US_MARKET_PREFIX: Record<USMarket, string> = {
  NASDAQ: '105.',
  NYSE: '106.',
  AMEX: '107.',
};

/**
 * 从远程获取美股代码列表
 * @param client 请求客户端
 * @param options 配置选项
 *
 * @example
 * // 获取全部美股（带前缀）
 * const codes = await getUSCodeList(client);
 *
 * @example
 * // 获取全部美股（不带前缀）
 * const codes = await getUSCodeList(client, { simple: true });
 *
 * @example
 * // 筛选纳斯达克股票
 * const codes = await getUSCodeList(client, { market: 'NASDAQ' });
 */
export async function getUSCodeList(
  client: RequestClient,
  options?: GetUSCodeListOptions | boolean
): Promise<string[]> {
  // 向后兼容：处理布尔参数
  let simple = false;
  let market: USMarket | undefined;

  if (typeof options === 'boolean') {
    // 旧 API：includeMarket = true 表示包含前缀，对应 simple = false
    simple = !options;
  } else if (options) {
    simple = options.simple ?? false;
    market = options.market;
  }

  // 确保缓存已加载
  if (!cachedUSCodes) {
    const data = await client.get<StockListResponse>(US_LIST_URL, {
      responseType: 'json',
    });
    cachedUSCodes = data?.list || [];
    cachedUSCodesNoMarket = cachedUSCodes.map((code) =>
      code.replace(/^\d{3}\./, '')
    );
  }

  let result = cachedUSCodes.slice();

  // 筛选市场
  if (market) {
    const prefix = US_MARKET_PREFIX[market];
    result = result.filter((code) => code.startsWith(prefix));
  }

  // 移除市场前缀
  if (simple) {
    return result.map((code) => code.replace(/^\d{3}\./, ''));
  }

  return result;
}

/**
 * 从远程获取港股代码列表
 * @param client 请求客户端
 */
export async function getHKCodeList(
  client: RequestClient
): Promise<string[]> {
  if (cachedHKCodes) {
    return cachedHKCodes.slice();
  }

  const data = await client.get<StockListResponse>(HK_LIST_URL, {
    responseType: 'json',
  });
  cachedHKCodes = data?.list || [];
  return cachedHKCodes.slice();
}

/**
 * 批量获取股票行情
 * @param client 请求客户端
 * @param codes 股票代码列表
 * @param options 配置选项
 */
export async function getAllQuotesByCodes(
  client: RequestClient,
  codes: string[],
  options: GetAllAShareQuotesOptions = {}
): Promise<FullQuote[]> {
  const {
    batchSize: inputBatchSize = DEFAULT_BATCH_SIZE,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
  } = options;
  assertPositiveInteger(inputBatchSize, 'batchSize');
  assertPositiveInteger(concurrency, 'concurrency');

  // batchSize 最大为 500
  const batchSize = Math.min(inputBatchSize, MAX_BATCH_SIZE);

  const chunks = chunkArray(codes, batchSize);
  const totalChunks = chunks.length;
  let completedChunks = 0;

  const tasks = chunks.map((chunk) => async () => {
    const result = await getFullQuotes(client, chunk);
    completedChunks++;
    if (onProgress) {
      onProgress(completedChunks, totalChunks);
    }
    return result;
  });

  const results = await asyncPool(tasks, concurrency);
  return results.flat();
}

/**
 * 批量获取港股行情
 * @param client 请求客户端
 * @param codes 股票代码列表
 * @param options 配置选项
 */
export async function getAllHKQuotesByCodes(
  client: RequestClient,
  codes: string[],
  options: GetAllAShareQuotesOptions = {}
): Promise<HKQuote[]> {
  const {
    batchSize: inputBatchSize = DEFAULT_BATCH_SIZE,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
  } = options;
  assertPositiveInteger(inputBatchSize, 'batchSize');
  assertPositiveInteger(concurrency, 'concurrency');

  // batchSize 最大为 500
  const batchSize = Math.min(inputBatchSize, MAX_BATCH_SIZE);

  const chunks = chunkArray(codes, batchSize);
  const totalChunks = chunks.length;
  let completedChunks = 0;

  const tasks = chunks.map((chunk) => async () => {
    const result = await getHKQuotes(client, chunk);
    completedChunks++;
    if (onProgress) {
      onProgress(completedChunks, totalChunks);
    }
    return result;
  });

  const results = await asyncPool(tasks, concurrency);
  return results.flat();
}

/**
 * 批量获取美股行情
 * @param client 请求客户端
 * @param codes 股票代码列表（不含市场前缀，如 AAPL、MSFT）
 * @param options 配置选项
 */
export async function getAllUSQuotesByCodes(
  client: RequestClient,
  codes: string[],
  options: GetAllAShareQuotesOptions = {}
): Promise<USQuote[]> {
  const {
    batchSize: inputBatchSize = DEFAULT_BATCH_SIZE,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
  } = options;
  assertPositiveInteger(inputBatchSize, 'batchSize');
  assertPositiveInteger(concurrency, 'concurrency');

  // batchSize 最大为 500
  const batchSize = Math.min(inputBatchSize, MAX_BATCH_SIZE);

  const chunks = chunkArray(codes, batchSize);
  const totalChunks = chunks.length;
  let completedChunks = 0;

  const tasks = chunks.map((chunk) => async () => {
    const result = await getUSQuotes(client, chunk);
    completedChunks++;
    if (onProgress) {
      onProgress(completedChunks, totalChunks);
    }
    return result;
  });

  const results = await asyncPool(tasks, concurrency);
  return results.flat();
}
