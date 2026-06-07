/**
 * MCP 工具：沪深港通 / 北向资金（分时 / 汇总 / 持股排行 / 历史 / 个股持仓）。
 * 方向参数 direction 为可选位置参数，按 sdk.northbound.<method> 签名顺序传递。
 */
import type {
  NorthboundDirection,
  NorthboundMarket,
  NorthboundRankPeriod,
} from '../../types';
import type { ToolDef } from '../types';
import { obj, symbolField } from './schema';

/** 资金方向枚举 */
const NORTHBOUND_DIRECTION = ['north', 'south'] as const;
/** 北向持股市场枚举 */
const NORTHBOUND_MARKET = ['all', 'shanghai', 'shenzhen'] as const;
/** 北向持股排行查询周期枚举 */
const NORTHBOUND_RANK_PERIOD = [
  'today',
  '3day',
  '5day',
  '10day',
  'month',
  'quarter',
  'year',
] as const;

export const northboundTools: ToolDef[] = [
  {
    name: 'get_northbound_minute',
    tier: 'full',
    description:
      "获取北向 / 南向资金分时数据（当日，按 HH:MM）。返回沪/深分项与合计净流入（单位:万元）。direction:north=北向(默认) / south=南向。",
    inputSchema: obj({
      direction: {
        type: 'string',
        enum: NORTHBOUND_DIRECTION,
        default: 'north',
        description: '资金方向:north=北向(默认) / south=南向',
      },
    }),
    invoke: (sdk, a) =>
      sdk.northbound.minute(a.direction as NorthboundDirection | undefined),
  },
  {
    name: 'get_northbound_flow_summary',
    tier: 'core',
    description:
      '获取沪深港通市场资金流向汇总（北向 + 南向 + 港股通拆分）：含板块名、净买额/净流入(元)、当日余额、相关指数涨跌幅等。',
    inputSchema: obj({}),
    invoke: (sdk) => sdk.northbound.summary(),
  },
  {
    name: 'get_northbound_holding_rank',
    tier: 'full',
    description:
      "获取北向 / 沪股通 / 深股通持股个股排行：含持股股数、持股市值(元)、占流通股/总股本比(%)、区间增持估计等。market:all(默认)/shanghai/shenzhen;period 默认 5day;date 须为有数据的交易日，否则返回空。",
    inputSchema: obj({
      market: {
        type: 'string',
        enum: NORTHBOUND_MARKET,
        default: 'all',
        description: '市场:all(默认) / shanghai=沪股通 / shenzhen=深股通',
      },
      period: {
        type: 'string',
        enum: NORTHBOUND_RANK_PERIOD,
        default: '5day',
        description: '排名周期:today / 3day / 5day(默认) / 10day / month / quarter / year',
      },
      date: { type: 'string', description: '指定交易日 YYYY-MM-DD（默认服务端最新交易日）' },
    }),
    invoke: (sdk, a) =>
      sdk.northbound.holdingRank({
        market: a.market as NorthboundMarket | undefined,
        period: a.period as NorthboundRankPeriod | undefined,
        date: a.date as string | undefined,
      }),
  },
  {
    name: 'get_northbound_history',
    tier: 'full',
    description:
      "获取北向 / 南向资金历史（按日）：成交净买额、买/卖成交额、历史累计净买额、当日资金流入/余额(元)及领涨股。direction:north(默认)/south;不传 startDate/endDate 取全量区间。",
    inputSchema: obj({
      direction: {
        type: 'string',
        enum: NORTHBOUND_DIRECTION,
        default: 'north',
        description: '资金方向:north=北向(默认) / south=南向',
      },
      startDate: { type: 'string', description: '起始日期 YYYY-MM-DD' },
      endDate: { type: 'string', description: '结束日期 YYYY-MM-DD' },
    }),
    invoke: (sdk, a) =>
      sdk.northbound.history(a.direction as NorthboundDirection | undefined, {
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
      }),
  },
  {
    name: 'get_northbound_individual',
    tier: 'full',
    description:
      '获取个股的北向持仓历史（按日）：持股数量、持股市值(元)、占流通股/总股本比(%)、当日收盘价与涨跌幅。不传 startDate/endDate 取全量区间。',
    inputSchema: obj(
      {
        symbol: symbolField('单只股票代码，如 600519 / sh600519'),
        startDate: { type: 'string', description: '起始日期 YYYY-MM-DD' },
        endDate: { type: 'string', description: '结束日期 YYYY-MM-DD' },
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.northbound.individual(a.symbol as string, {
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
      }),
  },
];
