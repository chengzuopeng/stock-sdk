/**
 * 东方财富 - 融资融券
 * 数据来源：datacenter-web RPTA_WEB_MARGIN_DAILYTRADE / RPT_MARGIN_TRADE_DETAIL
 */
import { type RequestClient, toNumberSafe } from '../../core';
import type { MarginAccountItem, MarginTargetItem } from '../../types';
import { fetchDatacenterList, parseDcDate } from './datacenter';

/**
 * 融资融券账户统计（按日）
 */
export async function getMarginAccountInfo(
  client: RequestClient
): Promise<MarginAccountItem[]> {
  return fetchDatacenterList(
    client,
    {
      reportName: 'RPTA_WEB_MARGIN_DAILYTRADE',
      columns: 'ALL',
      sortColumns: 'STATISTICS_DATE',
      sortTypes: '-1',
      pageSize: 500,
    },
    (item) => ({
      date: parseDcDate(item.STATISTICS_DATE ?? item.TRADE_DATE),
      finBalance: toNumberSafe(item.FIN_BALANCE),
      loanBalance: toNumberSafe(item.LOAN_BALANCE),
      finBuyAmount: toNumberSafe(item.FIN_BUY_AMT),
      loanSellAmount: toNumberSafe(item.LOAN_SELL_AMT),
      investorCount: toNumberSafe(item.OPERATE_INVESTOR_NUM ?? item.INVESTOR_NUM),
      liabilityInvestorCount: toNumberSafe(item.MARGIN_INVESTOR_NUM),
      totalGuarantee: toNumberSafe(item.TOTAL_GUARANTEE),
      avgGuaranteeRatio: toNumberSafe(item.AVG_GUARANTEE_RATIO),
    })
  );
}

/**
 * 融资融券标的明细
 *
 * @param date - 指定交易日 YYYY-MM-DD（默认服务端最新交易日）
 */
export async function getMarginTargetList(
  client: RequestClient,
  date?: string
): Promise<MarginTargetItem[]> {
  const filter = date ? `(TRADE_DATE='${date}')` : undefined;

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_MARGIN_TRADE_DETAIL',
      columns: 'ALL',
      sortColumns: 'FIN_BALANCE',
      sortTypes: '-1',
      pageSize: 5000,
      filter,
    },
    (item) => ({
      code: String(item.SECURITY_CODE ?? ''),
      name: String(item.SECURITY_NAME_ABBR ?? ''),
      date: parseDcDate(item.TRADE_DATE),
      finBalance: toNumberSafe(item.FIN_BALANCE),
      finBuyAmount: toNumberSafe(item.FIN_BUY_AMT),
      finRepayAmount: toNumberSafe(item.FIN_REPAY_AMT),
      loanBalance: toNumberSafe(item.LOAN_BALANCE),
      loanSellVolume: toNumberSafe(item.LOAN_SELL_VOLUME),
      loanRepayVolume: toNumberSafe(item.LOAN_REPAY_VOLUME),
    })
  );
}
