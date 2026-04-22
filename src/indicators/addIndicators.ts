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
import { calcMA } from './ma';
import { calcMACD } from './macd';
import { calcBOLL } from './boll';
import { calcKDJ } from './kdj';
import { calcRSI } from './rsi';
import { calcWR } from './wr';
import { calcBIAS } from './bias';
import { calcCCI } from './cci';
import { calcATR } from './atr';
import { calcOBV } from './obv';
import { calcROC } from './roc';
import { calcDMI } from './dmi';
import { calcSAR } from './sar';
import { calcKC } from './kc';

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
  const obvResult = options.obv
    ? calcOBV(ohlcv, typeof options.obv === 'object' ? options.obv : {})
    : null;
  const rocResult = options.roc
    ? calcROC(ohlcv, typeof options.roc === 'object' ? options.roc : {})
    : null;
  const dmiResult = options.dmi
    ? calcDMI(ohlcv, typeof options.dmi === 'object' ? options.dmi : {})
    : null;
  const sarResult = options.sar
    ? calcSAR(ohlcv, typeof options.sar === 'object' ? options.sar : {})
    : null;
  const kcResult = options.kc
    ? calcKC(ohlcv, typeof options.kc === 'object' ? options.kc : {})
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
    ...(obvResult && { obv: obvResult[i] }),
    ...(rocResult && { roc: rocResult[i] }),
    ...(dmiResult && { dmi: dmiResult[i] }),
    ...(sarResult && { sar: sarResult[i] }),
    ...(kcResult && { kc: kcResult[i] }),
  }));
}
