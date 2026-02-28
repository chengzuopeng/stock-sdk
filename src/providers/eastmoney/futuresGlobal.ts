/**
 * 东方财富 - 全球期货行情 + K 线
 */
import {
  RequestClient,
  EM_FUTURES_KLINE_URL,
  EM_FUTURES_GLOBAL_SPOT_URL,
  EM_FUTURES_GLOBAL_SPOT_TOKEN,
  GLOBAL_FUTURES_MARKET,
  assertKlinePeriod,
  getPeriodCode,
  toNumber,
} from '../../core';
import type { GlobalFuturesQuote, FuturesKline } from '../../types';
import { fetchEmHistoryKline, parseEmKlineCsv } from './utils';

export interface GlobalFuturesSpotOptions {
  /** 每页条数，默认 20 */
  pageSize?: number;
}

export interface GlobalFuturesKlineOptions {
  /** K 线周期 */
  period?: 'daily' | 'weekly' | 'monthly';
  /** 开始日期 YYYYMMDD */
  startDate?: string;
  /** 结束日期 YYYYMMDD */
  endDate?: string;
  /** 东方财富市场代码（用于未内置的品种，可从 GLOBAL_FUTURES_MARKET 查表） */
  marketCode?: number;
}

interface FutsseApiItem {
  dm: string;
  name: string;
  p: number;
  zde: number;
  zdf: number;
  o: number;
  h: number;
  l: number;
  zjsj: number;
  vol: number;
  wp: number;
  np: number;
  ccl: number;
  sc: number;
  zsjd: number;
}

interface FutsseApiResponse {
  list: FutsseApiItem[];
  total: number;
}

/**
 * 获取全球期货实时行情（自动分页拉取全部）
 * @param client - 请求客户端
 * @param options - 配置选项
 * @returns 全球期货行情数组
 */
export async function getGlobalFuturesSpot(
  client: RequestClient,
  options: GlobalFuturesSpotOptions = {}
): Promise<GlobalFuturesQuote[]> {
  const pageSize = options.pageSize ?? 20;
  const allData: GlobalFuturesQuote[] = [];
  let pageIndex = 0;
  let total = 0;

  do {
    const params = new URLSearchParams({
      orderBy: 'dm',
      sort: 'desc',
      pageSize: String(pageSize),
      pageIndex: String(pageIndex),
      token: EM_FUTURES_GLOBAL_SPOT_TOKEN,
      field: 'dm,sc,name,p,zsjd,zde,zdf,f152,o,h,l,zjsj,vol,wp,np,ccl',
      blockName: 'callback',
    });

    const url = `${EM_FUTURES_GLOBAL_SPOT_URL}?${params.toString()}`;
    const json = await client.get<FutsseApiResponse>(url, {
      responseType: 'json',
    });

    if (!json || !Array.isArray(json.list)) {
      break;
    }

    if (pageIndex === 0) {
      total = json.total ?? 0;
    }

    const items = json.list.map(mapFutsseItem);
    allData.push(...items);
    pageIndex++;
  } while (allData.length < total);

  return allData;
}

function mapFutsseItem(item: FutsseApiItem): GlobalFuturesQuote {
  return {
    code: item.dm || '',
    name: item.name || '',
    price: toNumber(String(item.p)),
    change: toNumber(String(item.zde)),
    changePercent: toNumber(String(item.zdf)),
    open: toNumber(String(item.o)),
    high: toNumber(String(item.h)),
    low: toNumber(String(item.l)),
    prevSettle: toNumber(String(item.zjsj)),
    volume: toNumber(String(item.vol)),
    buyVolume: toNumber(String(item.wp)),
    sellVolume: toNumber(String(item.np)),
    openInterest: toNumber(String(item.ccl)),
  };
}

/**
 * 解析全球期货 K 线 CSV（14 列），提取持仓量
 */
function parseGlobalFuturesKlineCsv(
  line: string
): Omit<FuturesKline, 'code' | 'name'> {
  const base = parseEmKlineCsv(line);
  const parts = line.split(',');
  return {
    ...base,
    openInterest: parts.length > 12 ? toNumber(parts[12]) : null,
  };
}

/**
 * 从合约代码中提取全球期货品种前缀
 * 如 HG00Y -> HG, CL2507 -> CL, LCPT -> LCPT
 */
function extractGlobalVariety(symbol: string): string {
  const match = symbol.match(/^([A-Z]+)/);
  if (!match) {
    throw new RangeError(
      `Invalid global futures symbol: "${symbol}". Expected format like HG00Y, CL2507`
    );
  }
  return match[1];
}

/**
 * 获取全球期货历史 K 线（日/周/月）
 * @param client - 请求客户端
 * @param symbol - 合约代码，如 'HG00Y'（COMEX铜连续）
 * @param options - 配置选项
 * @returns 期货 K 线数据数组
 */
export async function getGlobalFuturesKline(
  client: RequestClient,
  symbol: string,
  options: GlobalFuturesKlineOptions = {}
): Promise<FuturesKline[]> {
  const {
    period = 'daily',
    startDate = '19700101',
    endDate = '20500101',
  } = options;
  assertKlinePeriod(period);

  let mktCode = options.marketCode;
  if (mktCode === undefined) {
    const variety = extractGlobalVariety(symbol);
    mktCode = GLOBAL_FUTURES_MARKET[variety];
    if (mktCode === undefined) {
      const supported = Object.keys(GLOBAL_FUTURES_MARKET).join(', ');
      throw new RangeError(
        `Unknown global futures variety: "${variety}". Supported: ${supported}. ` +
          `Or specify marketCode manually via options.`
      );
    }
  }

  const secid = `${mktCode}.${symbol}`;

  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64',
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    klt: getPeriodCode(period),
    fqt: '0',
    secid,
    beg: startDate,
    end: endDate,
  });

  const { klines, name, code } = await fetchEmHistoryKline(
    client,
    EM_FUTURES_KLINE_URL,
    params
  );

  if (klines.length === 0) {
    return [];
  }

  return klines.map((line) => {
    const item = parseGlobalFuturesKlineCsv(line);
    return {
      ...item,
      code: code || symbol,
      name: name || '',
    };
  });
}
