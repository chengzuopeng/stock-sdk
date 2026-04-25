import type { HistoryKline, HKUSHistoryKline } from '../types';
import { calcATR } from './atr';
import { calcBIAS } from './bias';
import { calcBOLL } from './boll';
import { calcCCI } from './cci';
import { calcDMI } from './dmi';
import { calcKC } from './kc';
import { calcKDJ } from './kdj';
import { calcMA } from './ma';
import { calcMACD } from './macd';
import { calcOBV } from './obv';
import { calcROC } from './roc';
import { calcRSI } from './rsi';
import { calcSAR } from './sar';
import type { IndicatorOptions, OHLCV } from './types';
import { calcWR } from './wr';

type BaseKline = HistoryKline | HKUSHistoryKline;
export type IndicatorKey = keyof IndicatorOptions;

interface IndicatorComputationContext {
  closes: (number | null)[];
  ohlcv: OHLCV[];
}

interface IndicatorLookback {
  bars: number;
  emaBased?: boolean;
}

interface IndicatorDescriptor<K extends IndicatorKey = IndicatorKey> {
  key: K;
  estimateLookback: (option: IndicatorOptions[K]) => IndicatorLookback;
  compute: (
    context: IndicatorComputationContext,
    option: IndicatorOptions[K]
  ) => unknown[];
}

type IndicatorDescriptorMap = {
  [K in IndicatorKey]: IndicatorDescriptor<K>;
};

function safeMax(values: number[], fallback: number = 0): number {
  if (values.length === 0) {
    return fallback;
  }
  return Math.max(...values);
}

export function buildIndicatorContext<T extends BaseKline>(
  klines: T[]
): IndicatorComputationContext {
  return {
    closes: klines.map((item) => item.close),
    ohlcv: klines.map((item) => ({
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    })),
  };
}

