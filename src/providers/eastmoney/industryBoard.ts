/**
 * 东方财富 - 行业板块
 */
import {
  RequestClient,
  EM_BOARD_LIST_URL,
  EM_BOARD_SPOT_URL,
  EM_BOARD_CONS_URL,
  EM_BOARD_KLINE_URL,
  EM_BOARD_TRENDS_URL,
  toNumber,
  assertKlinePeriod,
  assertAdjustType,
  assertMinutePeriod,
  getPeriodCode,
  getAdjustCode,
} from '../../core';
import { toNumberSafe } from '../../core/parser';
import {
  fetchPaginatedData,
  fetchEmHistoryKline,
  parseEmKlineCsv,
} from './utils';
import type {
  IndustryBoard,
  IndustryBoardSpot,
  IndustryBoardConstituent,
  IndustryBoardKline,
  IndustryBoardMinuteTimeline,
  IndustryBoardMinuteKline,
} from '../../types';

// 板块名称到代码的缓存
let boardNameCodeMap: Map<string, string> | null = null;

/**
 * 获取板块代码（支持板块名称或代码）
 */
/**
 * 获取板块代码（支持板块名称或代码）
 */
async function getBoardCode(
  client: RequestClient,
  symbol: string
): Promise<string> {
  // 如果是 BK 开头的代码，直接返回
  if (symbol.startsWith('BK')) {
    return symbol;
  }

  // 否则认为是板块名称，需要查询对应的代码
  if (!boardNameCodeMap) {
    const boards = await getIndustryList(client);
    boardNameCodeMap = new Map(boards.map((b) => [b.name, b.code]));
  }

  const code = boardNameCodeMap.get(symbol);
  if (!code) {
    throw new Error(`未找到行业板块: ${symbol}`);
  }
  return code;
}

/**
 * 获取东方财富行业板块名称列表
 * @param client 请求客户端
 * @returns 行业板块列表
 */
export async function getIndustryList(
  client: RequestClient
): Promise<IndustryBoard[]> {
  const baseParams = {
    po: '1',
    np: '1',
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: '2',
    invt: '2',
    fid: 'f3',
    fs: 'm:90 t:2 f:!50',
  };

  const fieldsStr =
    'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152,f124,f107,f104,f105,f140,f141,f207,f208,f209,f222';

  const boards = await fetchPaginatedData<IndustryBoard>(
    client,
    EM_BOARD_LIST_URL,
    baseParams,
    fieldsStr,
    100,
    (item, index) => ({
      rank: index,
      name: String(item.f14 ?? ''),
      code: String(item.f12 ?? ''),
      price: toNumberSafe(item.f2),
      change: toNumberSafe(item.f4),
      changePercent: toNumberSafe(item.f3),
      totalMarketCap: toNumberSafe(item.f20),
      turnoverRate: toNumberSafe(item.f8),
      riseCount: toNumberSafe(item.f104),
      fallCount: toNumberSafe(item.f105),
      leadingStock: item.f128 ? String(item.f128) : null,
      leadingStockChangePercent: toNumberSafe(item.f136),
    })
  );

  // 按涨跌幅排序并重新生成排名
  boards.sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
  boards.forEach((board, idx) => {
    board.rank = idx + 1;
  });

  return boards;
}

/**
 * 获取东方财富行业板块实时行情
 * @param client 请求客户端
 * @param symbol 行业板块名称（如"小金属"）或代码（如"BK1027"）
 * @returns 实时行情指标列表
 */
export async function getIndustrySpot(
  client: RequestClient,
  symbol: string
): Promise<IndustryBoardSpot[]> {
  const boardCode = await getBoardCode(client, symbol);

  const params = new URLSearchParams({
    fields: 'f43,f44,f45,f46,f47,f48,f170,f171,f168,f169',
    mpi: '1000',
    invt: '2',
    fltt: '1',
    secid: `90.${boardCode}`,
  });

  const url = `${EM_BOARD_SPOT_URL}?${params.toString()}`;
  const json = await client.get<{ data?: Record<string, number> }>(url, {
    responseType: 'json',
  });

  const data = json?.data;
  if (!data) {
    return [];
  }

  // 字段映射：原始值需要 ÷100，但成交量和成交额需保持原始值
  const fieldMap: { key: string; name: string; divide: boolean }[] = [
    { key: 'f43', name: '最新', divide: true },
    { key: 'f44', name: '最高', divide: true },
    { key: 'f45', name: '最低', divide: true },
    { key: 'f46', name: '开盘', divide: true },
    { key: 'f47', name: '成交量', divide: false },
    { key: 'f48', name: '成交额', divide: false },
    { key: 'f170', name: '涨跌幅', divide: true },
    { key: 'f171', name: '振幅', divide: true },
    { key: 'f168', name: '换手率', divide: true },
    { key: 'f169', name: '涨跌额', divide: true },
  ];

  return fieldMap.map(({ key, name, divide }) => {
    const rawValue = data[key];
    let value: number | null = null;
    if (typeof rawValue === 'number' && !isNaN(rawValue)) {
      value = divide ? rawValue / 100 : rawValue;
    }
    return { item: name, value };
  });
}

/**
 * 获取东方财富行业板块成分股
 * @param client 请求客户端
 * @param symbol 行业板块名称（如"小金属"）或代码（如"BK1027"）
 * @returns 成分股列表
 */
