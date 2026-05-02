/**
 * 涨停板 / 盘口异动 Service
 */
import { eastmoney } from '../providers';
import type {
  ZTPoolType,
  ZTPoolItem,
  StockChangeType,
  StockChangeItem,
  BoardChangeItem,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class MarketEventService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  /** 获取涨停股池（涨停 / 昨日涨停 / 强势 / 次新 / 炸板 / 跌停） */
  getZTPool(type?: ZTPoolType, date?: string): Promise<ZTPoolItem[]> {
    return eastmoney.getZTPool(this.client, type, date);
  }

  /** 获取个股盘口异动 */
  getStockChanges(type?: StockChangeType): Promise<StockChangeItem[]> {
    return eastmoney.getStockChanges(this.client, type);
  }

  /** 获取板块异动详情 */
  getBoardChanges(): Promise<BoardChangeItem[]> {
    return eastmoney.getBoardChanges(this.client);
  }
}
