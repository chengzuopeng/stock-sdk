/**
 * 东方财富 - 资金流向
 * 数据来源：
 *   - 个股/板块资金流历史: https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get
 *   - 资金流排名:           https://push2.eastmoney.com/api/qt/clist/get
 */
import {
  type RequestClient,
  EM_FFLOW_URL,
  EM_CLIST_URL,
  EM_DATA_TOKEN,
  getMarketCode,
  toNumber,
  toNumberSafe,
} from '../../core';
import type {
  StockFundFlowDaily,
  FundFlowRankItem,
  SectorFundFlowItem,
  MarketFundFlow,
} from '../../types';

/** 资金流周期 */
export interface FundFlowOptions {
  /** 周期: 'daily' | 'weekly' | 'monthly'，默认 'daily' */
  period?: 'daily' | 'weekly' | 'monthly';
}

/** 资金流排名维度 */
export interface FundFlowRankOptions {
  /** 排名周期: 'today' | '3day' | '5day' | '10day'，默认 'today' */
  indicator?: 'today' | '3day' | '5day' | '10day';
  /** 板块类型（仅 getSectorFundFlowRank 使用）: 'industry' | 'concept' | 'region' */
  sectorType?: 'industry' | 'concept' | 'region';
}

/** 资金流周期对应的 klt 参数 */
const PERIOD_KLT_MAP: Record<NonNullable<FundFlowOptions['period']>, string> = {
  daily: '101',
  weekly: '102',
  monthly: '103',
};

/**
 * 个股资金流字段映射（fields 顺序）：
 * f51:日期 f52:主力净额 f53:小单净额 f54:中单净额 f55:大单净额 f56:超大单净额
 * f57:主力占比 f58:小单占比 f59:中单占比 f60:大单占比 f61:超大单占比
 * f62:收盘价 f63:涨跌幅 f64,f65:其他指数字段（板块/大盘场景使用）
 */
const FFLOW_FIELDS_2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65';

/**
 * fflow daykline 标准响应结构
 */
interface FFlowResponse {
  data?: {
    klines?: string[];
  } | null;
}

/**
 * push2 clist 标准响应结构
 */
interface ClistResponse {
  data?: {
    total?: number;
    diff?: Record<string, unknown>[];
  } | null;
}

/**
 * 解析 fflow klines 字符串为个股资金流对象。
 *
 * klines 顺序：日期, 主力, 小单, 中单, 大单, 超大单, 主力%, 小单%, 中单%, 大单%, 超大单%, 收盘价, 涨跌幅, ...
 */
function parseStockFundFlow(line: string): StockFundFlowDaily {
  const cols = line.split(',');
  return {
    date: cols[0] ?? '',
    mainNetInflow: toNumber(cols[1]),
    smallNetInflow: toNumber(cols[2]),
    mediumNetInflow: toNumber(cols[3]),
    largeNetInflow: toNumber(cols[4]),
    superLargeNetInflow: toNumber(cols[5]),
    mainNetInflowPercent: toNumber(cols[6]),
    smallNetInflowPercent: toNumber(cols[7]),
    mediumNetInflowPercent: toNumber(cols[8]),
    largeNetInflowPercent: toNumber(cols[9]),
    superLargeNetInflowPercent: toNumber(cols[10]),
    close: toNumber(cols[11]),
    changePercent: toNumber(cols[12]),
  };
}

/**
 * 解析大盘资金流 klines 字符串。
 *
 * 大盘的 klines 末尾 4 列分别是：上证收盘, 上证涨跌幅, 深证收盘, 深证涨跌幅。
 */
function parseMarketFundFlow(line: string): MarketFundFlow {
  const cols = line.split(',');
  return {
    date: cols[0] ?? '',
    mainNetInflow: toNumber(cols[1]),
    smallNetInflow: toNumber(cols[2]),
    mediumNetInflow: toNumber(cols[3]),
    largeNetInflow: toNumber(cols[4]),
    superLargeNetInflow: toNumber(cols[5]),
    mainNetInflowPercent: toNumber(cols[6]),
    smallNetInflowPercent: toNumber(cols[7]),
    mediumNetInflowPercent: toNumber(cols[8]),
    largeNetInflowPercent: toNumber(cols[9]),
    superLargeNetInflowPercent: toNumber(cols[10]),
    shClose: toNumber(cols[11]),
    shChangePercent: toNumber(cols[12]),
    szClose: toNumber(cols[13]),
    szChangePercent: toNumber(cols[14]),
  };
}

