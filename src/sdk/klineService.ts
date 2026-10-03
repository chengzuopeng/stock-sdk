import { eastmoney } from '../providers';
import type {
  HistoryKline,
  MinuteTimeline,
  MinuteKline,
  HKHistoryKline,
  HKMinuteKline,
  HKMinuteTimeline,
  USHistoryKline,
  USMinuteKline,
  USMinuteTimeline,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class KlineService extends BaseService {
  /**
   * @param source - A 股 K 线的数据源策略（由 SDK 构造参数 `klineFallback` 透传）
   */
  constructor(
    client: RequestClient,
    private readonly source: eastmoney.KlineSourceOptions = {}
  ) {
    super(client);
  }

  getHistoryKline(
    symbol: string,
    options?: eastmoney.HistoryKlineOptions
  ): Promise<HistoryKline[]> {
    return eastmoney.getHistoryKline(this.client, symbol, options, this.source);
  }

  /**
   * A 股历史 K 线，只请求东方财富、不切备用源（不受 `klineFallback` 影响）。
   *
   * 供依赖换手率的计算（筹码分布）使用：腾讯、新浪备用源不提供换手率，
   * 切过去只会算出全是 `null` 的结果。
   */
  getEastmoneyHistoryKline(
    symbol: string,
    options?: eastmoney.HistoryKlineOptions
  ): Promise<HistoryKline[]> {
    return eastmoney.getHistoryKline(this.client, symbol, options, {
      fallback: false,
    });
  }

  getMinuteKline(
    symbol: string,
    options?: eastmoney.MinuteKlineOptions
  ): Promise<MinuteTimeline[] | MinuteKline[]> {
    return eastmoney.getMinuteKline(this.client, symbol, options, this.source);
  }

  getHKHistoryKline(
    symbol: string,
    options?: eastmoney.HKKlineOptions
  ): Promise<HKHistoryKline[]> {
    return eastmoney.getHKHistoryKline(this.client, symbol, options);
  }

  getHKMinuteKline(
    symbol: string,
    options?: eastmoney.HKMinuteKlineOptions
  ): Promise<HKMinuteTimeline[] | HKMinuteKline[]> {
    return eastmoney.getHKMinuteKline(this.client, symbol, options);
  }

  getUSHistoryKline(
    symbol: string,
    options?: eastmoney.USKlineOptions
  ): Promise<USHistoryKline[]> {
    return eastmoney.getUSHistoryKline(this.client, symbol, options);
  }

  getUSMinuteKline(
    symbol: string,
    options?: eastmoney.USMinuteKlineOptions
  ): Promise<USMinuteTimeline[] | USMinuteKline[]> {
    return eastmoney.getUSMinuteKline(this.client, symbol, options);
  }
}
