import { eastmoney } from '../providers';
import type {
  IndustryBoard,
  IndustryBoardSpot,
  IndustryBoardConstituent,
  IndustryBoardKline,
  IndustryBoardMinuteTimeline,
  IndustryBoardMinuteKline,
  ConceptBoard,
  ConceptBoardSpot,
  ConceptBoardConstituent,
  ConceptBoardKline,
  ConceptBoardMinuteTimeline,
  ConceptBoardMinuteKline,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class BoardService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  getIndustryList(): Promise<IndustryBoard[]> {
    return eastmoney.getIndustryList(this.client);
  }

  getIndustrySpot(symbol: string): Promise<IndustryBoardSpot[]> {
    return eastmoney.getIndustrySpot(this.client, symbol);
  }

  getIndustryConstituents(symbol: string): Promise<IndustryBoardConstituent[]> {
    return eastmoney.getIndustryConstituents(this.client, symbol);
  }

  getIndustryKline(
    symbol: string,
    options?: eastmoney.IndustryBoardKlineOptions
  ): Promise<IndustryBoardKline[]> {
    return eastmoney.getIndustryKline(this.client, symbol, options);
  }

  getIndustryMinuteKline(
    symbol: string,
    options?: eastmoney.IndustryBoardMinuteKlineOptions
  ): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]> {
    return eastmoney.getIndustryMinuteKline(this.client, symbol, options);
  }

  getConceptList(): Promise<ConceptBoard[]> {
    return eastmoney.getConceptList(this.client);
  }

  getConceptSpot(symbol: string): Promise<ConceptBoardSpot[]> {
    return eastmoney.getConceptSpot(this.client, symbol);
  }

  getConceptConstituents(symbol: string): Promise<ConceptBoardConstituent[]> {
    return eastmoney.getConceptConstituents(this.client, symbol);
  }

  getConceptKline(
    symbol: string,
    options?: eastmoney.ConceptBoardKlineOptions
  ): Promise<ConceptBoardKline[]> {
    return eastmoney.getConceptKline(this.client, symbol, options);
  }

  getConceptMinuteKline(
    symbol: string,
    options?: eastmoney.ConceptBoardMinuteKlineOptions
  ): Promise<ConceptBoardMinuteTimeline[] | ConceptBoardMinuteKline[]> {
    return eastmoney.getConceptMinuteKline(this.client, symbol, options);
  }
}
