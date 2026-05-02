/**
 * 东方财富历史 K 线 provider 工厂
 */
import {
  RequestClient,
  EM_PUSH_TOKEN,
  assertAdjustType,
  assertKlinePeriod,
  getAdjustCode,
  getPeriodCode,
} from '../../core';
import type { HKUSHistoryKline } from '../../types';
import { fetchEmHistoryKline, parseEmKlineCsv } from './utils';

/**
 * 通用历史 K 线请求选项
 */
export interface HistoryKlineRequestOptions {
  /** K 线周期 */
  period?: 'daily' | 'weekly' | 'monthly';
  /** 复权类型 */
  adjust?: '' | 'qfq' | 'hfq';
  /** 开始日期 YYYYMMDD */
  startDate?: string;
  /** 结束日期 YYYYMMDD */
  endDate?: string;
}

/**
 * 归一化后的 symbol 信息
 */
interface NormalizedHistorySymbol {
  secid: string;
  fallbackCode: string;
}

/**
 * 历史 K 线 provider 工厂配置
 */
interface HistoryKlineProviderFactoryOptions {
  url: string;
  normalizeSymbol: (symbol: string) => NormalizedHistorySymbol;
  resolveResultMeta?: (
    symbol: string,
    normalizedSymbol: NormalizedHistorySymbol,
    response: { code?: string; name?: string }
  ) => { code: string; name: string };
}

/**
 * 创建港股 / 美股历史 K 线 provider。
 */
export function createHistoryKlineProvider(
  config: HistoryKlineProviderFactoryOptions
) {
  return async function getHistoryKline(
    client: RequestClient,
    symbol: string,
    options: HistoryKlineRequestOptions = {}
  ): Promise<HKUSHistoryKline[]> {
    const {
      period = 'daily',
      adjust = 'qfq',
      startDate = '19700101',
      endDate = '20500101',
    } = options;
    assertKlinePeriod(period);
    assertAdjustType(adjust);

    const normalizedSymbol = config.normalizeSymbol(symbol);
    const params = new URLSearchParams({
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      ut: EM_PUSH_TOKEN,
      klt: getPeriodCode(period),
      fqt: getAdjustCode(adjust),
      secid: normalizedSymbol.secid,
      beg: startDate,
      end: endDate,
      lmt: '1000000',
    });

    const { klines, name, code } = await fetchEmHistoryKline(
      client,
      config.url,
      params
    );

    if (klines.length === 0) {
      return [];
    }

    const resolvedMeta = config.resolveResultMeta
      ? config.resolveResultMeta(symbol, normalizedSymbol, { code, name })
      : {
          code: code || normalizedSymbol.fallbackCode,
          name: name || '',
        };

    return klines.map((line) => {
      const item = parseEmKlineCsv(line);
      return {
        ...item,
        code: resolvedMeta.code,
        name: resolvedMeta.name,
      };
    });
  };
}
