/**
 * 腾讯财经数据解析器
 */
import { safeNumber, safeNumberOrNull } from '../../core';
import type {
  FullQuote,
  SimpleQuote,
  FundFlow,
  PanelLargeOrder,
  HKQuote,
  USQuote,
  FundQuote,
} from '../../types';

/**
 * 解析 A 股全量行情
 */
export function parseFullQuote(f: string[]): FullQuote {
  const bid: { price: number; volume: number }[] = [];
  for (let i = 0; i < 5; i++) {
    bid.push({
      price: safeNumber(f[9 + i * 2]),
      volume: safeNumber(f[10 + i * 2]),
    });
  }
  const ask: { price: number; volume: number }[] = [];
  for (let i = 0; i < 5; i++) {
    ask.push({
      price: safeNumber(f[19 + i * 2]),
      volume: safeNumber(f[20 + i * 2]),
    });
  }
  return {
    marketId: f[0] ?? '',
    name: f[1] ?? '',
    code: f[2] ?? '',
    price: safeNumber(f[3]),
    prevClose: safeNumber(f[4]),
    open: safeNumber(f[5]),
    volume: safeNumber(f[6]),
    outerVolume: safeNumber(f[7]),
    innerVolume: safeNumber(f[8]),
    bid,
    ask,
    time: f[30] ?? '',
    change: safeNumber(f[31]),
    changePercent: safeNumber(f[32]),
    high: safeNumber(f[33]),
    low: safeNumber(f[34]),
    volume2: safeNumber(f[36]),
    amount: safeNumber(f[37]),
    turnoverRate: safeNumberOrNull(f[38]),
    pe: safeNumberOrNull(f[39]),
    amplitude: safeNumberOrNull(f[43]),
    circulatingMarketCap: safeNumberOrNull(f[44]),
    totalMarketCap: safeNumberOrNull(f[45]),
    pb: safeNumberOrNull(f[46]),
    limitUp: safeNumberOrNull(f[47]),
    limitDown: safeNumberOrNull(f[48]),
    volumeRatio: safeNumberOrNull(f[49]),
    avgPrice: safeNumberOrNull(f[51]),
    peStatic: safeNumberOrNull(f[52]),
    peDynamic: safeNumberOrNull(f[53]),
    high52w: safeNumberOrNull(f[67]),
    low52w: safeNumberOrNull(f[68]),
    circulatingShares: safeNumberOrNull(f[72]),
    totalShares: safeNumberOrNull(f[73]),
    raw: f,
  };
}

/**
 * 解析简要行情
 */
export function parseSimpleQuote(f: string[]): SimpleQuote {
  return {
    marketId: f[0] ?? '',
    name: f[1] ?? '',
    code: f[2] ?? '',
    price: safeNumber(f[3]),
    change: safeNumber(f[4]),
    changePercent: safeNumber(f[5]),
    volume: safeNumber(f[6]),
    amount: safeNumber(f[7]),
    marketCap: safeNumberOrNull(f[9]),
    marketType: f[10] ?? '',
    raw: f,
  };
}

/**
 * 解析资金流向
 */
export function parseFundFlow(f: string[]): FundFlow {
  return {
    code: f[0] ?? '',
    mainInflow: safeNumber(f[1]),
    mainOutflow: safeNumber(f[2]),
    mainNet: safeNumber(f[3]),
    mainNetRatio: safeNumber(f[4]),
    retailInflow: safeNumber(f[5]),
    retailOutflow: safeNumber(f[6]),
    retailNet: safeNumber(f[7]),
    retailNetRatio: safeNumber(f[8]),
    totalFlow: safeNumber(f[9]),
    name: f[12] ?? '',
    date: f[13] ?? '',
    raw: f,
  };
}

/**
 * 解析盘口大单
 */
export function parsePanelLargeOrder(f: string[]): PanelLargeOrder {
  return {
    buyLargeRatio: safeNumber(f[0]),
    buySmallRatio: safeNumber(f[1]),
    sellLargeRatio: safeNumber(f[2]),
    sellSmallRatio: safeNumber(f[3]),
    raw: f,
  };
}

/**
 * 解析港股行情
 */
export function parseHKQuote(f: string[]): HKQuote {
  return {
    marketId: f[0] ?? '',
    name: f[1] ?? '',
    code: f[2] ?? '',
    price: safeNumber(f[3]),
    prevClose: safeNumber(f[4]),
    open: safeNumber(f[5]),
    volume: safeNumber(f[6]),
    time: f[30] ?? '',
    change: safeNumber(f[31]),
    changePercent: safeNumber(f[32]),
    high: safeNumber(f[33]),
    low: safeNumber(f[34]),
    amount: safeNumber(f[37]),
    lotSize: safeNumberOrNull(f[40]),
    circulatingMarketCap: safeNumberOrNull(f[44]),
    totalMarketCap: safeNumberOrNull(f[45]),
    currency: f[f.length - 3] ?? '',
    raw: f,
  };
}

/**
 * 解析美股行情
 */
export function parseUSQuote(f: string[]): USQuote {
  return {
    marketId: f[0] ?? '',
    name: f[1] ?? '',
    code: f[2] ?? '',
    price: safeNumber(f[3]),
    prevClose: safeNumber(f[4]),
    open: safeNumber(f[5]),
    volume: safeNumber(f[6]),
    time: f[30] ?? '',
    change: safeNumber(f[31]),
    changePercent: safeNumber(f[32]),
    high: safeNumber(f[33]),
    low: safeNumber(f[34]),
    amount: safeNumber(f[37]),
    turnoverRate: safeNumberOrNull(f[38]),
    pe: safeNumberOrNull(f[39]),
    amplitude: safeNumberOrNull(f[43]),
    totalMarketCap: safeNumberOrNull(f[45]),
    pb: safeNumberOrNull(f[47]),
    high52w: safeNumberOrNull(f[48]),
    low52w: safeNumberOrNull(f[49]),
    raw: f,
  };
}

/**
 * 解析基金行情
 */
export function parseFundQuote(f: string[]): FundQuote {
  return {
    code: f[0] ?? '',
    name: f[1] ?? '',
    nav: safeNumber(f[5]),
    accNav: safeNumber(f[6]),
    change: safeNumber(f[7]),
    navDate: f[8] ?? '',
    raw: f,
  };
}