/**
 * 个股资金流-排名维度对应的字段、排序字段映射。
 */
interface RankIndicatorConfig {
  /** 排序字段（主力净额） */
  fid: string;
  /** 字段集 */
  fields: string;
  /** 涨跌幅字段名 */
  changePercentField: string;
  /** 主力净额、净占比 */
  mainNet: string;
  mainPct: string;
  /** 超大单 */
  superLargeNet: string;
  superLargePct: string;
  /** 大单 */
  largeNet: string;
  largePct: string;
  /** 中单 */
  mediumNet: string;
  mediumPct: string;
  /** 小单 */
  smallNet: string;
  smallPct: string;
}

const STOCK_RANK_CONFIG: Record<NonNullable<FundFlowRankOptions['indicator']>, RankIndicatorConfig> = {
  today: {
    fid: 'f62',
    fields: 'f12,f14,f2,f3,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,f124',
    changePercentField: 'f3',
    mainNet: 'f62',
    mainPct: 'f184',
    superLargeNet: 'f66',
    superLargePct: 'f69',
    largeNet: 'f72',
    largePct: 'f75',
    mediumNet: 'f78',
    mediumPct: 'f81',
    smallNet: 'f84',
    smallPct: 'f87',
  },
  '3day': {
    fid: 'f267',
    fields: 'f12,f14,f2,f127,f267,f268,f269,f270,f271,f272,f273,f274,f275,f276,f124',
    changePercentField: 'f127',
    mainNet: 'f267',
    mainPct: 'f268',
    superLargeNet: 'f269',
    superLargePct: 'f270',
    largeNet: 'f271',
    largePct: 'f272',
    mediumNet: 'f273',
    mediumPct: 'f274',
    smallNet: 'f275',
    smallPct: 'f276',
  },
  '5day': {
    fid: 'f164',
    fields: 'f12,f14,f2,f109,f164,f165,f166,f167,f168,f169,f170,f171,f172,f173,f124',
    changePercentField: 'f109',
    mainNet: 'f164',
    mainPct: 'f165',
    superLargeNet: 'f166',
    superLargePct: 'f167',
    largeNet: 'f168',
    largePct: 'f169',
    mediumNet: 'f170',
    mediumPct: 'f171',
    smallNet: 'f172',
    smallPct: 'f173',
  },
  '10day': {
    fid: 'f174',
    fields: 'f12,f14,f2,f160,f174,f175,f176,f177,f178,f179,f180,f181,f182,f183,f124',
    changePercentField: 'f160',
    mainNet: 'f174',
    mainPct: 'f175',
    superLargeNet: 'f176',
    superLargePct: 'f177',
    largeNet: 'f178',
    largePct: 'f179',
    mediumNet: 'f180',
    mediumPct: 'f181',
    smallNet: 'f182',
    smallPct: 'f183',
  },
};

/** 板块类型 → fs 参数映射 */
const SECTOR_TYPE_MAP: Record<NonNullable<FundFlowRankOptions['sectorType']>, string> = {
  industry: 'm:90+t:2',
  concept: 'm:90+t:3',
  region: 'm:90+t:1',
};

/** 个股资金流排名 fs 参数（沪深北 A 股全部） */
const STOCK_FS = 'm:0+t:6+f:!2,m:0+t:13+f:!2,m:0+t:80+f:!2,m:1+t:2+f:!2,m:1+t:23+f:!2,m:0+t:7+f:!2,m:1+t:3+f:!2';

/**
 * 通用 push2 clist 全分页拉取。
 *
 * @param client      - 请求客户端
 * @param baseParams  - clist 基础参数（不含 pn / pz）
 * @param pageSize    - 每页大小，默认 100
 * @param maxPages    - 安全上限，默认 1000；命中时会输出 warning 提示截断
 */
