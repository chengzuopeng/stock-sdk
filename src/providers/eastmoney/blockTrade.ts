/**
 * 东方财富 - 大宗交易
 * 数据来源：datacenter-web RPT_BLOCK_TRADE_*
 */
import { type RequestClient, toNumberSafe } from '../../core';
import type {
  BlockTradeDateOptions,
  BlockTradeMarketStatItem,
  BlockTradeDetailItem,
  BlockTradeDailyStatItem,
} from '../../types';
import { fetchDatacenterList } from './datacenter';

/** 把 YYYYMMDD 转为 YYYY-MM-DD（datacenter filter 要求） */
function toIsoDate(date?: string): string | undefined {
  if (!date) return undefined;
  if (/^\d{8}$/.test(date)) {
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  }
  return date;
}

/** 提取日期前缀 YYYY-MM-DD */
function parseDateOnly(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str;
}

/**
 * 拼装日期范围 filter 段。
 */
function buildDateFilter(options?: BlockTradeDateOptions): string {
  if (!options) return '';
  const startDate = toIsoDate(options.startDate);
  const endDate = toIsoDate(options.endDate);
  const parts: string[] = [];
  if (startDate) parts.push(`(TRADE_DATE>='${startDate}')`);
  if (endDate) parts.push(`(TRADE_DATE<='${endDate}')`);
  return parts.join('');
}

/**
 * 大宗交易市场统计（每日总览）
 */
export async function getBlockTradeMarketStat(
  client: RequestClient
): Promise<BlockTradeMarketStatItem[]> {
  return fetchDatacenterList(
    client,
    {
      reportName: 'PRT_BLOCKTRADE_MARKET_STA',
      columns: 'ALL',
      sortColumns: 'TRADE_DATE',
      sortTypes: '-1',
      pageSize: 500,
    },
    (item) => ({
      date: parseDateOnly(item.TRADE_DATE),
      shClose: toNumberSafe(item.CLOSE_PRICE ?? item.SH_CLOSE_PRICE),
      shChangePercent: toNumberSafe(item.CHANGE_RATE ?? item.SH_CHANGE_RATE),
      totalAmount: toNumberSafe(item.TURNOVER ?? item.TOTAL_AMOUNT),
      premiumAmount: toNumberSafe(item.PREMIUM_TURNOVER ?? item.PREMIUM_AMOUNT),
      premiumRatio: toNumberSafe(item.PREMIUM_RATIO),
      discountAmount: toNumberSafe(item.DISCOUNT_TURNOVER ?? item.DISCOUNT_AMOUNT),
      discountRatio: toNumberSafe(item.DISCOUNT_RATIO),
    })
  );
}

/**
 * 大宗交易明细（按日期范围筛选）
 *
 * @param options - 起止日期；省略则默认拉取最近一段时间
 */
export async function getBlockTradeDetail(
  client: RequestClient,
  options: BlockTradeDateOptions = {}
): Promise<BlockTradeDetailItem[]> {
  const filter = buildDateFilter(options);

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_BLOCK_TRADE_DETAIL',
      columns: 'ALL',
      sortColumns: 'TRADE_DATE,SECURITY_CODE',
      sortTypes: '-1,1',
      pageSize: 5000,
      filter: filter || undefined,
    },
    (item) => ({
      code: String(item.SECURITY_CODE ?? ''),
      name: String(item.SECURITY_NAME_ABBR ?? ''),
      date: parseDateOnly(item.TRADE_DATE),
      close: toNumberSafe(item.CLOSE_PRICE),
      changePercent: toNumberSafe(item.CHANGE_RATE),
      dealPrice: toNumberSafe(item.DEAL_PRICE ?? item.PRICE),
      dealVolume: toNumberSafe(item.DEAL_VOLUME ?? item.VOLUME),
      dealAmount: toNumberSafe(item.DEAL_AMT ?? item.TURNOVER),
      premiumRate: toNumberSafe(item.PREMIUM_RATIO ?? item.PREMIUM_RATE),
      buyBranch: String(item.BUYER_DEPT ?? item.BUYER_OPERATEDEPT_NAME ?? ''),
      sellBranch: String(item.SELLER_DEPT ?? item.SELLER_OPERATEDEPT_NAME ?? ''),
    })
  );
}

/**
 * 大宗交易每日统计（按股票汇总）
 *
 * @param options - 起止日期
 */
export async function getBlockTradeDailyStat(
  client: RequestClient,
  options: BlockTradeDateOptions = {}
): Promise<BlockTradeDailyStatItem[]> {
  const filter = buildDateFilter(options);

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_BLOCK_TRADE_STA',
      columns: 'ALL',
      sortColumns: 'TRADE_DATE,DEAL_AMT',
      sortTypes: '-1,-1',
      pageSize: 5000,
      filter: filter || undefined,
    },
    (item) => ({
      code: String(item.SECURITY_CODE ?? ''),
      name: String(item.SECURITY_NAME_ABBR ?? ''),
      date: parseDateOnly(item.TRADE_DATE),
      changePercent: toNumberSafe(item.CHANGE_RATE),
      close: toNumberSafe(item.CLOSE_PRICE),
      dealCount: toNumberSafe(item.DEAL_NUM ?? item.DEAL_COUNT),
      dealTotalAmount: toNumberSafe(item.DEAL_AMT ?? item.TOTAL_AMOUNT),
      dealTotalVolume: toNumberSafe(item.DEAL_VOLUME ?? item.TOTAL_VOLUME),
      premiumAmount: toNumberSafe(item.PREMIUM_AMT ?? item.PREMIUM_AMOUNT),
      discountAmount: toNumberSafe(item.DISCOUNT_AMT ?? item.DISCOUNT_AMOUNT),
    })
  );
}
