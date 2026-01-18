// 导出所有计算函数
export { calcSMA, calcEMA, calcWMA, calcMA } from './ma';
export { calcMACD } from './macd';
export { calcBOLL } from './boll';
export { calcKDJ } from './kdj';
export { calcRSI } from './rsi';
export { calcWR } from './wr';
export { calcBIAS } from './bias';
export { calcCCI } from './cci';
export { calcATR } from './atr';

// 新增指标
export { calcOBV } from './obv';
export { calcROC } from './roc';
export { calcDMI } from './dmi';
export { calcSAR } from './sar';
export { calcKC } from './kc';

// 导出类型
export * from './types';

// 导出指标附加器
export { addIndicators } from './addIndicators';
export type { KlineWithIndicators } from './addIndicators';
