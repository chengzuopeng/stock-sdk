import { eastmoney } from '../providers';
import type {
  HistoryKline,
  MinuteTimeline,
  MinuteKline,
  HKHistoryKline,
  USHistoryKline,
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
  ): Promise<HKHistoryKline[]> {
    return eastmoney.getHKHistoryKline(this.client, symbol, options);
  }

  getUSHistoryKline(
    symbol: string,
    options?: eastmoney.USKlineOptions
  ): Promise<USHistoryKline[]> {
    return eastmoney.getUSHistoryKline(this.client, symbol, options);
  }
}