export const INDICATOR_REGISTRY: IndicatorDescriptorMap = {
  ma: {
    key: 'ma',
    estimateLookback: (option) => {
      const cfg = typeof option === 'object' ? option : {};
      const periods = cfg.periods ?? [5, 10, 20, 30, 60, 120, 250];
      const type = cfg.type ?? 'sma';
      return {
        bars: safeMax(periods, 20),
        emaBased: type === 'ema',
      };
    },
    compute: (context, option) =>
      calcMA(context.closes, typeof option === 'object' ? option : {}),
  },
  macd: {
    key: 'macd',
    estimateLookback: (option) => {
      const cfg = typeof option === 'object' ? option : {};
      const long = cfg.long ?? 26;
      const signal = cfg.signal ?? 9;
      return {
        bars: long * 3 + signal,
        emaBased: true,
      };
    },
    compute: (context, option) =>
      calcMACD(context.closes, typeof option === 'object' ? option : {}),
  },
  boll: {
    key: 'boll',
    estimateLookback: (option) => ({
      bars:
        typeof option === 'object' && option.period
          ? option.period
          : 20,
    }),
    compute: (context, option) =>
      calcBOLL(context.closes, typeof option === 'object' ? option : {}),
  },
  kdj: {
    key: 'kdj',
    estimateLookback: (option) => ({
      bars:
        typeof option === 'object' && option.period
          ? option.period
          : 9,
    }),
    compute: (context, option) =>
      calcKDJ(context.ohlcv, typeof option === 'object' ? option : {}),
  },
  rsi: {
    key: 'rsi',
    estimateLookback: (option) => {
      const periods =
        typeof option === 'object' && option.periods
          ? option.periods
          : [6, 12, 24];
      return {
        bars: safeMax(periods, 14) + 1,
      };
    },
    compute: (context, option) =>
      calcRSI(context.closes, typeof option === 'object' ? option : {}),
  },
  wr: {
    key: 'wr',
    estimateLookback: (option) => {
      const periods =
        typeof option === 'object' && option.periods
          ? option.periods
          : [6, 10];
      return { bars: safeMax(periods, 10) };
    },
    compute: (context, option) =>
      calcWR(context.ohlcv, typeof option === 'object' ? option : {}),
  },
  bias: {
    key: 'bias',
    estimateLookback: (option) => {
      const periods =
        typeof option === 'object' && option.periods
          ? option.periods
          : [6, 12, 24];
      return { bars: safeMax(periods, 12) };
    },
    compute: (context, option) =>
      calcBIAS(context.closes, typeof option === 'object' ? option : {}),
  },
  cci: {
    key: 'cci',
    estimateLookback: (option) => ({
      bars:
        typeof option === 'object' && option.period
          ? option.period
          : 14,
    }),
    compute: (context, option) =>
      calcCCI(context.ohlcv, typeof option === 'object' ? option : {}),
  },
  atr: {
    key: 'atr',
    estimateLookback: (option) => ({
      bars:
        typeof option === 'object' && option.period
          ? option.period
          : 14,
    }),
    compute: (context, option) =>
      calcATR(context.ohlcv, typeof option === 'object' ? option : {}),
  },
  obv: {
    key: 'obv',
    estimateLookback: (option) => {
      const maPeriod =
        typeof option === 'object' && option.maPeriod
          ? option.maPeriod
          : 0;
      return { bars: Math.max(2, maPeriod) };
    },
    compute: (context, option) =>
      calcOBV(context.ohlcv, typeof option === 'object' ? option : {}),
  },
  roc: {
    key: 'roc',
    estimateLookback: (option) => {
      const cfg = typeof option === 'object' ? option : {};
      const period = cfg.period ?? 12;
      const signalPeriod = cfg.signalPeriod ?? 0;
      return { bars: period + signalPeriod };
    },
    compute: (context, option) =>
      calcROC(context.ohlcv, typeof option === 'object' ? option : {}),
  },
  dmi: {
    key: 'dmi',
    estimateLookback: (option) => {
      const cfg = typeof option === 'object' ? option : {};
      const period = cfg.period ?? 14;
      const adxPeriod = cfg.adxPeriod ?? period;
      return { bars: period * 2 + adxPeriod };
    },
    compute: (context, option) =>
      calcDMI(context.ohlcv, typeof option === 'object' ? option : {}),
  },
  sar: {
    key: 'sar',
    estimateLookback: () => ({ bars: 5 }),
    compute: (context, option) =>
      calcSAR(context.ohlcv, typeof option === 'object' ? option : {}),
  },
  kc: {
    key: 'kc',
    estimateLookback: (option) => {
      const cfg = typeof option === 'object' ? option : {};
      const emaPeriod = cfg.emaPeriod ?? 20;
      const atrPeriod = cfg.atrPeriod ?? 10;
      return {
        bars: Math.max(emaPeriod * 3, atrPeriod),
        emaBased: true,
      };
    },
    compute: (context, option) =>
      calcKC(context.ohlcv, typeof option === 'object' ? option : {}),
  },
};

export function getEnabledIndicatorKeys(options: IndicatorOptions): IndicatorKey[] {
  return (Object.keys(INDICATOR_REGISTRY) as IndicatorKey[]).filter(
    (key) => Boolean(options[key])
  );
}

export function estimateIndicatorLookback(options: IndicatorOptions): {
  maxLookback: number;
  hasEmaBasedIndicator: boolean;
  requiredBars: number;
} {
  let maxLookback = 0;
  let hasEmaBasedIndicator = false;

  for (const key of getEnabledIndicatorKeys(options)) {
    const descriptor = INDICATOR_REGISTRY[key];
    const lookback = descriptor.estimateLookback(options[key]);
    maxLookback = Math.max(maxLookback, lookback.bars);
    hasEmaBasedIndicator ||= Boolean(lookback.emaBased);
  }

  const buffer = hasEmaBasedIndicator ? 1.5 : 1.2;
  return {
    maxLookback,
    hasEmaBasedIndicator,
    requiredBars: Math.ceil(maxLookback * buffer),
  };
}
