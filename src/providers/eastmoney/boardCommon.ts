/**
 * 东方财富 - 板块通用逻辑
 * 提取行业板块和概念板块的共享代码
 */
import {
  RequestClient,
  getClientScopedCache,
  assertKlinePeriod,
  assertAdjustType,
  getPeriodCode,
  getAdjustCode,
} from '../../core';
import { NotFoundError, UpstreamEmptyError } from '../../core/errors';
import { toNumberSafe } from '../../core/parser';
import { createMinuteKlineProvider } from './minuteKlineFactory';
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

// ========== 类型定义 ==========

/**
 * 板块类型配置
 */
export interface BoardTypeConfig {
  /** 板块类型标识 */
  type: 'industry' | 'concept';
  /** 板块过滤器 */
  fsFilter: string;
  /** 板块列表 URL */
  listUrl: string;
  /** 板块行情 URL */
  spotUrl: string;
  /** 板块成分股 URL */
  consUrl: string;
  /** 板块 K 线 URL */
  klineUrl: string;
  /** 板块分时 URL */
  trendsUrl: string;
  /** 错误消息前缀 */
  errorPrefix: string;
}

/**
 * K 线选项
 */
export interface BoardKlineOptions {
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
 * 分钟 K 线选项
 */
export interface BoardMinuteKlineOptions {
  /** K 线周期：1/5/15/30/60 分钟 */
  period?: '1' | '5' | '15' | '30' | '60';
}

// ========== 工厂函数 ==========

/** R7-11: 板块名称映射缓存按 client 隔离（此前模块级共享跨实例串数据 1h） */
const BOARD_CODE_CACHE_OPTIONS = { defaultTTL: 60 * 60 * 1000, maxSize: 4 };

/**
 * 创建板块名称到代码的映射管理器
 */
export function createBoardCodeCache(config: BoardTypeConfig) {
  return {
    async getCode(
      client: RequestClient,
      symbol: string,
      listFn: (
        client: RequestClient
      ) => Promise<Array<{ name: string; code: string }>>
    ): Promise<string> {
      if (symbol.startsWith('BK')) {
        return symbol;
      }

      const cache = getClientScopedCache<Record<string, string>>(
        client,
        `eastmoney:board-code-map:${config.type}`,
        BOARD_CODE_CACHE_OPTIONS
      );
      const nameCodeMap = await cache.getOrFetch('name-code-map', async () => {
        const boards = await listFn(client);
        // 空板块列表必为上游异常：抛错且【不落缓存】，避免空 map 被缓存 1 小时、
        // 期间所有按名称的板块查询都 NotFoundError
        if (boards.length === 0) {
          throw new UpstreamEmptyError(
            `${config.errorPrefix}: 板块列表接口返回空数据`,
            'eastmoney'
          );
        }
        return Object.fromEntries(boards.map((board) => [board.name, board.code]));
      });

      const code = nameCodeMap[symbol];
      if (!code) {
        throw new NotFoundError(`${config.errorPrefix}: ${symbol}`, 'eastmoney');
      }
      return code;
    },
  };
}

/**
 * 获取板块列表通用逻辑
 */
export async function fetchBoardList(
  client: RequestClient,
  config: BoardTypeConfig
): Promise<IndustryBoard[]> {
  const baseParams = {
    po: '1',
    np: '1',
    ut: 'bd1d9ddb04089700cf9c27f6f7426281',
    fltt: '2',
    invt: '2',
    fid: config.type === 'concept' ? 'f12' : 'f3',
    fs: config.fsFilter,
  };

  const fieldsStr =
    config.type === 'concept'
      ? 'f2,f3,f4,f8,f12,f14,f15,f16,f17,f18,f20,f21,f24,f25,f22,f33,f11,f62,f128,f124,f107,f104,f105,f136'
      : 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f13,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25,f26,f22,f33,f11,f62,f128,f136,f115,f152,f124,f107,f104,f105,f140,f141,f207,f208,f209,f222';

  const boards = await fetchPaginatedData<IndustryBoard>(
    client,
    config.listUrl,
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

  boards.sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
  boards.forEach((board, idx) => {
    board.rank = idx + 1;
  });

  return boards;
}

/**
 * 获取板块实时行情通用逻辑
 */
export async function fetchBoardSpot(
  client: RequestClient,
  boardCode: string,
  spotUrl: string
): Promise<IndustryBoardSpot[]> {
  const params = new URLSearchParams({
    fields: 'f43,f44,f45,f46,f47,f48,f170,f171,f168,f169',
    mpi: '1000',
    invt: '2',
    fltt: '1',
    secid: `90.${boardCode}`,
  });

  const url = `${spotUrl}?${params.toString()}`;
  const json = await client.get<{ data?: Record<string, number> }>(url, {
    responseType: 'json',
  });

  const data = json?.data;
  if (!data) return [];

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
 * 获取板块成分股通用逻辑
 */
export async function fetchBoardConstituents(
  client: RequestClient,
  boardCode: string,
  consUrl: string
): Promise<IndustryBoardConstituent[]> {
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
    consUrl,
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

/**
 * 获取板块历史 K 线通用逻辑
 */
export async function fetchBoardKline(
  client: RequestClient,
  boardCode: string,
  klineUrl: string,
  options: BoardKlineOptions = {}
): Promise<IndustryBoardKline[]> {
  const {
    period = 'daily',
    adjust = '',
    startDate = '19700101',
    endDate = '20500101',
  } = options;

  assertKlinePeriod(period);
  assertAdjustType(adjust);

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

  const { klines } = await fetchEmHistoryKline(client, klineUrl, params);
  if (klines.length === 0) return [];

  return klines.map((line) => parseEmKlineCsv(line) as IndustryBoardKline);
}

/**
 * 板块分钟 K 线 provider 缓存(F45)
 *
 * fetchBoardMinuteKline 的 klineUrl/trendsUrl 按板块类型(行业/概念)逐调用
 * 传入,与工厂"一份 config 一个 provider"的形态不同 —— 这里按 URL 对 memo,
 * 实际只会出现行业/概念两个实例。
 */
const boardMinuteProviders = new Map<
  string,
  (
    client: RequestClient,
    boardCode: string,
    options?: BoardMinuteKlineOptions
  ) => Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]>
>();

/**
 * 获取板块分时行情通用逻辑
 *
 * F45:接入 createMinuteKlineProvider 工厂。板块差异点(与收编前一致):
 * - secid 为 `90.${boardCode}`(BK 代码已由调用方 boardFactory 解析)
 * - 接口不带 ut token;kline 分支 fqt 固定 '1'、附带 smplmt/lmt
 * - 无 startDate/endDate 选项(window mode='full' 全量拉取,不做本地过滤;
 *   不要悄悄给板块加窗口选项)、默认 period '5'、分时固定 ndays=1
 * - 行为简化形态:不带 timestamp/tz/currency 字段
 */
export async function fetchBoardMinuteKline(
  client: RequestClient,
  boardCode: string,
  klineUrl: string,
  trendsUrl: string,
  options: BoardMinuteKlineOptions = {}
): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]> {
  const providerKey = `${klineUrl}|${trendsUrl}`;
  let provider = boardMinuteProviders.get(providerKey);
  if (!provider) {
    provider = createMinuteKlineProvider<
      IndustryBoardMinuteTimeline,
      IndustryBoardMinuteKline
    >({
      trendsUrl,
      klineUrl,
      resolveTarget: (code) => ({ secid: `90.${code}`, code }),
      defaultPeriod: '5',
      ndays: { fixed: '1' },
      fqt: { fixed: '1' },
      includeUt: false,
      window: { mode: 'full', beg: '0', end: '20500101' },
      extraKlineParams: { smplmt: '10000', lmt: '1000000' },
      // 板块 trends 最后一列语义为最新价 → 由通用的 avgPrice 槽位改名 price
      mapTrendRow: ({ avgPrice, ...rest }) => ({ ...rest, price: avgPrice }),
      mapKlineRow: (item) => ({
        time: item.date,
        open: item.open,
        close: item.close,
        high: item.high,
        low: item.low,
        changePercent: item.changePercent,
        change: item.change,
        volume: item.volume,
        amount: item.amount,
        amplitude: item.amplitude,
        turnoverRate: item.turnoverRate,
      }),
    });
    boardMinuteProviders.set(providerKey, provider);
  }
  return provider(client, boardCode, options);
}
