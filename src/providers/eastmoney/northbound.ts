/**
 * 东方财富 - 沪深港通 / 北向资金
 * 数据来源：
 *   - 分时数据:           https://push2.eastmoney.com/api/qt/kamtbs.rtmin/get
 *   - 资金流向汇总/排行/历史: datacenter-web RPT_MUTUAL_*
 */
import {
  type RequestClient,
  EM_NORTHBOUND_MINUTE_URL,
  toNumber,
  toNumberSafe,
} from '../../core';
import type {
  NorthboundDirection,
  NorthboundMarket,
  NorthboundRankPeriod,
  NorthboundMinuteItem,
  NorthboundFlowSummary,
  NorthboundHoldingRankItem,
  NorthboundHistoryItem,
  NorthboundIndividualItem,
} from '../../types';
import { fetchDatacenterList } from './datacenter';

/** 北向持股排行选项 */
export interface NorthboundHoldingRankOptions {
  /** 市场: 'all' | 'shanghai' | 'shenzhen'，默认 'all' */
  market?: NorthboundMarket;
  /** 排名周期，默认 '5day' */
  period?: NorthboundRankPeriod;
  /**
   * 指定交易日 YYYY-MM-DD（默认服务端最新交易日）。
   * 注意：必须是有数据的交易日，否则返回空数组。
   */
  date?: string;
}

/** 北向资金历史/个股持仓选项 */
export interface NorthboundHistoryOptions {
  /** 起始日期 YYYY-MM-DD */
  startDate?: string;
  /** 结束日期 YYYY-MM-DD */
  endDate?: string;
}

/** 分时接口响应 */
interface MinuteApiResponse {
  data?: {
    s2n?: string[];
    s2nDate?: string;
    n2s?: string[];
    n2sDate?: string;
  } | null;
}

/**
 * 排行周期 → INTERVAL_TYPE 映射（沪深港通持股 RPT_MUTUAL_STOCK_NORTHSTA）
 */
const RANK_PERIOD_MAP: Record<NorthboundRankPeriod, string> = {
  today: '1',
  '3day': '3',
  '5day': '5',
  '10day': '10',
  month: 'M',
  quarter: 'Q',
  year: 'Y',
};

/**
 * 排行市场 → MUTUAL_TYPE 映射（'all' 不传过滤）
 */
const RANK_MARKET_MAP: Record<Exclude<NorthboundMarket, 'all'>, string> = {
  shanghai: '001',
  shenzhen: '003',
};

/**
 * 解析 fflow 风格的逗号分隔字符串为分时数据。
 *
 * 字段顺序（基于 akshare 实现，索引 0/1/3/5）：
 *   0: HH:MM
 *   1: 沪股通净流入(万元)
 *   3: 深股通净流入(万元)
 *   5: 北向/南向合计(万元)
 */
function parseMinuteRow(line: string, date: string): NorthboundMinuteItem {
  const cols = line.split(',');
  return {
    date,
    time: cols[0] ?? '',
    shanghaiNetInflow: toNumber(cols[1]),
    shenzhenNetInflow: toNumber(cols[3]),
    totalNetInflow: toNumber(cols[5]),
  };
}

/**
 * 获取北向 / 南向资金分时数据
 *
 * @param client - 请求客户端
 * @param direction - 方向：'north' (北向，默认) 或 'south' (南向)
 * @returns 分时数据数组（按时间升序）
 */
export async function getNorthboundMinute(
  client: RequestClient,
  direction: NorthboundDirection = 'north'
): Promise<NorthboundMinuteItem[]> {
  const params = new URLSearchParams({
    fields1: 'f1,f2,f3,f4',
    fields2: 'f51,f54,f52,f58,f53,f62,f56,f57,f60,f61',
    ut: 'b2884a393a59ad64002292a3e90d46a5',
  });

  const url = `${EM_NORTHBOUND_MINUTE_URL}?${params.toString()}`;
  const json = await client.get<MinuteApiResponse>(url, { responseType: 'json' });
  const data = json?.data;
  if (!data) return [];

  if (direction === 'south') {
    const list = data.n2s ?? [];
    const date = data.n2sDate ?? '';
    return list.map((line) => parseMinuteRow(line, formatDate(date)));
  }

  const list = data.s2n ?? [];
  const date = data.s2nDate ?? '';
  return list.map((line) => parseMinuteRow(line, formatDate(date)));
}

