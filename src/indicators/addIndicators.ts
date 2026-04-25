import { HistoryKline, HKUSHistoryKline } from '../types';
import {
  IndicatorOptions,
  MAResult,
  MACDResult,
  BOLLResult,
  KDJResult,
  RSIResult,
  WRResult,
  BIASResult,
  CCIResult,
  ATRResult,
  OBVResult,
  ROCResult,
  DMIResult,
  SARResult,
  KCResult,
} from './types';
import {
  buildIndicatorContext,
  getEnabledIndicatorKeys,
  INDICATOR_REGISTRY,
  type IndicatorKey,
} from './registry';

/**
 * 带技术指标的 K 线数据
 */
export type KlineWithIndicators<T extends HistoryKline | HKUSHistoryKline> = T & {
  ma?: MAResult;
  macd?: MACDResult;
  boll?: BOLLResult;
  kdj?: KDJResult;
  rsi?: RSIResult;
  wr?: WRResult;
  bias?: BIASResult;
  cci?: CCIResult;
  atr?: ATRResult;
  obv?: OBVResult;
  roc?: ROCResult;
  dmi?: DMIResult;
  sar?: SARResult;
  kc?: KCResult;
};

/**
 * 为 K 线数据添加技术指标
 */
export function addIndicators<T extends HistoryKline | HKUSHistoryKline>(
  klines: T[],
  options: IndicatorOptions = {}
): KlineWithIndicators<T>[] {
  if (klines.length === 0) {
    return [];
  }

  const context = buildIndicatorContext(klines);
  const indicatorResults = new Map<IndicatorKey, unknown[]>();

  for (const key of getEnabledIndicatorKeys(options)) {
    const descriptor = INDICATOR_REGISTRY[key];
    indicatorResults.set(key, descriptor.compute(context, options[key]));
  }

  return klines.map((kline, i) => ({
    ...kline,
    ...Object.fromEntries(
      Array.from(indicatorResults.entries()).map(([key, values]) => [key, values[i]])
    ),
  }));
}
