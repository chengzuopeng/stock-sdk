/**
 * MCP 工具：龙虎榜（东方财富）。
 * 上榜个股明细 / 个股上榜统计 / 机构买卖 / 营业部排行 / 个股席位明细。
 */
import type { ToolDef } from '../types';
import type { DragonTigerDateOptions, DragonTigerPeriod } from '../../types';
import { obj, symbolField, startDateYmd, endDateYmd } from './schema';

/** 龙虎榜统计周期（DragonTigerPeriod 全量取值） */
const DRAGON_TIGER_PERIOD = ['1month', '3month', '6month', '1year'] as const;

const periodField = {
  type: 'string' as const,
  enum: DRAGON_TIGER_PERIOD,
  default: '1month',
  description: '统计周期：1month / 3month / 6month / 1year，默认 1month',
};

export const dragonTigerTools: ToolDef[] = [
  {
    name: 'get_dragon_tiger_detail',
    tier: 'core',
    description:
      '获取龙虎榜上榜个股明细（按日期范围）：代码、名称、上榜日期、收盘价、涨跌幅(%)、净买额/买入额/卖出额/成交额(元)、占总成交比(%)、换手率(%)、流通市值(元)、上榜原因、上榜后 1/2/5/10 日涨跌幅(%)。日期格式 YYYYMMDD，startDate / endDate 均必填。日期区间过大时结果超 200 条会被裁剪，请收窄区间。',
    inputSchema: obj(
      { startDate: startDateYmd, endDate: endDateYmd },
      ['startDate', 'endDate']
    ),
    invoke: (sdk, a) =>
      sdk.dragonTiger.detail({
        startDate: a.startDate as string,
        endDate: a.endDate as string,
      } satisfies DragonTigerDateOptions),
  },
  {
    name: 'get_dragon_tiger_stock_stats',
    tier: 'full',
    description:
      '获取龙虎榜个股上榜统计（按周期聚合）：代码、名称、最近上榜日、收盘价、涨跌幅(%)、上榜次数、累计买入/卖出/净额/成交额(元)、累计买/卖方机构次数。period 可选，默认 1month。⚠️ 返回全市场，可能数百至上千条，超 200 条会被裁剪。',
    inputSchema: obj({ period: periodField }),
    invoke: (sdk, a) =>
      sdk.dragonTiger.stockStats(a.period as DragonTigerPeriod | undefined),
  },
  {
    name: 'get_dragon_tiger_institution',
    tier: 'full',
    description:
      '获取龙虎榜机构买卖明细（按日期范围）：代码、名称、上榜日期、收盘价、涨跌幅(%)、买/卖方机构数、机构买入额/卖出额/净额(元)。日期格式 YYYYMMDD，startDate / endDate 均必填。日期区间过大时结果超 200 条会被裁剪，请收窄区间。',
    inputSchema: obj(
      { startDate: startDateYmd, endDate: endDateYmd },
      ['startDate', 'endDate']
    ),
    invoke: (sdk, a) =>
      sdk.dragonTiger.institution({
        startDate: a.startDate as string,
        endDate: a.endDate as string,
      } satisfies DragonTigerDateOptions),
  },
  {
    name: 'get_dragon_tiger_branch_rank',
    tier: 'full',
    description:
      '获取龙虎榜营业部（席位）排行（按周期聚合）：营业部代码、名称、买入总额/卖出总额(元)、买入/卖出次数、上榜次数。period 可选，默认 1month。⚠️ 返回全市场，可能数百至上千条，超 200 条会被裁剪。',
    inputSchema: obj({ period: periodField }),
    invoke: (sdk, a) =>
      sdk.dragonTiger.branchRank(a.period as DragonTigerPeriod | undefined),
  },
  {
    name: 'get_dragon_tiger_seat_detail',
    tier: 'full',
    description:
      '获取个股某日龙虎榜席位明细：排名、营业部名称、买入额/卖出额/净额(元)、买入/卖出占总成交比(%)、买卖方向(buy/sell)。symbol 与 date 均必填；date 支持 YYYYMMDD 或 YYYY-MM-DD。',
    inputSchema: obj(
      {
        symbol: symbolField('单只股票代码，如 600519 / sh600519'),
        date: { type: 'string', description: '上榜日期，YYYYMMDD 或 YYYY-MM-DD' },
      },
      ['symbol', 'date']
    ),
    invoke: (sdk, a) =>
      sdk.dragonTiger.seatDetail(a.symbol as string, a.date as string),
  },
];
