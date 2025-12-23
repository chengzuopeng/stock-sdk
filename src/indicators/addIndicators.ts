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
} from './types';
import { calcMA } from './ma';
import { calcMACD } from './macd';
import { calcBOLL } from './boll';
import { calcKDJ } from './kdj';
import { calcRSI } from './rsi';
import { calcWR } from './wr';
import { calcBIAS } from './bias';
import { calcCCI } from './cci';
import { calcATR } from './atr';

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

  const closes = klines.map((k) => k.close);
  const ohlcv = klines.map((k) => ({
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
    volume: k.volume,
  }));

  const maResult = options.ma
    ? calcMA(closes, typeof options.ma === 'object' ? options.ma : {})
    : null;
  const macdResult = options.macd
    ? calcMACD(closes, typeof options.macd === 'object' ? options.macd : {})
    : null;
  const bollResult = options.boll
    ? calcBOLL(closes, typeof options.boll === 'object' ? options.boll : {})
    : null;
  const kdjResult = options.kdj
    ? calcKDJ(ohlcv, typeof options.kdj === 'object' ? options.kdj : {})
    : null;
  const rsiResult = options.rsi
    ? calcRSI(closes, typeof options.rsi === 'object' ? options.rsi : {})
    : null;
  const wrResult = options.wr
    ? calcWR(ohlcv, typeof options.wr === 'object' ? options.wr : {})
    : null;
  const biasResult = options.bias
    ? calcBIAS(closes, typeof options.bias === 'object' ? options.bias : {})
    : null;
  const cciResult = options.cci
    ? calcCCI(ohlcv, typeof options.cci === 'object' ? options.cci : {})
    : null;
  const atrResult = options.atr
    ? calcATR(ohlcv, typeof options.atr === 'object' ? options.atr : {})
    : null;

  return klines.map((kline, i) => ({
    ...kline,
    ...(maResult && { ma: maResult[i] }),
    ...(macdResult && { macd: macdResult[i] }),
    ...(bollResult && { boll: bollResult[i] }),
    ...(kdjResult && { kdj: kdjResult[i] }),
    ...(rsiResult && { rsi: rsiResult[i] }),
    ...(wrResult && { wr: wrResult[i] }),
    ...(biasResult && { bias: biasResult[i] }),
    ...(cciResult && { cci: cciResult[i] }),
    ...(atrResult && { atr: atrResult[i] }),
  }));
}

