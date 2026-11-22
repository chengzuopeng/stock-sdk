import { eastmoney, sina } from '../providers';
import type {
  IndexOptionProduct,
  OptionTQuoteResult,
  OptionKline,
  ETFOptionCate,
  ETFOptionMonth,
  ETFOptionExpireDay,
  OptionMinute,
  CFFEXOptionQuote,
  OptionLHBItem,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class OptionsService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  getIndexOptionSpot(
    product: IndexOptionProduct,
    contract: string
  ): Promise<OptionTQuoteResult> {
    return sina.getIndexOptionSpot(product, contract);
  }

  getIndexOptionKline(symbol: string): Promise<OptionKline[]> {
    return sina.getIndexOptionKline(symbol);
  }

  getCFFEXOptionQuotes(
    options?: eastmoney.CFFEXOptionQuotesOptions
  ): Promise<CFFEXOptionQuote[]> {
    return eastmoney.getCFFEXOptionQuotes(this.client, options);
  }

  getETFOptionMonths(cate: ETFOptionCate): Promise<ETFOptionMonth> {
    return sina.getETFOptionMonths(cate);
  }

  getETFOptionExpireDay(
    cate: ETFOptionCate,
    month: string
  ): Promise<ETFOptionExpireDay> {
    return sina.getETFOptionExpireDay(cate, month);
  }

  getETFOptionMinute(code: string): Promise<OptionMinute[]> {
    return sina.getETFOptionMinute(code);
  }

  getETFOptionDailyKline(code: string): Promise<OptionKline[]> {
    return sina.getETFOptionDailyKline(code);
  }

  getETFOption5DayMinute(code: string): Promise<OptionMinute[]> {
    return sina.getETFOption5DayMinute(code);
  }

  getCommodityOptionSpot(
    variety: string,
    contract: string
  ): Promise<OptionTQuoteResult> {
    return sina.getCommodityOptionSpot(variety, contract);
  }

  getCommodityOptionKline(symbol: string): Promise<OptionKline[]> {
    return sina.getCommodityOptionKline(symbol);
  }

  getOptionLHB(symbol: string, date: string): Promise<OptionLHBItem[]> {
    return eastmoney.getOptionLHB(this.client, symbol, date);
  }
}
