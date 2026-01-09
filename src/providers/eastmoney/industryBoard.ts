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
} from '../../core';
import {
  BoardTypeConfig,
  BoardKlineOptions,
  BoardMinuteKlineOptions,
  createBoardCodeCache,
  fetchBoardList,
  fetchBoardSpot,
  fetchBoardConstituents,
  fetchBoardKline,
  fetchBoardMinuteKline,
} from './boardCommon';
import type {
  IndustryBoard,
  IndustryBoardSpot,
  IndustryBoardConstituent,
  IndustryBoardKline,
  IndustryBoardMinuteTimeline,
  IndustryBoardMinuteKline,
} from '../../types';

// 行业板块配置
const INDUSTRY_CONFIG: BoardTypeConfig = {
  type: 'industry',
  fsFilter: 'm:90 t:2 f:!50',
  listUrl: EM_BOARD_LIST_URL,
  spotUrl: EM_BOARD_SPOT_URL,
  consUrl: EM_BOARD_CONS_URL,
  klineUrl: EM_BOARD_KLINE_URL,
  trendsUrl: EM_BOARD_TRENDS_URL,
  errorPrefix: '未找到行业板块',
};

// 板块代码缓存
const codeCache = createBoardCodeCache(INDUSTRY_CONFIG);

async function getBoardCode(client: RequestClient, symbol: string): Promise<string> {
  return codeCache.getCode(client, symbol, getIndustryList);
}

// 导出选项类型
export type IndustryBoardKlineOptions = BoardKlineOptions;
export type IndustryBoardMinuteKlineOptions = BoardMinuteKlineOptions;

/**
 * 获取东方财富行业板块名称列表
 */
export async function getIndustryList(client: RequestClient): Promise<IndustryBoard[]> {
  return fetchBoardList(client, INDUSTRY_CONFIG);
}

/**
 * 获取东方财富行业板块实时行情
 */
export async function getIndustrySpot(client: RequestClient, symbol: string): Promise<IndustryBoardSpot[]> {
  const boardCode = await getBoardCode(client, symbol);
  return fetchBoardSpot(client, boardCode, INDUSTRY_CONFIG.spotUrl);
}

/**
 * 获取东方财富行业板块成分股
 */
export async function getIndustryConstituents(client: RequestClient, symbol: string): Promise<IndustryBoardConstituent[]> {
  const boardCode = await getBoardCode(client, symbol);
  return fetchBoardConstituents(client, boardCode, INDUSTRY_CONFIG.consUrl);
}

/**
 * 获取东方财富行业板块历史 K 线
 */
export async function getIndustryKline(
  client: RequestClient,
  symbol: string,
  options: IndustryBoardKlineOptions = {}
): Promise<IndustryBoardKline[]> {
  const boardCode = await getBoardCode(client, symbol);
  return fetchBoardKline(client, boardCode, INDUSTRY_CONFIG.klineUrl, options);
}

/**
 * 获取东方财富行业板块分时行情
 */
export async function getIndustryMinuteKline(
  client: RequestClient,
  symbol: string,
  options: IndustryBoardMinuteKlineOptions = {}
): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]> {
  const boardCode = await getBoardCode(client, symbol);
  return fetchBoardMinuteKline(client, boardCode, INDUSTRY_CONFIG.klineUrl, INDUSTRY_CONFIG.trendsUrl, options);
}
