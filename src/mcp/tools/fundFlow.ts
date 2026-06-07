/**
 * MCP 工具：资金流向（东方财富）。
 * 个股 / 大盘 / 个股排名 / 板块排名 / 板块历史。
 */
import type { ToolDef } from '../types';
import { obj, periodHistory, symbolField } from './schema';

/** 个股 / 板块资金流排名周期 */
const FUND_FLOW_RANK_INDICATOR = ['today', '3day', '5day', '10day'] as const;
/** 板块类型 */
const SECTOR_TYPE = ['industry', 'concept', 'region'] as const;

export const fundFlowTools: ToolDef[] = [
  {
    name: 'get_individual_fund_flow',
    tier: 'core',
    description:
      '获取个股资金流历史（日 / 周 / 月）：主力 / 超大单 / 大单 / 中单 / 小单净流入（金额单位元、占比为百分比）。',
    inputSchema: obj(
      {
        symbol: symbolField('股票代码，带不带 sh/sz/bj 前缀均可，如 600519 / sh600519'),
        period: periodHistory,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.fundFlow.individual(a.symbol as string, {
        period: a.period as 'daily' | 'weekly' | 'monthly' | undefined,
      }),
  },
  {
    name: 'get_market_fund_flow',
    tier: 'full',
    description: '获取大盘资金流（上证综指 + 深证成指(399001)）：各分类资金净流入金额（元）与占比（%）。',
    inputSchema: obj({}),
    invoke: (sdk) => sdk.fundFlow.market(),
  },
  {
    name: 'get_fund_flow_rank',
    tier: 'core',
    description:
      '获取个股资金流排名（沪深北 A 股全市场）：按主力净流入排序，金额单位元、占比为百分比。⚠️ 返回全市场数千条，结果裁剪至前 200（按主力净流入降序），完整数据请直接用 SDK。',
    inputSchema: obj({
      indicator: {
        type: 'string',
        enum: FUND_FLOW_RANK_INDICATOR,
        default: 'today',
        description: '排名周期：today=今日(默认) / 3day / 5day / 10day',
      },
    }),
    invoke: (sdk, a) =>
      sdk.fundFlow.rank({
        indicator: a.indicator as 'today' | '3day' | '5day' | '10day' | undefined,
      }),
  },
  {
    name: 'get_sector_fund_flow_rank',
    tier: 'full',
    description:
      '获取板块资金流排名（行业 / 概念 / 地域）：按板块主力净流入排序，金额单位元、占比为百分比。',
    inputSchema: obj({
      indicator: {
        type: 'string',
        enum: FUND_FLOW_RANK_INDICATOR,
        default: 'today',
        description: '排名周期：today=今日(默认) / 3day / 5day / 10day',
      },
      sectorType: {
        type: 'string',
        enum: SECTOR_TYPE,
        default: 'industry',
        description: '板块类型：industry=行业(默认) / concept=概念 / region=地域',
      },
    }),
    invoke: (sdk, a) =>
      sdk.fundFlow.sectorRank({
        indicator: a.indicator as 'today' | '3day' | '5day' | '10day' | undefined,
        sectorType: a.sectorType as 'industry' | 'concept' | 'region' | undefined,
      }),
  },
  {
    name: 'get_sector_fund_flow_history',
    tier: 'full',
    description:
      '获取单个板块的历史资金流（日 / 周 / 月）：各分类资金净流入金额（元）与占比（%）。symbol 为板块编号，如 BK0438 或全前缀 90.BK0438。',
    inputSchema: obj(
      {
        symbol: symbolField('板块编号，如 BK0438 或全前缀 90.BK0438'),
        period: periodHistory,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.fundFlow.sectorHistory(a.symbol as string, {
        period: a.period as 'daily' | 'weekly' | 'monthly' | undefined,
      }),
  },
];
