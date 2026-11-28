import type { ProviderId } from '../router/types';

/**
 * 十大流通股东条目
 */
export interface TopShareholder {
  code: string;
  name: string;
  /** 截止日期 YYYY-MM-DD */
  endDate: string;
  /** 股东排名（1-10） */
  rank: number;
  /** 股东名称 */
  holderName: string;
  /** 股东类型（如 机构 / 自然人 / 其它） */
  holderType: string | null;
  /** 持股数量（股） */
  holdShares: number | null;
  /** 占流通股比例% */
  freeHoldRatio: number | null;
  /** 占总股本比例% */
  totalHoldRatio: number | null;
  /** 持股变动描述（如 不变 / 新进 / 增加 / 减少） */
  changeType: string | null;
  /** 持股变动比例% */
  changeRatio: number | null;
  /** 期末持仓市值（元） */
  marketValue: number | null;
  source: ProviderId;
}

/**
 * 股东户数统计条目
 */
export interface ShareholderCount {
  code: string;
  name: string;
  /** 统计截止日期 YYYY-MM-DD */
  endDate: string;
  /** 公告日期 YYYY-MM-DD */
  noticeDate: string | null;
  /** 本期股东户数 */
  holderCount: number | null;
  /** 上期股东户数 */
  prevHolderCount: number | null;
  /** 户数增减 */
  change: number | null;
  /** 户数增减比例% */
  changePercent: number | null;
  /** 户均持股数量（股） */
  avgHoldShares: number | null;
  /** 户均持股市值（元） */
  avgMarketValue: number | null;
  source: ProviderId;
}

/**
 * 可转债基础信息与发行条款
 */
export interface ConvertibleBondItem {
  /** 转债代码（如 113712） */
  bondCode: string;
  /** 转债简称 */
  bondName: string;
  /** 正股代码 */
  stockCode: string;
  /** 正股简称 */
  stockName: string | null;
  /** 信用评级（如 AA- / AAA） */
  rating: string | null;
  /** 发行规模（亿元） */
  issueScale: number | null;
  /** 初始/最新转股价（元） */
  convertPrice: number | null;
  /** 上市日期 YYYY-MM-DD */
  listingDate: string | null;
  /** 到期日期 YYYY-MM-DD */
  expireDate: string | null;
  /** 债券期限（年） */
  durationYears: number | null;
  /** 票面利率说明 */
  interestRateExplain: string | null;
  source: ProviderId;
}

/**
 * 公司治理/可转债通用分页选项
 */
export interface CorporateQueryOptions {
  /** 页码（默认 1） */
  page?: number;
  /** 每页条数（默认 20） */
  pageSize?: number;
}