export async function getIndustryConstituents(
  client: RequestClient,
  symbol: string
): Promise<IndustryBoardConstituent[]> {
  const boardCode = await getBoardCode(client, symbol);

  const baseParams = {
    po: '1',
    np: '1',
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: '2',
    invt: '2',
    fid: 'f3',
    fs: `b:${boardCode} f:!50`,
  };

  const fieldsStr =
    'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f22,f11,f62,f128,f136,f115,f152,f45';

  return fetchPaginatedData<IndustryBoardConstituent>(
    client,
    EM_BOARD_CONS_URL,
    baseParams,
    fieldsStr,
    100,
    (item, index) => ({
      rank: index,
      code: String(item.f12 ?? ''),
      name: String(item.f14 ?? ''),
      price: toNumberSafe(item.f2),
      changePercent: toNumberSafe(item.f3),
      change: toNumberSafe(item.f4),
      volume: toNumberSafe(item.f5),
      amount: toNumberSafe(item.f6),
      amplitude: toNumberSafe(item.f7),
      high: toNumberSafe(item.f15),
      low: toNumberSafe(item.f16),
      open: toNumberSafe(item.f17),
      prevClose: toNumberSafe(item.f18),
      turnoverRate: toNumberSafe(item.f8),
      pe: toNumberSafe(item.f9),
      pb: toNumberSafe(item.f23),
    })
  );
}

export interface IndustryBoardKlineOptions {
  /** K 线周期 */
  period?: 'daily' | 'weekly' | 'monthly';
  /** 复权类型 */
  adjust?: '' | 'qfq' | 'hfq';
  /** 开始日期 YYYYMMDD */
  startDate?: string;
  /** 结束日期 YYYYMMDD */
  endDate?: string;
}

/**
 * 获取东方财富行业板块历史 K 线
 * @param client 请求客户端
 * @param symbol 行业板块名称（如"小金属"）或代码（如"BK1027"）
 * @param options 选项
 * @returns 历史 K 线数据
 */
export async function getIndustryKline(
  client: RequestClient,
  symbol: string,
  options: IndustryBoardKlineOptions = {}
): Promise<IndustryBoardKline[]> {
  const {
    period = 'daily',
    adjust = '',
    startDate = '19700101',
    endDate = '20500101',
  } = options;

  assertKlinePeriod(period);
  assertAdjustType(adjust);

  const boardCode = await getBoardCode(client, symbol);

  const params = new URLSearchParams({
    secid: `90.${boardCode}`,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    klt: getPeriodCode(period),
    fqt: getAdjustCode(adjust),
    beg: startDate,
    end: endDate,
    smplmt: '10000',
    lmt: '1000000',
  });

  const url = EM_BOARD_KLINE_URL;
  const { klines } = await fetchEmHistoryKline(client, url, params);

  if (klines.length === 0) {
    return [];
  }

  return klines.map((line) => {
    const item = parseEmKlineCsv(line);
    return { ...item } as IndustryBoardKline;
  });
}

export interface IndustryBoardMinuteKlineOptions {
  /** K 线周期：1/5/15/30/60 分钟 */
  period?: '1' | '5' | '15' | '30' | '60';
}

/**
 * 获取东方财富行业板块分时行情
 * @param client 请求客户端
 * @param symbol 行业板块名称（如"小金属"）或代码（如"BK1027"）
 * @param options 选项
 * @returns 分时行情数据
 */
export async function getIndustryMinuteKline(
  client: RequestClient,
  symbol: string,
  options: IndustryBoardMinuteKlineOptions = {}
): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]> {
  const { period = '5' } = options;
  assertMinutePeriod(period);

  const boardCode = await getBoardCode(client, symbol);

  if (period === '1') {
    // 1 分钟分时数据，使用 trends2/get 接口
    const params = new URLSearchParams({
      fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58',
      iscr: '0',
      ndays: '1',
      secid: `90.${boardCode}`,
    });

    const url = `${EM_BOARD_TRENDS_URL}?${params.toString()}`;
    const json = await client.get<{ data?: { trends?: string[] } }>(url, {
      responseType: 'json',
    });

    const trends = json?.data?.trends;
    if (!Array.isArray(trends) || trends.length === 0) {
      return [];
    }

    return trends.map((line) => {
      const [time, open, close, high, low, volume, amount, price] =
        line.split(',');

      return {
        time,
        open: toNumber(open),
        close: toNumber(close),
        high: toNumber(high),
        low: toNumber(low),
        volume: toNumber(volume),
        amount: toNumber(amount),
        price: toNumber(price),
      } as IndustryBoardMinuteTimeline;
    });
  } else {
    // 5/15/30/60 分钟 K 线，使用 kline/get 接口
    const params = new URLSearchParams({
      secid: `90.${boardCode}`,
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      klt: period,
      fqt: '1',
      beg: '0',
      end: '20500101',
      smplmt: '10000',
      lmt: '1000000',
    });

    const url = `${EM_BOARD_KLINE_URL}?${params.toString()}`;
    const json = await client.get<{ data?: { klines?: string[] } }>(url, {
      responseType: 'json',
    });

    const klines = json?.data?.klines;
    if (!Array.isArray(klines) || klines.length === 0) {
      return [];
    }

    return klines.map((line) => {
      const [
        time,
        open,
        close,
        high,
        low,
        volume,
        amount,
        amplitude,
        changePercent,
        change,
        turnoverRate,
      ] = line.split(',');

      return {
        time,
        open: toNumber(open),
        close: toNumber(close),
        high: toNumber(high),
        low: toNumber(low),
        changePercent: toNumber(changePercent),
        change: toNumber(change),
        volume: toNumber(volume),
        amount: toNumber(amount),
        amplitude: toNumber(amplitude),
        turnoverRate: toNumber(turnoverRate),
      } as IndustryBoardMinuteKline;
    });
  }
}