/**
 * 把 YYYYMMDD 或 YYYY-MM-DD 格式的字符串归一化为 YYYY-MM-DD。
 */
function formatDate(value: string): string {
  if (!value) return '';
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

/**
 * 提取日期前缀 YYYY-MM-DD（兼容 ISO 时间戳）。
 */
function parseDateOnly(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str;
}

/**
 * 获取沪深港通市场资金流向汇总（北向/南向 + 港股通沪深拆分）
 *
 * @param client - 请求客户端
 * @returns 各板块资金流向汇总
 */
export async function getNorthboundFlowSummary(
  client: RequestClient
): Promise<NorthboundFlowSummary[]> {
  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_MUTUAL_QUOTA',
      columns:
        'TRADE_DATE,MUTUAL_TYPE,BOARD_TYPE,MUTUAL_TYPE_NAME,FUNDS_DIRECTION,INDEX_CODE,INDEX_NAME,BOARD_CODE',
      quoteColumns:
        'status~07~BOARD_CODE,dayNetAmtIn~07~BOARD_CODE,dayAmtRemain~07~BOARD_CODE,dayAmtThreshold~07~BOARD_CODE,f104~07~BOARD_CODE,f105~07~BOARD_CODE,f106~07~BOARD_CODE,f3~03~INDEX_CODE~INDEX_f3,netBuyAmt~07~BOARD_CODE',
      quoteType: '0',
      sortColumns: 'MUTUAL_TYPE',
      sortTypes: '1',
      pageSize: 2000,
      fetchAllPages: false,
    },
    (item) => ({
      date: parseDateOnly(item.TRADE_DATE),
      type: String(item.MUTUAL_TYPE ?? ''),
      boardName: String(item.MUTUAL_TYPE_NAME ?? ''),
      direction: String(item.FUNDS_DIRECTION ?? ''),
      status: String(item.status ?? ''),
      netBuyAmount: toNumberSafe(item.netBuyAmt),
      netInflow: toNumberSafe(item.dayNetAmtIn),
      remainAmount: toNumberSafe(item.dayAmtRemain),
      upCount: toNumberSafe(item.f104),
      flatCount: toNumberSafe(item.f106),
      downCount: toNumberSafe(item.f105),
      indexCode: String(item.INDEX_CODE ?? ''),
      indexName: String(item.INDEX_NAME ?? ''),
      indexChangePercent: toNumberSafe(item.INDEX_f3),
    })
  );
}

/**
 * 获取北向 / 沪股通 / 深股通持股个股排行
 *
 * @param client - 请求客户端
 * @param options - 市场 / 周期 / 日期
 * @returns 排行数组
 */
export async function getNorthboundHoldingRank(
  client: RequestClient,
  options: NorthboundHoldingRankOptions = {}
): Promise<NorthboundHoldingRankItem[]> {
  const { market = 'all', period = '5day', date } = options;
  const intervalType = RANK_PERIOD_MAP[period];
  if (!intervalType) {
    throw new RangeError(`Invalid period: ${period}.`);
  }

  const filters: string[] = [`(INTERVAL_TYPE="${intervalType}")`];
  if (date) filters.push(`(TRADE_DATE='${date}')`);
  if (market !== 'all') {
    filters.push(`(MUTUAL_TYPE="${RANK_MARKET_MAP[market]}")`);
  }

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_MUTUAL_STOCK_NORTHSTA',
      columns: 'ALL',
      sortColumns: 'ADD_MARKET_CAP',
      sortTypes: '-1',
      pageSize: 500,
      filter: filters.join(''),
    },
    (item) => ({
      date: parseDateOnly(item.TRADE_DATE),
      code: String(item.SECURITY_CODE ?? ''),
      name: String(item.SECURITY_NAME ?? item.SECURITY_NAME_ABBR ?? ''),
      close: toNumberSafe(item.CLOSE_PRICE),
      changePercent: toNumberSafe(item.CHANGE_RATE),
      holdShares: toNumberSafe(item.HOLD_SHARES),
      holdMarketValue: toNumberSafe(item.HOLD_MARKET_CAP),
      holdRatioFloat: toNumberSafe(item.HOLD_RATIO),
      holdRatioTotal: toNumberSafe(item.A_SHARES_RATIO),
      addShares: toNumberSafe(item.ADD_SHARES),
      addMarketValue: toNumberSafe(item.ADD_MARKET_CAP),
      addMarketValuePercent: toNumberSafe(item.ADD_MARKET_CAP_PROPORTION),
      sector: String(item.BOARD_NAME ?? ''),
    })
  );
}

