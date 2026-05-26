/**
 * 公募基金扩展数据 Service
 *
 * 与现有腾讯系 `getFundQuotes`（实时行情）并列，专门承载东方财富侧的
 * 基金深度数据（分红 / 历史净值 / 估值 / 排名等）。
 */
import { eastmoney } from '../providers';
import type {
  FundDividendListOptions,
  FundDividendListResult,
} from '../types';
import type { RequestClient } from '../core';
import { BaseService } from './baseService';

export class FundService extends BaseService {
  constructor(client: RequestClient) {
    super(client);
  }

  /** 获取基金分红明细（全市场，按年份分页） */
  getFundDividendList(
    options?: FundDividendListOptions
  ): Promise<FundDividendListResult> {
    return eastmoney.getFundDividendList(options);
  }
}
