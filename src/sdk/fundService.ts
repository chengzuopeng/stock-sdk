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
  FundEstimate,
  FundNavHistory,
  FundProfile,
  FundRankHistory,
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
    return eastmoney.getFundDividendList(this.client, options);
  }

  /** 获取基金历史净值（单位 + 累计，全历史一次返回） */
  getFundNavHistory(code: string): Promise<FundNavHistory> {
    return eastmoney.getFundNavHistory(this.client, code);
  }

  /** 获取基金当日实时估值（含 T-1 单位净值 + 盘中估算） */
  getFundEstimate(code: string): Promise<FundEstimate> {
    return eastmoney.getFundEstimate(this.client, code);
  }

  /** 获取基金同类排名走势（每日近三月排名 + 百分位） */
  getFundRankHistory(code: string): Promise<FundRankHistory> {
    return eastmoney.getFundRankHistory(this.client, code);
  }

  /**
   * 获取基金深度资料（一次请求返回全量字段）。
   *
   * 包含：前十大重仓股、资产配置、仓位测算、基金经理、业绩评价、
   * 持有人结构、规模变动、申购赎回、阶段收益率、同类基金等。
   *
   * @param code 基金代码（纯数字，如 `'000001'`）
   */
  getFundProfile(code: string): Promise<FundProfile> {
    return eastmoney.getFundProfile(this.client, code);
  }
}
