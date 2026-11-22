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
  BoardKlineOptions,
  BoardMinuteKlineOptions,
  BoardTypeConfig,
} from './boardCommon';
import { createBoardProvider } from './boardFactory';
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

const industryProvider = createBoardProvider<
  IndustryBoard,
  IndustryBoardSpot,
  IndustryBoardConstituent,
  IndustryBoardKline,
  IndustryBoardMinuteTimeline,
  IndustryBoardMinuteKline
>(INDUSTRY_CONFIG);

// 导出选项类型
export type IndustryBoardKlineOptions = BoardKlineOptions;
export type IndustryBoardMinuteKlineOptions = BoardMinuteKlineOptions;

/**
 * 获取东方财富行业板块名称列表
 */
export async function getIndustryList(client: RequestClient): Promise<IndustryBoard[]> {
  return industryProvider.getList(client);
}

/**
 * 获取东方财富行业板块实时行情
 */
export async function getIndustrySpot(client: RequestClient, symbol: string): Promise<IndustryBoardSpot[]> {
  return industryProvider.getSpot(client, symbol);
}

/**
 * 获取东方财富行业板块成分股
 */
export async function getIndustryConstituents(client: RequestClient, symbol: string): Promise<IndustryBoardConstituent[]> {
  return industryProvider.getConstituents(client, symbol);
}

/**
 * 获取东方财富行业板块历史 K 线
 */
export async function getIndustryKline(
  client: RequestClient,
  symbol: string,
  options: IndustryBoardKlineOptions = {}
): Promise<IndustryBoardKline[]> {
  return industryProvider.getKline(client, symbol, options);
}

/**
 * 获取东方财富行业板块分时行情
 */
export async function getIndustryMinuteKline(
  client: RequestClient,
  symbol: string,
  options: IndustryBoardMinuteKlineOptions = {}
): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]> {
  return industryProvider.getMinuteKline(client, symbol, options);
}
