import { eastmoney } from '../providers';
import type {
  HistoryKline,
  MinuteTimeline,
  MinuteKline,
  HKUSHistoryKline,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class KlineService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  getHistoryKline(
    symbol: string,
    options?: eastmoney.HistoryKlineOptions
  ): Promise<HistoryKline[]> {
    return eastmoney.getHistoryKline(this.client, symbol, options);
  }

  getMinuteKline(
    symbol: string,
    options?: eastmoney.MinuteKlineOptions
  ): Promise<MinuteTimeline[] | MinuteKline[]> {
    return eastmoney.getMinuteKline(this.client, symbol, options);
  }

  getHKHistoryKline(
    symbol: string,
    options?: eastmoney.HKKlineOptions
  ): Promise<HKUSHistoryKline[]> {
    return eastmoney.getHKHistoryKline(this.client, symbol, options);
  }

  getUSHistoryKline(
    symbol: string,
    options?: eastmoney.USKlineOptions
  ): Promise<HKUSHistoryKline[]> {
    return eastmoney.getUSHistoryKline(this.client, symbol, options);
  }
}
