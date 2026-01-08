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

/**
 * 从远程获取 A 股代码列表
 * @param client 请求客户端
 * @param includeExchange 是否包含交易所前缀（如 sh、sz、bj），默认 true
 */
export async function getAShareCodeList(
  client: RequestClient,
  includeExchange: boolean = true
): Promise<string[]> {
  if (cachedAShareCodes) {
    if (includeExchange) {
      return cachedAShareCodes.slice();
    }
    if (!cachedAShareCodesNoExchange) {
      cachedAShareCodesNoExchange = cachedAShareCodes.map((code) =>
        code.replace(/^(sh|sz|bj)/, '')
      );
    }
    return cachedAShareCodesNoExchange.slice();
  }

  const data = await client.get<StockListResponse>(A_SHARE_LIST_URL, {
    responseType: 'json',
  });
  const codeList = data?.list || [];
  cachedAShareCodes = codeList;
  cachedAShareCodesNoExchange = codeList.map((code) =>
    code.replace(/^(sh|sz|bj)/, '')
  );

  if (includeExchange) {
    return codeList.slice();
  }

  // 移除交易所前缀（sh、sz、bj）
  return cachedAShareCodesNoExchange.slice();
}

/**
 * 从远程获取美股代码列表
 * @param client 请求客户端
 * @param includeMarket 是否包含市场前缀（如 105.、106.），默认 true
 */
export async function getUSCodeList(
  client: RequestClient,
  includeMarket: boolean = true
): Promise<string[]> {
  if (cachedUSCodes) {
    if (includeMarket) {
      return cachedUSCodes.slice();
    }
    if (!cachedUSCodesNoMarket) {
      cachedUSCodesNoMarket = cachedUSCodes.map((code) =>
        code.replace(/^\d{3}\./, '')
      );
    }
    return cachedUSCodesNoMarket.slice();
  }

  const data = await client.get<StockListResponse>(US_LIST_URL, {
    responseType: 'json',
  });
  const codeList = data?.list || [];
  cachedUSCodes = codeList;
  cachedUSCodesNoMarket = codeList.map((code) => code.replace(/^\d{3}\./, ''));

  if (includeMarket) {
    return codeList.slice();
  }

  // 移除市场前缀（如 105.、106.、107.）
  return cachedUSCodesNoMarket.slice();
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
