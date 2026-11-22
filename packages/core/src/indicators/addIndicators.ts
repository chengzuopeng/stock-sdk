import type { AnyHistoryKline } from '../types';
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
  normalizeIndicatorOptions,
  INDICATOR_REGISTRY,
  type IndicatorKey,
} from './registry';

/**
 * 带技术指标的 K 线数据
 */
export type KlineWithIndicators<T extends AnyHistoryKline> = T & {
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
export function addIndicators<T extends AnyHistoryKline>(
  klines: T[],
  options: IndicatorOptions = {}
): KlineWithIndicators<T>[] {
  if (klines.length === 0) {
    return [];
  }
  // 文档简写({ ma: [5,20] } / { rsi: {period:14} })在入口归一为完整形式
  options = normalizeIndicatorOptions(options);

  const context = buildIndicatorContext(klines);
  const indicatorResults = new Map<IndicatorKey, unknown[]>();

  for (const key of getEnabledIndicatorKeys(options)) {
    const descriptor = INDICATOR_REGISTRY[key];
    // 入口已 normalizeIndicatorOptions,此处断言为完整形式
    indicatorResults.set(key, descriptor.compute(context, options[key] as never));
  }

  // F38: 此前逐 bar `Array.from(entries()) + map + Object.fromEntries`(3000 bar ×
  // 5 指标 ≈ 27000 次瞬时分配)。改为循环外一次物化 key/值数组,逐 bar 只做
  // spread clone + plain for 赋值。键顺序(kline 字段在前、指标按启用顺序在后)
  // 与 values[i] 的取值语义不变。
  const keys: IndicatorKey[] = [];
  const valueArrays: unknown[][] = [];
  for (const [key, values] of indicatorResults) {
    keys.push(key);
    valueArrays.push(values);
  }

  return klines.map((kline, i) => {
    const row = { ...kline } as KlineWithIndicators<T>;
    const writable = row as unknown as Record<string, unknown>;
    for (let k = 0; k < keys.length; k++) {
      writable[keys[k]] = valueArrays[k][i];
    }
    return row;
  });
}