async function fetchClistAllPages(
  client: RequestClient,
  baseParams: Record<string, string>,
  pageSize = 100,
  maxPages = 1000
): Promise<Record<string, unknown>[]> {
  const allItems: Record<string, unknown>[] = [];
  let page = 1;
  let total = 0;

  do {
    const params = new URLSearchParams({
      ...baseParams,
      pn: String(page),
      pz: String(pageSize),
    });
    const url = `${EM_CLIST_URL}?${params.toString()}`;
    const json = await client.get<ClistResponse>(url, { responseType: 'json' });
    const data = json?.data;
    if (!data || !Array.isArray(data.diff)) break;
    if (page === 1) total = data.total ?? 0;
    allItems.push(...data.diff);
    if (allItems.length >= total || data.diff.length < pageSize) break;
    page++;
  } while (allItems.length < total && page <= maxPages);

  // 命中安全阀但仍未拉完时，提示调用方避免静默截断
  if (page > maxPages && allItems.length < total) {
    // eslint-disable-next-line no-console
    console.warn(
      `[stock-sdk] fetchClistAllPages truncated at maxPages=${maxPages} ` +
        `(server reports total=${total}, fetched=${allItems.length}). ` +
        `Pass a larger \`maxPages\` to fetch the full dataset.`
    );
  }

  return allItems;
}

/**
 * 获取个股资金流历史（日/周/月线）
 *
 * @param client - 请求客户端
 * @param symbol - 股票代码（带或不带 sh/sz/bj 前缀均可）
 * @param options - 周期选项
 * @returns 资金流历史数组（按日期升序）
 */
export async function getIndividualFundFlow(
  client: RequestClient,
  symbol: string,
  options: FundFlowOptions = {}
): Promise<StockFundFlowDaily[]> {
  const { period = 'daily' } = options;
  const klt = PERIOD_KLT_MAP[period];
  if (!klt) {
    throw new RangeError(`Invalid period: ${period}. Must be daily/weekly/monthly.`);
  }

  const pureSymbol = symbol.replace(/^(sh|sz|bj)/i, '');
  const secid = `${getMarketCode(symbol)}.${pureSymbol}`;

  const params = new URLSearchParams({
    lmt: '0',
    klt,
    secid,
    fields1: 'f1,f2,f3,f7',
    fields2: FFLOW_FIELDS_2,
    ut: EM_DATA_TOKEN,
  });

  const url = `${EM_FFLOW_URL}?${params.toString()}`;
  const json = await client.get<FFlowResponse>(url, { responseType: 'json' });

  const klines = json?.data?.klines;
  if (!Array.isArray(klines) || klines.length === 0) return [];

  return klines.map(parseStockFundFlow);
}

/**
 * 获取大盘资金流（上证 + 深证）
 *
 * @param client - 请求客户端
 * @returns 大盘资金流历史数组
 */
export async function getMarketFundFlow(
  client: RequestClient
): Promise<MarketFundFlow[]> {
  const params = new URLSearchParams({
    lmt: '0',
    klt: '101',
    secid: '1.000001',
    secid2: '0.399001',
    fields1: 'f1,f2,f3,f7',
    fields2: FFLOW_FIELDS_2,
    ut: EM_DATA_TOKEN,
  });

  const url = `${EM_FFLOW_URL}?${params.toString()}`;
  const json = await client.get<FFlowResponse>(url, { responseType: 'json' });

  const klines = json?.data?.klines;
  if (!Array.isArray(klines) || klines.length === 0) return [];

  return klines.map(parseMarketFundFlow);
}

/**
 * 获取个股资金流排名（沪深北 A 股全市场）
 *
 * @param client - 请求客户端
 * @param options - 排名周期
 * @returns 资金流排名数组（按主力净额降序）
 */
