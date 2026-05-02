/**
 * 融资融券数据类型
 */

/**
 * 融资融券账户统计项（按日）
 */
export interface MarginAccountItem {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 融资余额(元) */
  finBalance: number | null;
  /** 融券余额(元) */
  loanBalance: number | null;
  /** 融资买入额(元) */
  finBuyAmount: number | null;
  /** 融券卖出额(元) */
  loanSellAmount: number | null;
  /** 参与交易的投资者数量 */
  investorCount: number | null;
  /** 有融资融券负债的投资者数量 */
  liabilityInvestorCount: number | null;
  /** 担保物总价值(元) */
  totalGuarantee: number | null;
  /** 平均维持担保比例(%) */
  avgGuaranteeRatio: number | null;
}

/**
 * 融资融券标的证券项
 */
export interface MarginTargetItem {
  /** 证券代码 */
  code: string;
  /** 证券名称 */
  name: string;
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 融资余额(元) */
  finBalance: number | null;
  /** 融资买入额(元) */
  finBuyAmount: number | null;
  /** 融资偿还额(元) */
  finRepayAmount: number | null;
  /** 融券余量(股) */
  loanBalance: number | null;
  /** 融券卖出量(股) */
  loanSellVolume: number | null;
  /** 融券偿还量(股) */
  loanRepayVolume: number | null;
}
