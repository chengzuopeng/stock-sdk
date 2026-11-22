import type { ProviderId } from '../router/types';

/**
 * 个股核心财务指标（单报告期）
 */
export interface FinancialIndicator {
  /** 股票代码（6 位纯数字） */
  code: string;
  /** 股票简称 */
  name: string;
  /** 报告期 YYYY-MM-DD（如 2026-09-30） */
  reportDate: string;
  /** 报告期标签（如 2026Q3 / 2026年 三季报） */
  reportName: string;
  /** 公告日期 YYYY-MM-DD */
  noticeDate: string | null;
  /** 基本每股收益（元） */
  eps: number | null;
  /** 每股净资产（元） */
  bps: number | null;
  /** 每股经营现金流（元） */
  operatingCashFlowPerShare: number | null;
  /** 营业总收入（元） */
  totalRevenue: number | null;
  /** 营业总收入同比增长% */
  revenueYoy: number | null;
  /** 归母净利润（元） */
  netProfit: number | null;
  /** 归母净利润同比增长% */
  netProfitYoy: number | null;
  /** 加权净资产收益率 ROE% */
  roe: number | null;
  /** 销售毛利率% */
  grossMargin: number | null;
  /** 报表计价币种（A 股 CNY / 港股 HKD / 美股 USD） */
  currency?: 'CNY' | 'HKD' | 'USD';
  /** 实际命中的数据源 */
  source: ProviderId;
}

/**
 * 利润表记录（单报告期）
 */
export interface IncomeStatement {
  code: string;
  name: string;
  reportDate: string;
  noticeDate: string | null;
  /** 营业总收入（元） */
  totalRevenue: number | null;
  /** 营业总收入同比% */
  revenueYoy: number | null;
  /** 营业总成本（元） */
  totalOperatingCost: number | null;
  /** 营业成本（元） */
  operatingCost: number | null;
  /** 销售费用（元） */
  sellingExpense: number | null;
  /** 管理费用（元） */
  adminExpense: number | null;
  /** 财务费用（元） */
  financeExpense: number | null;
  /** 营业利润（元） */
  operatingProfit: number | null;
  /** 利润总额（元） */
  totalProfit: number | null;
  /** 所得税费用（元） */
  incomeTax: number | null;
  /** 归属于母公司股东的净利润（元） */
  netProfit: number | null;
  /** 归母净利润同比% */
  netProfitYoy: number | null;
  /** 扣非归母净利润（按所属市场原币种计：CNY / HKD / USD） */
  deductedNetProfit: number | null;
  /** 报表计价币种（A 股 CNY / 港股 HKD / 美股 USD） */
  currency?: 'CNY' | 'HKD' | 'USD';
  source: ProviderId;
}

/**
 * 资产负债表记录（单报告期）
 */
export interface BalanceSheet {
  code: string;
  name: string;
  reportDate: string;
  noticeDate: string | null;
  /** 总资产（元） */
  totalAssets: number | null;
  /** 总资产同比% */
  totalAssetsYoy: number | null;
  /** 货币资金（元） */
  monetaryFunds: number | null;
  /** 应收账款（元） */
  accountsReceivable: number | null;
  /** 存货（元） */
  inventory: number | null;
  /** 固定资产（元） */
  fixedAssets: number | null;
  /** 总负债（元） */
  totalLiabilities: number | null;
  /** 应付账款（元） */
  accountsPayable: number | null;
  /** 股东权益合计（元） */
  totalEquity: number | null;
  /** 资产负债率% */
  debtToAssetRatio: number | null;
  /** 流动比率 */
  currentRatio: number | null;
  /** 报表计价币种（A 股 CNY / 港股 HKD / 美股 USD） */
  currency?: 'CNY' | 'HKD' | 'USD';
  source: ProviderId;
}

/**
 * 现金流量表记录（单报告期）
 */
export interface CashFlowStatement {
  code: string;
  name: string;
  reportDate: string;
  noticeDate: string | null;
  /** 经营活动产生的现金流量净额（元） */
  operatingCashFlow: number | null;
  /** 经营现金流净额同比% */
  operatingCashFlowYoy: number | null;
  /** 销售商品、提供劳务收到的现金（元） */
  cashFromSales: number | null;
  /** 投资活动产生的现金流量净额（元） */
  investingCashFlow: number | null;
  /** 筹资活动产生的现金流量净额（元） */
  financingCashFlow: number | null;
  /** 现金及现金等价物净增加额（按所属市场原币种计：CNY / HKD / USD） */
  netCashIncrease: number | null;
  /** 报表计价币种（A 股 CNY / 港股 HKD / 美股 USD） */
  currency?: 'CNY' | 'HKD' | 'USD';
  source: ProviderId;
}

/**
 * 业绩预告记录
 */
export interface PerformanceForecast {
  code: string;
  name: string;
  reportDate: string;
  noticeDate: string | null;
  /** 预测指标名称（如 归属于上市公司股东的净利润 / 营业收入） */
  metric: string;
  /** 预告类型（如 预增 / 略增 / 扭亏 / 预减 / 首亏） */
  forecastType: string | null;
  /** 预计金额下限（元） */
  amountLower: number | null;
  /** 预计金额上限（元） */
  amountUpper: number | null;
  /** 预计变动幅度下限% */
  changePercentLower: number | null;
  /** 预计变动幅度上限% */
  changePercentUpper: number | null;
  /** 业绩变动摘要 */
  summary: string;
  source: ProviderId;
}

/**
 * 业绩快报记录
 */
export interface PerformanceExpress {
  code: string;
  name: string;
  reportDate: string;
  noticeDate: string | null;
  /** 基本每股收益（元） */
  eps: number | null;
  /** 营业总收入（元） */
  totalRevenue: number | null;
  /** 归母净利润（元） */
  netProfit: number | null;
  /** 每股净资产（元） */
  bps: number | null;
  /** 加权净资产收益率% */
  roe: number | null;
  source: ProviderId;
}

/**
 * 财务报表/指标通用查询参数
 */
export interface FinancialQueryOptions {
  /** 页码（默认 1） */
  page?: number;
  /** 每页条数（默认 20） */
  pageSize?: number;
}

/**
 * 业绩预告/快报查询参数
 */
export interface PerformanceListOptions extends FinancialQueryOptions {
  /** 可选按股票代码过滤 */
  symbol?: string;
  /** 可选报告期过滤（YYYY-MM-DD，如 '2026-09-30'） */
  reportDate?: string;
}
