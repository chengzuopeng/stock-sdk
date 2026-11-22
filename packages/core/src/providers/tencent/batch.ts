/**
 * 腾讯财经 - 批量操作
 */
import {
  RequestClient,
  A_SHARE_LIST_URL,
  US_LIST_URL,
  HK_LIST_URL,
  FUND_LIST_URL,
  getClientScopedCache,
  UpstreamEmptyError,
  chunkArray,
  asyncPool,
  assertPositiveInteger,
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
} from '../../core';
import type { FullQuote, HKQuote, USQuote } from '../../types';
import { EXCHANGE_TO_SECID_PREFIX } from '../../symbols';
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

/** R7-11: 代码表缓存按 client 隔离 —— 此前模块级共享导致 mock/代理实例
 *  取回的数据串给其它 StockSDK 实例最长 6 小时（首个调用者的 client 独占取数）。 */
const CODE_LIST_CACHE_OPTIONS = { defaultTTL: 6 * 60 * 60 * 1000, maxSize: 16 };

async function fetchJsonCodeList(
  client: RequestClient,
  cacheKey: string,
  url: string
): Promise<string[]> {
  const codeListCache = getClientScopedCache<string[]>(
    client,
    'tencent:code-lists',
    CODE_LIST_CACHE_OPTIONS
  );
  return codeListCache.getOrFetch(cacheKey, async () => {
    const data = await client.get<StockListResponse>(url, {
      responseType: 'json',
    });
    const list = data?.list;
    // 全市场代码列表不可能为空：success:false / 缺 list / 空数组均视为上游异常，
    // 抛错且【不落缓存】。此前 {success:false} 会把 [] 缓存 6 小时，
    // codes.* / batch.* 全程静默返回空结果。
    if (data?.success === false || !Array.isArray(list) || list.length === 0) {
      throw new UpstreamEmptyError(
        `代码列表接口返回空数据: ${cacheKey}`,
        'tencent',
        url
      );
    }
    return list;
  });
}

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
   * - 'bj': 北交所（4/8 开头，新代码段 920 开头）
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
   * - 'bj': 北交所（4/8 开头，新代码段 920 开头）
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
      // 北交所：传统代码 4/8 开头（如 830799、870204、430047），新代码段 920 开头。
      // 旧实现只判 startsWith('92')，会漏掉占绝大多数的 4/8 开头北交所股票。
      return (
        pureCode.startsWith('4') ||
        pureCode.startsWith('8') ||
        pureCode.startsWith('92')
      );
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
  options?: GetAShareCodeListOptions
): Promise<string[]> {
  const simple = options?.simple ?? false;
  const market = options?.market;

  const allCodes = await fetchJsonCodeList(client, 'a-share:full', A_SHARE_LIST_URL);

  // 筛选市场
  let result = allCodes;
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
  options?: GetUSCodeListOptions
): Promise<string[]> {
  const simple = options?.simple ?? false;
  const market = options?.market;

  const allCodes = await fetchJsonCodeList(client, 'us:full', US_LIST_URL);
  let result = allCodes.slice();

  // 筛选市场
  // F41: 前缀映射复用 symbols/adapters 的 EXCHANGE_TO_SECID_PREFIX
  // (NASDAQ/NYSE/AMEX → 105/106/107),不再本地重复声明一份。
  if (market) {
    const prefix = `${EXCHANGE_TO_SECID_PREFIX[market]}.`;
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
  const codes = await fetchJsonCodeList(client, 'hk:full', HK_LIST_URL);
  return codes.slice();
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

  const results = await asyncPool(tasks, concurrency, true);
  return results.flat();
}

/**
 * 港股批量行情选项。
 * 港股只有一个交易所（无 sh/sz/bj 子市场之分），故不提供 A 股的 `market` 过滤字段，
 * 避免误导调用方传入一个被静默忽略的过滤条件。
 */
export type GetAllHKQuotesOptions = Omit<GetAllAShareQuotesOptions, 'market'>;

/**
 * 批量获取港股行情
 * @param client 请求客户端
 * @param codes 股票代码列表
 * @param options 配置选项
 */
export async function getAllHKQuotesByCodes(
  client: RequestClient,
  codes: string[],
  options: GetAllHKQuotesOptions = {}
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

  const results = await asyncPool(tasks, concurrency, true);
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

  const results = await asyncPool(tasks, concurrency, true);
  return results.flat();
}

/**
 * 从远程获取基金代码列表
 * @param client 请求客户端
 * @returns 基金代码数组（6 位代码）
 *
 * @example
 * const codes = await getFundCodeList(client);
 * console.log(codes.length); // 26068
 * console.log(codes.slice(0, 5)); // ['000001', '000002', ...]
 */
export async function getFundCodeList(
  client: RequestClient
): Promise<string[]> {
  const codeListCache = getClientScopedCache<string[]>(
    client,
    'tencent:code-lists',
    CODE_LIST_CACHE_OPTIONS
  );
  const codes = await codeListCache.getOrFetch('fund:full', async () => {
    const text = await client.get<string>(FUND_LIST_URL, {
      responseType: 'text',
    });
    const parts = (text ?? '').split(',');
    const list = parts.slice(1).filter((code) => code.trim());
    // 与 fetchJsonCodeList 同理：空列表必为上游异常，抛错且不落缓存
    if (list.length === 0) {
      throw new UpstreamEmptyError(
        '基金代码列表接口返回空数据',
        'tencent',
        FUND_LIST_URL
      );
    }
    return list;
  });

  return codes.slice();
}
