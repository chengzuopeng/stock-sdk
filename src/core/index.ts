/**
 * Core 模块导出
 */

// 请求客户端
export { RequestClient, type RequestClientOptions } from './request';

// 解析器
export {
  decodeGBK,
  parseResponse,
  safeNumber,
  safeNumberOrNull,
  toNumber,
} from './parser';

// 工具函数
export {
  chunkArray,
  asyncPool,
  assertPositiveInteger,
  assertKlinePeriod,
  assertMinutePeriod,
  assertAdjustType,
  getMarketCode,
  getPeriodCode,
  getAdjustCode,
} from './utils';

// 常量
export {
  TENCENT_BASE_URL,
  TENCENT_MINUTE_URL,
  A_SHARE_LIST_URL,
  US_LIST_URL,
  HK_LIST_URL,
  CODE_LIST_URL,
  EM_KLINE_URL,
  EM_TRENDS_URL,
  EM_HK_KLINE_URL,
  EM_US_KLINE_URL,
  DEFAULT_TIMEOUT,
  DEFAULT_BATCH_SIZE,
  MAX_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
} from './constants';
