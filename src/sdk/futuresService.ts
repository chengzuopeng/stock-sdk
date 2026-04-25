import { eastmoney } from '../providers';
import type {
  FuturesKline,
  GlobalFuturesQuote,
  FuturesInventorySymbol,
  FuturesInventory,
  ComexInventory,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class FuturesService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  getFuturesKline(
    symbol: string,
    options?: eastmoney.FuturesKlineOptions
  ): Promise<FuturesKline[]> {
    return eastmoney.getFuturesHistoryKline(this.client, symbol, options);
  }

  getGlobalFuturesSpot(
    options?: eastmoney.GlobalFuturesSpotOptions
  ): Promise<GlobalFuturesQuote[]> {
    return eastmoney.getGlobalFuturesSpot(this.client, options);
  }

  getGlobalFuturesKline(
    symbol: string,
    options?: eastmoney.GlobalFuturesKlineOptions
  ): Promise<FuturesKline[]> {
    return eastmoney.getGlobalFuturesKline(this.client, symbol, options);
  }

  getFuturesInventorySymbols(): Promise<FuturesInventorySymbol[]> {
    return eastmoney.getFuturesInventorySymbols(this.client);
  }

  getFuturesInventory(
    symbol: string,
    options?: eastmoney.FuturesInventoryOptions
  ): Promise<FuturesInventory[]> {
    return eastmoney.getFuturesInventory(this.client, symbol, options);
  }

  getComexInventory(
    symbol: 'gold' | 'silver',
    options?: eastmoney.ComexInventoryOptions
  ): Promise<ComexInventory[]> {
    return eastmoney.getComexInventory(this.client, symbol, options);
  }
}
