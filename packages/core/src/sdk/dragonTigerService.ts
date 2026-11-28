/**
 * 龙虎榜 Service
 */
import { eastmoney } from '../providers';
import type {
  DragonTigerDateOptions,
  DragonTigerPeriod,
  DragonTigerDetailItem,
  DragonTigerStockStatItem,
  DragonTigerInstitutionItem,
  DragonTigerBranchItem,
  DragonTigerSeatItem,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class DragonTigerService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  /** 获取龙虎榜详情 */
  getDragonTigerDetail(options: DragonTigerDateOptions): Promise<DragonTigerDetailItem[]> {
    return eastmoney.getDragonTigerDetail(this.client, options);
  }

  /** 获取个股上榜统计 */
  getDragonTigerStockStats(period?: DragonTigerPeriod): Promise<DragonTigerStockStatItem[]> {
    return eastmoney.getDragonTigerStockStats(this.client, period);
  }

  /** 获取机构买卖统计 */
  getDragonTigerInstitution(
    options: DragonTigerDateOptions
  ): Promise<DragonTigerInstitutionItem[]> {
    return eastmoney.getDragonTigerInstitution(this.client, options);
  }

  /** 获取营业部排行 */
  getDragonTigerBranchRank(period?: DragonTigerPeriod): Promise<DragonTigerBranchItem[]> {
    return eastmoney.getDragonTigerBranchRank(this.client, period);
  }

  /** 获取个股某日上榜席位明细（买入榜 + 卖出榜合并） */
  getDragonTigerStockSeatDetail(symbol: string, date: string): Promise<DragonTigerSeatItem[]> {
    return eastmoney.getDragonTigerStockSeatDetail(this.client, symbol, date);
  }
}