/**
 * 获取北向 / 南向资金历史（按日）
 *
 * @param client - 请求客户端
 * @param direction - 方向，默认 'north'
 * @param options - 起止日期
 * @returns 资金历史数组
 */
export async function getNorthboundHistory(
  client: RequestClient,
  direction: NorthboundDirection = 'north',
  options: NorthboundHistoryOptions = {}
): Promise<NorthboundHistoryItem[]> {
  const { startDate, endDate } = options;
  // MUTUAL_TYPE 编码：001 沪股通, 003 深股通, 005 港股通(沪), 007 港股通(深)
  // 对外简化：北向 = 沪股通+深股通合计；南向 = 港股通(沪)+(深) 合计
  // 实际通常以 BOARD_TYPE 区分整体，这里 BOARD_TYPE: 1=北向 0=南向
  const filters: string[] = [direction === 'north' ? '(BOARD_TYPE="1")' : '(BOARD_TYPE="0")'];
  if (startDate) filters.push(`(TRADE_DATE>='${startDate}')`);
  if (endDate) filters.push(`(TRADE_DATE<='${endDate}')`);

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_MUTUAL_DEAL_HISTORY',
      columns: 'ALL',
      sortColumns: 'TRADE_DATE',
      sortTypes: '-1',
      pageSize: 500,
      filter: filters.join(''),
    },
    (item) => ({
      date: parseDateOnly(item.TRADE_DATE),
      netBuyAmount: toNumberSafe(item.NET_DEAL_AMT),
      buyAmount: toNumberSafe(item.BUY_AMT),
      sellAmount: toNumberSafe(item.SELL_AMT),
      accNetBuyAmount: toNumberSafe(item.ACCUM_DEAL_AMT),
      netInflow: toNumberSafe(item.FUND_INFLOW),
      remainAmount: toNumberSafe(item.QUOTA_BALANCE),
      topStockCode: item.LEAD_STOCKS_CODE ? String(item.LEAD_STOCKS_CODE) : null,
      topStockName: item.LEAD_STOCKS_NAME ? String(item.LEAD_STOCKS_NAME) : null,
      topStockChangePercent: toNumberSafe(item.LS_CHANGE_RATE),
    })
  );
}

/**
 * 获取个股的北向持仓历史
 *
 * @param client - 请求客户端
 * @param symbol - 股票代码（不带交易所前缀）
 * @param options - 起止日期
 * @returns 个股北向持仓历史
 */
export async function getNorthboundIndividual(
  client: RequestClient,
  symbol: string,
  options: NorthboundHistoryOptions = {}
): Promise<NorthboundIndividualItem[]> {
  const pureSymbol = symbol.replace(/^(sh|sz|bj)/i, '');
  const { startDate, endDate } = options;

  const filters: string[] = [`(SECURITY_CODE="${pureSymbol}")`];
  if (startDate) filters.push(`(TRADE_DATE>='${startDate}')`);
  if (endDate) filters.push(`(TRADE_DATE<='${endDate}')`);

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_MUTUAL_HOLDSTOCKNORTH_STA',
      columns: 'ALL',
      sortColumns: 'TRADE_DATE',
      sortTypes: '-1',
      pageSize: 500,
      filter: filters.join(''),
    },
    (item) => ({
      date: parseDateOnly(item.TRADE_DATE),
      holdShares: toNumberSafe(item.HOLD_SHARES),
      holdMarketValue: toNumberSafe(item.HOLD_MARKET_CAP),
      holdRatioFloat: toNumberSafe(item.HOLD_RATIO),
      holdRatioTotal: toNumberSafe(item.A_SHARES_RATIO),
      close: toNumberSafe(item.CLOSE_PRICE),
      changePercent: toNumberSafe(item.CHANGE_RATE),
    })
  );
}
