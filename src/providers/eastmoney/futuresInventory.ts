/**
 * 东方财富 - 期货库存数据
 * 数据来源：https://data.eastmoney.com/ifdata/kcsj.html
 *         https://data.eastmoney.com/pmetal/comex/by.html
 */
import { RequestClient, EM_DATACENTER_URL } from '../../core';
import { toNumberSafe } from '../../core/parser';
import type {
  FuturesInventorySymbol,
  FuturesInventory,
  ComexInventory,
} from '../../types';

interface DatacenterResponse {
  result?: {
    pages?: number;
    data?: Record<string, unknown>[];
  };
}

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
 * 获取期货库存品种列表
 * @param client - 请求客户端
 * @returns 品种列表
 */
export async function getFuturesInventorySymbols(
  client: RequestClient
): Promise<FuturesInventorySymbol[]> {
  const params = new URLSearchParams({
    reportName: 'RPT_FUTU_POSITIONCODE',
    columns: 'TRADE_MARKET_CODE,TRADE_CODE,TRADE_TYPE',
    filter: '(IS_MAINCODE="1")',
    pageNumber: '1',
    pageSize: '500',
    source: 'WEB',
    client: 'WEB',
  });

  const url = `${EM_DATACENTER_URL}?${params.toString()}`;
  const json = await client.get<DatacenterResponse>(url, {
    responseType: 'json',
  });

  const data = json?.result?.data;
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    code: String(item.TRADE_CODE ?? ''),
    name: String(item.TRADE_TYPE ?? ''),
    marketCode: String(item.TRADE_MARKET_CODE ?? ''),
  }));
}

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
 * 获取期货库存数据
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

  const allData: FuturesInventory[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      reportName: 'RPT_FUTU_STOCKDATA',
      columns: 'SECURITY_CODE,TRADE_DATE,ON_WARRANT_NUM,ADDCHANGE',
      filter: `(SECURITY_CODE="${upperSymbol}")(TRADE_DATE>='${startDate}')`,
      pageNumber: String(page),
      pageSize: String(pageSize),
      sortTypes: '-1',
      sortColumns: 'TRADE_DATE',
      source: 'WEB',
      client: 'WEB',
    });

    const url = `${EM_DATACENTER_URL}?${params.toString()}`;
    const json = await client.get<DatacenterResponse>(url, {
      responseType: 'json',
    });

    const result = json?.result;
    if (!result || !Array.isArray(result.data)) {
      break;
    }

    if (page === 1) {
      totalPages = result.pages ?? 1;
    }

    const items = result.data.map((item) => ({
      code: String(item.SECURITY_CODE ?? symbol),
      date: parseDate(item.TRADE_DATE),
      inventory: toNumberSafe(item.ON_WARRANT_NUM),
      change: toNumberSafe(item.ADDCHANGE),
    }));
    allData.push(...items);
    page++;
  } while (page <= totalPages);

  return allData;
}

/**
 * 获取 COMEX 黄金/白银库存数据
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
  const allData: ComexInventory[] = [];
  let page = 1;
  let totalPages = 1;
  const nameMap: Record<string, string> = { gold: '黄金', silver: '白银' };

  do {
    const params = new URLSearchParams({
      sortColumns: 'REPORT_DATE',
      sortTypes: '-1',
      pageSize: String(pageSize),
      pageNumber: String(page),
      reportName: 'RPT_FUTUOPT_GOLDSIL',
      columns: 'ALL',
      quoteColumns: '',
      source: 'WEB',
      client: 'WEB',
      filter: `(INDICATOR_ID1="${indicatorId}")(@STORAGE_TON<>"NULL")`,
    });

    const url = `${EM_DATACENTER_URL}?${params.toString()}`;
    const json = await client.get<DatacenterResponse>(url, {
      responseType: 'json',
    });

    const result = json?.result;
    if (!result || !Array.isArray(result.data)) {
      break;
    }

    if (page === 1) {
      totalPages = result.pages ?? 1;
    }

    const items = result.data.map((item) => ({
      date: parseDate(item.REPORT_DATE),
      name: nameMap[symbol] ?? symbol,
      storageTon: toNumberSafe(item.STORAGE_TON),
      storageOunce: toNumberSafe(item.STORAGE_OUNCE),
      inventory: toNumberSafe(item.STORAGE_TON),
      change: null,
      market: symbol,
    }));
    allData.push(...items);
    page++;
  } while (page <= totalPages);

  return allData;
}
