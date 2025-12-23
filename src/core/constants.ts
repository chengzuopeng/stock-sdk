/**
 * 常量定义
 */

// 腾讯财经 API
export const TENCENT_BASE_URL = 'https://qt.gtimg.cn';
export const TENCENT_MINUTE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/minute/query';

// 股票代码列表
export const A_SHARE_LIST_URL = 'https://assets.linkdiary.cn/shares/zh_a_list.json';
export const US_LIST_URL = 'https://assets.linkdiary.cn/shares/us_list.json';
export const HK_LIST_URL = 'https://assets.linkdiary.cn/shares/hk_list.json';

/** @deprecated 使用 A_SHARE_LIST_URL 代替 */
export const CODE_LIST_URL = A_SHARE_LIST_URL;

// 东方财富 API
export const EM_KLINE_URL = 'https://push2his.eastmoney.com/api/qt/stock/kline/get';
export const EM_TRENDS_URL = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get';
export const EM_HK_KLINE_URL = 'https://33.push2his.eastmoney.com/api/qt/stock/kline/get';
export const EM_US_KLINE_URL = 'https://63.push2his.eastmoney.com/api/qt/stock/kline/get';

// 默认配置
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_BATCH_SIZE = 500;
export const MAX_BATCH_SIZE = 500;
export const DEFAULT_CONCURRENCY = 7;