export async function getFundFlowRank(
  client: RequestClient,
  options: FundFlowRankOptions = {}
): Promise<FundFlowRankItem[]> {
  const { indicator = 'today' } = options;
  const config = STOCK_RANK_CONFIG[indicator];
  if (!config) {
    throw new RangeError(`Invalid indicator: ${indicator}.`);
  }

  const baseParams: Record<string, string> = {
    fid: config.fid,
    po: '1',
    np: '1',
    fltt: '2',
    invt: '2',
    ut: EM_DATA_TOKEN,
    fs: STOCK_FS,
    fields: config.fields,
  };

  const items = await fetchClistAllPages(client, baseParams, 100);

  return items.map((item) => ({
    code: String(item.f12 ?? ''),
    name: String(item.f14 ?? ''),
    price: toNumberSafe(item.f2),
    changePercent: toNumberSafe(item[config.changePercentField]),
    mainNetInflow: toNumberSafe(item[config.mainNet]),
    mainNetInflowPercent: toNumberSafe(item[config.mainPct]),
    superLargeNetInflow: toNumberSafe(item[config.superLargeNet]),
    superLargeNetInflowPercent: toNumberSafe(item[config.superLargePct]),
    largeNetInflow: toNumberSafe(item[config.largeNet]),
    largeNetInflowPercent: toNumberSafe(item[config.largePct]),
    mediumNetInflow: toNumberSafe(item[config.mediumNet]),
    mediumNetInflowPercent: toNumberSafe(item[config.mediumPct]),
    smallNetInflow: toNumberSafe(item[config.smallNet]),
    smallNetInflowPercent: toNumberSafe(item[config.smallPct]),
  }));
}

/**
 * 获取板块资金流排名（行业 / 概念 / 地域）
 *
 * @param client - 请求客户端
 * @param options - 排名周期、板块类型
 * @returns 板块资金流排名数组
 */
export async function getSectorFundFlowRank(
  client: RequestClient,
  options: FundFlowRankOptions = {}
): Promise<SectorFundFlowItem[]> {
  const { indicator = 'today', sectorType = 'industry' } = options;
  const config = STOCK_RANK_CONFIG[indicator];
  if (!config) {
    throw new RangeError(`Invalid indicator: ${indicator}.`);
  }
  const fs = SECTOR_TYPE_MAP[sectorType];
  if (!fs) {
    throw new RangeError(`Invalid sectorType: ${sectorType}.`);
  }

  // 板块场景需要返回主力净流入最大股，加上 f204(代码)/f205(名称)
  const fields = `${config.fields},f204,f205`;
  const baseParams: Record<string, string> = {
    fid: config.fid,
    po: '1',
    np: '1',
    fltt: '2',
    invt: '2',
    ut: EM_DATA_TOKEN,
    fs,
    fields,
  };

  const items = await fetchClistAllPages(client, baseParams, 100);

  return items.map((item) => ({
    code: String(item.f12 ?? ''),
    name: String(item.f14 ?? ''),
    changePercent: toNumberSafe(item[config.changePercentField]),
    mainNetInflow: toNumberSafe(item[config.mainNet]),
    mainNetInflowPercent: toNumberSafe(item[config.mainPct]),
    superLargeNetInflow: toNumberSafe(item[config.superLargeNet]),
    largeNetInflow: toNumberSafe(item[config.largeNet]),
    mediumNetInflow: toNumberSafe(item[config.mediumNet]),
    smallNetInflow: toNumberSafe(item[config.smallNet]),
    topStockCode: item.f204 ? String(item.f204) : undefined,
    topStockName: item.f205 ? String(item.f205) : undefined,
  }));
}

/**
 * 获取单个板块的历史资金流（按 BK 编号或全前缀的 secid）
 *
 * @param client - 请求客户端
 * @param symbol - 板块编号（如 'BK0438' 或 '90.BK0438'）
 * @param options - 周期选项
 * @returns 板块历史资金流（与个股同结构）
 */
export async function getSectorFundFlowHistory(
  client: RequestClient,
  symbol: string,
  options: FundFlowOptions = {}
): Promise<StockFundFlowDaily[]> {
  const { period = 'daily' } = options;
  const klt = PERIOD_KLT_MAP[period];
  if (!klt) {
    throw new RangeError(`Invalid period: ${period}. Must be daily/weekly/monthly.`);
  }

  // 板块 secid 的市场前缀固定为 90
  const secid = symbol.includes('.') ? symbol : `90.${symbol}`;

  const params = new URLSearchParams({
    lmt: '0',
    klt,
    secid,
    fields1: 'f1,f2,f3,f7',
    fields2: FFLOW_FIELDS_2,
    ut: EM_DATA_TOKEN,
  });

  const url = `${EM_FFLOW_URL}?${params.toString()}`;
  const json = await client.get<FFlowResponse>(url, { responseType: 'json' });

  const klines = json?.data?.klines;
  if (!Array.isArray(klines) || klines.length === 0) return [];

  return klines.map(parseStockFundFlow);
}
