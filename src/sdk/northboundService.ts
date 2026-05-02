/**
 * 沪深港通 / 北向资金 Service
 */
import { eastmoney } from '../providers';
import type {
  NorthboundDirection,
  NorthboundMinuteItem,
  NorthboundFlowSummary,
  NorthboundHoldingRankItem,
  NorthboundHistoryItem,
  NorthboundIndividualItem,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class NorthboundService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  /** 获取北向 / 南向资金分时数据 */
  getNorthboundMinute(direction?: NorthboundDirection): Promise<NorthboundMinuteItem[]> {
    return eastmoney.getNorthboundMinute(this.client, direction);
  }

  /** 获取沪深港通市场资金流向汇总 */
  getNorthboundFlowSummary(): Promise<NorthboundFlowSummary[]> {
    return eastmoney.getNorthboundFlowSummary(this.client);
  }

  /** 获取北向 / 沪股通 / 深股通持股个股排行 */
  getNorthboundHoldingRank(
    options?: eastmoney.NorthboundHoldingRankOptions
  ): Promise<NorthboundHoldingRankItem[]> {
    return eastmoney.getNorthboundHoldingRank(this.client, options);
  }

  /** 获取北向 / 南向资金历史 */
  getNorthboundHistory(
    direction?: NorthboundDirection,
    options?: eastmoney.NorthboundHistoryOptions
  ): Promise<NorthboundHistoryItem[]> {
    return eastmoney.getNorthboundHistory(this.client, direction, options);
  }

  /** 获取个股的北向持仓历史 */
  getNorthboundIndividual(
    symbol: string,
    options?: eastmoney.NorthboundHistoryOptions
  ): Promise<NorthboundIndividualItem[]> {
    return eastmoney.getNorthboundIndividual(this.client, symbol, options);
  }
}
