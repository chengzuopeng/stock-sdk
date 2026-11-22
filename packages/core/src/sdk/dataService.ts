/**
 * 大宗交易 + 融资融券 综合 Service
 * 因两类接口数量较少，合并到 DataService 中以避免过度拆分。
 */
import { eastmoney } from '../providers';
import type {
  BlockTradeMarketStatItem,
  BlockTradeDetailItem,
  BlockTradeDailyStatItem,
  MarginAccountItem,
  MarginTargetItem,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class DataService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  // --- 大宗交易 ---

  /** 获取大宗交易市场每日统计 */
  getBlockTradeMarketStat(): Promise<BlockTradeMarketStatItem[]> {
    return eastmoney.getBlockTradeMarketStat(this.client);
  }

  /** 获取大宗交易明细 */
  getBlockTradeDetail(
    options?: eastmoney.BlockTradeDateOptions
  ): Promise<BlockTradeDetailItem[]> {
    return eastmoney.getBlockTradeDetail(this.client, options);
  }

  /** 获取大宗交易每日统计（按股票汇总） */
  getBlockTradeDailyStat(
    options?: eastmoney.BlockTradeDateOptions
  ): Promise<BlockTradeDailyStatItem[]> {
    return eastmoney.getBlockTradeDailyStat(this.client, options);
  }

  // --- 融资融券 ---

  /** 获取融资融券账户统计 */
  getMarginAccountInfo(): Promise<MarginAccountItem[]> {
    return eastmoney.getMarginAccountInfo(this.client);
  }

  /** 获取融资融券标的明细 */
  getMarginTargetList(date?: string): Promise<MarginTargetItem[]> {
    return eastmoney.getMarginTargetList(this.client, date);
  }
}
