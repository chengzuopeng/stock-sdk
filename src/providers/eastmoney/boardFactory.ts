/**
 * 东方财富板块 provider 工厂
 */
import { RequestClient } from '../../core';
import {
  BoardKlineOptions,
  BoardMinuteKlineOptions,
  BoardTypeConfig,
  createBoardCodeCache,
  fetchBoardConstituents,
  fetchBoardKline,
  fetchBoardList,
  fetchBoardMinuteKline,
  fetchBoardSpot,
} from './boardCommon';

/**
 * 通用板块 provider 返回值
 */
interface BoardProvider<
  TBoard,
  TSpot,
  TConstituent,
  TKline,
  TMinuteTimeline,
  TMinuteKline
> {
  getList: (client: RequestClient) => Promise<TBoard[]>;
  getSpot: (client: RequestClient, symbol: string) => Promise<TSpot[]>;
  getConstituents: (
    client: RequestClient,
    symbol: string
  ) => Promise<TConstituent[]>;
  getKline: (
    client: RequestClient,
    symbol: string,
    options?: BoardKlineOptions
  ) => Promise<TKline[]>;
  getMinuteKline: (
    client: RequestClient,
    symbol: string,
    options?: BoardMinuteKlineOptions
  ) => Promise<TMinuteTimeline[] | TMinuteKline[]>;
}

/**
 * 创建行业板块 / 概念板块 provider。
 */
export function createBoardProvider<
  TBoard,
  TSpot,
  TConstituent,
  TKline,
  TMinuteTimeline,
  TMinuteKline
>(
  config: BoardTypeConfig
): BoardProvider<
  TBoard,
  TSpot,
  TConstituent,
  TKline,
  TMinuteTimeline,
  TMinuteKline
> {
  const codeCache = createBoardCodeCache(config);

  async function getList(client: RequestClient): Promise<TBoard[]> {
    return fetchBoardList(client, config) as Promise<TBoard[]>;
  }

  async function getBoardCode(
    client: RequestClient,
    symbol: string
  ): Promise<string> {
    return codeCache.getCode(
      client,
      symbol,
      getList as unknown as (client: RequestClient) => Promise<{
        name: string;
        code: string;
      }[]>
    );
  }

  return {
    async getList(client: RequestClient): Promise<TBoard[]> {
      return getList(client);
    },

    async getSpot(client: RequestClient, symbol: string): Promise<TSpot[]> {
      const boardCode = await getBoardCode(client, symbol);
      return fetchBoardSpot(client, boardCode, config.spotUrl) as Promise<TSpot[]>;
    },

    async getConstituents(
      client: RequestClient,
      symbol: string
    ): Promise<TConstituent[]> {
      const boardCode = await getBoardCode(client, symbol);
      return fetchBoardConstituents(
        client,
        boardCode,
        config.consUrl
      ) as Promise<TConstituent[]>;
    },

    async getKline(
      client: RequestClient,
      symbol: string,
      options: BoardKlineOptions = {}
    ): Promise<TKline[]> {
      const boardCode = await getBoardCode(client, symbol);
      return fetchBoardKline(
        client,
        boardCode,
        config.klineUrl,
        options
      ) as Promise<TKline[]>;
    },

    async getMinuteKline(
      client: RequestClient,
      symbol: string,
      options: BoardMinuteKlineOptions = {}
    ): Promise<TMinuteTimeline[] | TMinuteKline[]> {
      const boardCode = await getBoardCode(client, symbol);
      return fetchBoardMinuteKline(
        client,
        boardCode,
        config.klineUrl,
        config.trendsUrl,
        options
      ) as Promise<TMinuteTimeline[] | TMinuteKline[]>;
    },
  };
}
