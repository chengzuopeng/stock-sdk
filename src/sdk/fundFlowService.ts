/**
 * 资金流向 Service
 */
import { eastmoney } from '../providers';
import type {
  StockFundFlowDaily,
  FundFlowRankItem,
  SectorFundFlowItem,
  MarketFundFlow,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class FundFlowService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  /** 获取个股资金流历史 */
  getIndividualFundFlow(
    symbol: string,
    options?: eastmoney.FundFlowOptions
  ): Promise<StockFundFlowDaily[]> {
    return eastmoney.getIndividualFundFlow(this.client, symbol, options);
  }

  /** 获取大盘资金流 */
  getMarketFundFlow(): Promise<MarketFundFlow[]> {
    return eastmoney.getMarketFundFlow(this.client);
  }

  /** 获取个股资金流排名 */
  getFundFlowRank(
    options?: eastmoney.FundFlowRankOptions
  ): Promise<FundFlowRankItem[]> {
    return eastmoney.getFundFlowRank(this.client, options);
  }

  /** 获取板块资金流排名（行业 / 概念 / 地域） */
  getSectorFundFlowRank(
    options?: eastmoney.FundFlowRankOptions
  ): Promise<SectorFundFlowItem[]> {
    return eastmoney.getSectorFundFlowRank(this.client, options);
  }

  /** 获取单个板块的历史资金流 */
  getSectorFundFlowHistory(
    symbol: string,
    options?: eastmoney.FundFlowOptions
  ): Promise<StockFundFlowDaily[]> {
    return eastmoney.getSectorFundFlowHistory(this.client, symbol, options);
  }
}
