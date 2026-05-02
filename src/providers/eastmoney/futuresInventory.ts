/**
 * 东方财富 - 期货库存数据
 * 数据来源：https://data.eastmoney.com/ifdata/kcsj.html
 *         https://data.eastmoney.com/pmetal/comex/by.html
 */
import { type RequestClient } from '../../core';
import { toNumberSafe } from '../../core/parser';
import type {
  FuturesInventorySymbol,
  FuturesInventory,
  ComexInventory,
} from '../../types';
import { fetchDatacenterList } from './datacenter';

export interface FuturesInventoryOptions {
  /** 开始日期 YYYY-MM-DD（默认 2020-10-28） */
  startDate?: string;
  /** 每页条数，默认 500 */
  pageSize?: number;
}

export interface ComexInventoryOptions {
  /** 每页条数，默认 500 */
  pageSize?: number;
}

const COMEX_SYMBOL_MAP: Record<string, string> = {
  gold: 'EMI00069026',
  silver: 'EMI00069027',
};

/**
 * 解析日期字符串为 YYYY-MM-DD
 */
function parseDate(dateStr: unknown): string {
  if (!dateStr) return '';
  const str = String(dateStr);
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str;
}

/**
 * 获取期货库存品种列表
 */
export async function getFuturesInventorySymbols(
  client: RequestClient
): Promise<FuturesInventorySymbol[]> {
  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_FUTU_POSITIONCODE',
      columns: 'TRADE_MARKET_CODE,TRADE_CODE,TRADE_TYPE',
      filter: '(IS_MAINCODE="1")',
      pageSize: 500,
      fetchAllPages: false,
    },
    (item) => ({
      code: String(item.TRADE_CODE ?? ''),
      name: String(item.TRADE_TYPE ?? ''),
      marketCode: String(item.TRADE_MARKET_CODE ?? ''),
    })
  );
}

/**
 * 获取期货库存数据
 *
 * @param client - 请求客户端
 * @param symbol - 品种代码（来自 getFuturesInventorySymbols 返回的 code）
 * @param options - 配置选项
 * @returns 库存数据数组
 */
export async function getFuturesInventory(
  client: RequestClient,
  symbol: string,
  options: FuturesInventoryOptions = {}
): Promise<FuturesInventory[]> {
  const { startDate = '2020-10-28', pageSize = 500 } = options;
  const upperSymbol = symbol.toUpperCase();

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_FUTU_STOCKDATA',
      columns: 'SECURITY_CODE,TRADE_DATE,ON_WARRANT_NUM,ADDCHANGE',
      filter: `(SECURITY_CODE="${upperSymbol}")(TRADE_DATE>='${startDate}')`,
      pageSize,
      sortColumns: 'TRADE_DATE',
      sortTypes: '-1',
    },
    (item) => ({
      code: String(item.SECURITY_CODE ?? symbol),
      date: parseDate(item.TRADE_DATE),
      inventory: toNumberSafe(item.ON_WARRANT_NUM),
      change: toNumberSafe(item.ADDCHANGE),
    })
  );
}

/**
 * 获取 COMEX 黄金/白银库存数据
 *
 * @param client - 请求客户端
 * @param symbol - 'gold' 或 'silver'
 * @param options - 配置选项
 * @returns COMEX 库存数据数组
 */
export async function getComexInventory(
  client: RequestClient,
  symbol: 'gold' | 'silver',
  options: ComexInventoryOptions = {}
): Promise<ComexInventory[]> {
  const indicatorId = COMEX_SYMBOL_MAP[symbol];
  if (!indicatorId) {
    throw new RangeError(
      `Invalid COMEX symbol: "${symbol}". Must be "gold" or "silver".`
    );
  }

  const { pageSize = 500 } = options;
  const nameMap: Record<string, string> = { gold: '黄金', silver: '白银' };

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_FUTUOPT_GOLDSIL',
      sortColumns: 'REPORT_DATE',
      sortTypes: '-1',
      pageSize,
      filter: `(INDICATOR_ID1="${indicatorId}")(@STORAGE_TON<>"NULL")`,
    },
    (item) => ({
      date: parseDate(item.REPORT_DATE),
      name: nameMap[symbol] ?? symbol,
      storageTon: toNumberSafe(item.STORAGE_TON),
      storageOunce: toNumberSafe(item.STORAGE_OUNCE),
      inventory: toNumberSafe(item.STORAGE_TON),
      change: null,
      market: symbol,
    })
  );
}
