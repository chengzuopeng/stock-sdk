/**
 * 东方财富 - 概念板块
 */
import {
  RequestClient,
  EM_CONCEPT_LIST_URL,
  EM_CONCEPT_SPOT_URL,
  EM_CONCEPT_CONS_URL,
  EM_CONCEPT_KLINE_URL,
  EM_CONCEPT_TRENDS_URL,
} from '../../core';
import {
  BoardKlineOptions,
  BoardMinuteKlineOptions,
  BoardTypeConfig,
} from './boardCommon';
import { createBoardProvider } from './boardFactory';
import type {
  ConceptBoard,
  ConceptBoardSpot,
  ConceptBoardConstituent,
  ConceptBoardKline,
  ConceptBoardMinuteTimeline,
  ConceptBoardMinuteKline,
} from '../../types';

// 概念板块配置
const CONCEPT_CONFIG: BoardTypeConfig = {
  type: 'concept',
  fsFilter: 'm:90 t:3 f:!50',
  listUrl: EM_CONCEPT_LIST_URL,
  spotUrl: EM_CONCEPT_SPOT_URL,
  consUrl: EM_CONCEPT_CONS_URL,
  klineUrl: EM_CONCEPT_KLINE_URL,
  trendsUrl: EM_CONCEPT_TRENDS_URL,
  errorPrefix: '未找到概念板块',
};

const conceptProvider = createBoardProvider<
  ConceptBoard,
  ConceptBoardSpot,
  ConceptBoardConstituent,
  ConceptBoardKline,
  ConceptBoardMinuteTimeline,
  ConceptBoardMinuteKline
>(CONCEPT_CONFIG);

// 导出选项类型
export type ConceptBoardKlineOptions = BoardKlineOptions;
export type ConceptBoardMinuteKlineOptions = BoardMinuteKlineOptions;

/**
 * 获取东方财富概念板块名称列表
 */
export async function getConceptList(client: RequestClient): Promise<ConceptBoard[]> {
  return conceptProvider.getList(client);
}

/**
 * 获取东方财富概念板块实时行情
 */
export async function getConceptSpot(client: RequestClient, symbol: string): Promise<ConceptBoardSpot[]> {
  return conceptProvider.getSpot(client, symbol);
}

/**
 * 获取东方财富概念板块成分股
 */
export async function getConceptConstituents(client: RequestClient, symbol: string): Promise<ConceptBoardConstituent[]> {
  return conceptProvider.getConstituents(client, symbol);
}

/**
 * 获取东方财富概念板块历史 K 线
 */
export async function getConceptKline(
  client: RequestClient,
  symbol: string,
  options: ConceptBoardKlineOptions = {}
): Promise<ConceptBoardKline[]> {
  return conceptProvider.getKline(client, symbol, options);
}

/**
 * 获取东方财富概念板块分时行情
 */
export async function getConceptMinuteKline(
  client: RequestClient,
  symbol: string,
  options: ConceptBoardMinuteKlineOptions = {}
): Promise<ConceptBoardMinuteTimeline[] | ConceptBoardMinuteKline[]> {
  return conceptProvider.getMinuteKline(client, symbol, options);
}
