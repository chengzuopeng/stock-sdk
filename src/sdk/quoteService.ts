import { tencent, eastmoney } from '../providers';
import type {
  FullQuote,
  SimpleQuote,
  FundFlow,
  PanelLargeOrder,
  HKQuote,
  USQuote,
  FundQuote,
  SearchResult,
  DividendDetail,
  TodayTimelineResponse,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class QuoteService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  getFullQuotes(codes: string[]): Promise<FullQuote[]> {
    return tencent.getFullQuotes(this.client, codes);
  }

  getSimpleQuotes(codes: string[]): Promise<SimpleQuote[]> {
    return tencent.getSimpleQuotes(this.client, codes);
  }

  getHKQuotes(codes: string[]): Promise<HKQuote[]> {
    return tencent.getHKQuotes(this.client, codes);
  }

  getUSQuotes(codes: string[]): Promise<USQuote[]> {
    return tencent.getUSQuotes(this.client, codes);
  }

  getFundQuotes(codes: string[]): Promise<FundQuote[]> {
    return tencent.getFundQuotes(this.client, codes);
  }

  getFundFlow(codes: string[]): Promise<FundFlow[]> {
    return tencent.getFundFlow(this.client, codes);
  }

  getPanelLargeOrder(codes: string[]): Promise<PanelLargeOrder[]> {
    return tencent.getPanelLargeOrder(this.client, codes);
  }

  getTodayTimeline(code: string): Promise<TodayTimelineResponse> {
    return tencent.getTodayTimeline(this.client, code);
  }

  search(keyword: string): Promise<SearchResult[]> {
    return tencent.search(this.client, keyword);
  }

  getAShareCodeList(options?: tencent.GetAShareCodeListOptions | boolean): Promise<string[]> {
    return tencent.getAShareCodeList(this.client, options);
  }

  getUSCodeList(options?: tencent.GetUSCodeListOptions | boolean): Promise<string[]> {
    return tencent.getUSCodeList(this.client, options);
  }

  getHKCodeList(): Promise<string[]> {
    return tencent.getHKCodeList(this.client);
  }

  getFundCodeList(): Promise<string[]> {
    return tencent.getFundCodeList(this.client);
  }

  async getAllAShareQuotes(
    options: tencent.GetAllAShareQuotesOptions = {}
  ): Promise<FullQuote[]> {
    const { market, ...batchOptions } = options;
    const codes = await this.getAShareCodeList({ market });
    return tencent.getAllQuotesByCodes(this.client, codes, batchOptions);
  }

  async getAllHKShareQuotes(
    options: tencent.GetAllAShareQuotesOptions = {}
  ): Promise<HKQuote[]> {
    const codes = await this.getHKCodeList();
    return tencent.getAllHKQuotesByCodes(this.client, codes, options);
  }

  async getAllUSShareQuotes(
    options: tencent.GetAllUSQuotesOptions = {}
  ): Promise<USQuote[]> {
    const { market, ...restOptions } = options;
    const codes = await this.getUSCodeList({ simple: true, market });
    return tencent.getAllUSQuotesByCodes(this.client, codes, restOptions);
  }

  getAllQuotesByCodes(
    codes: string[],
    options: tencent.GetAllAShareQuotesOptions = {}
  ): Promise<FullQuote[]> {
    return tencent.getAllQuotesByCodes(this.client, codes, options);
  }

  batchRaw(params: string): Promise<{ key: string; fields: string[] }[]> {
    return this.client.getTencentQuote(params);
  }

  getTradingCalendar(): Promise<string[]> {
    return tencent.getTradingCalendar(this.client);
  }

  getDividendDetail(symbol: string): Promise<DividendDetail[]> {
    return eastmoney.getDividendDetail(this.client, symbol);
  }
}
