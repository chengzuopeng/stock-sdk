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
  buildTimeMeta,
  type MarketTz,
} from '../../core';
import type { HKHistoryKline, USHistoryKline } from '../../types';
import {
  fetchEmHistoryKline,
  parseEmKlineCsv,
  type EmKlineItem,
} from './utils';

/**
 * 通用历史 K 线请求选项
 */
export interface HistoryKlineRequestOptions {
  /** K 线周期 @default 'daily' */
  period?: 'daily' | 'weekly' | 'monthly';
  /**
   * 复权类型
   *
   * - `'qfq'` 前复权(默认)
   * - `'hfq'` 后复权
   * - `''` 不复权
   *
   * 详见 [复权说明](https://stock-sdk.linkdiary.cn/guide/dividend-adjustment.html)。
   *
   * @default 'qfq'
   */
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
 * 单条 K 线在带上 timestamp+tz+code+name 之后的"中间产物"。
 * 工厂会把它再交给 caller 的 `enrichItem` 来注入市场本地化字段。
 */
interface BaseForeignKlineRow extends EmKlineItem {
  timestamp: number | null;
  tz: MarketTz;
  code: string;
  name: string;
}

/**
 * 历史 K 线 provider 工厂配置
 *
 * @template T 该 provider 最终返回的具体类型 (HKHistoryKline / USHistoryKline)
 */
interface HistoryKlineProviderFactoryOptions<T> {
  url: string;
  /** 该市场的时区,用于把 K 线日期转成 UTC 时间戳 */
  tz: MarketTz;
  normalizeSymbol: (symbol: string) => NormalizedHistorySymbol;
  resolveResultMeta?: (
    symbol: string,
    normalizedSymbol: NormalizedHistorySymbol,
    response: { code?: string; name?: string }
  ) => { code: string; name: string };
  /**
   * 在通用字段之上注入市场本地化字段 (currency / lotSize / 等)。
   * 必填,以保证返回类型 `T` 比 union 更具体。
   */
  enrichItem: (base: BaseForeignKlineRow) => T;
}

/**
 * 创建港股 / 美股历史 K 线 provider。
 */
export function createHistoryKlineProvider<
  T extends HKHistoryKline | USHistoryKline,
>(config: HistoryKlineProviderFactoryOptions<T>) {
  return async function getHistoryKline(
    client: RequestClient,
    symbol: string,
    options: HistoryKlineRequestOptions = {}
  ): Promise<T[]> {
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
      const meta = buildTimeMeta(item.date, config.tz);
      const base: BaseForeignKlineRow = {
        ...item,
        timestamp: meta.timestamp,
        tz: meta.tz,
        code: resolvedMeta.code,
        name: resolvedMeta.name,
      };
      return config.enrichItem(base);
    });
  };
}
