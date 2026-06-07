/**
 * MCP 工具：交易日历 / 市场状态。
 * 交易日判断与跳转基于 A 股上游日历（港股 / 美股退化为"周一-周五 + 已知交易时段"近似）。
 */
// SupportedMarket 仅从 './sdk/index' 透出：`../../sdk` 解析到 sdk.ts 文件（文件优先于目录），
// 该文件并未 re-export 此类型，故显式指向 `../../sdk/index`（与顶层 src/index.ts 同源）。
import type { SupportedMarket } from '../../sdk/index';
import type { ToolDef } from '../types';
import { obj, symbolField } from './schema';

const SUPPORTED_MARKET = ['A', 'HK', 'US'] as const;

export const calendarTools: ToolDef[] = [
  {
    name: 'is_trading_day',
    tier: 'core',
    description:
      '判断某天是否为 A 股交易日（基于上游官方日历，能识别法定假日）。date 可选，支持 YYYY-MM-DD 或 YYYYMMDD；不传则判断今天。返回 boolean。',
    inputSchema: obj({
      date: symbolField('日期 YYYY-MM-DD 或 YYYYMMDD；不传为今天'),
    }),
    invoke: (sdk, a) => sdk.calendar.isTradingDay(a.date as string | undefined),
  },
  {
    name: 'next_trading_day',
    tier: 'full',
    description:
      '返回给定日期之后最近的一个 A 股交易日（YYYY-MM-DD）。date 可选，支持 YYYY-MM-DD 或 YYYYMMDD；不传则以今天为基准。',
    inputSchema: obj({
      date: symbolField('基准日期 YYYY-MM-DD 或 YYYYMMDD；不传为今天'),
    }),
    invoke: (sdk, a) => sdk.calendar.nextTradingDay(a.date as string | undefined),
  },
  {
    name: 'prev_trading_day',
    tier: 'full',
    description:
      '返回给定日期之前最近的一个 A 股交易日（YYYY-MM-DD）。date 可选，支持 YYYY-MM-DD 或 YYYYMMDD；不传则以今天为基准。',
    inputSchema: obj({
      date: symbolField('基准日期 YYYY-MM-DD 或 YYYYMMDD；不传为今天'),
    }),
    invoke: (sdk, a) => sdk.calendar.prevTradingDay(a.date as string | undefined),
  },
  {
    name: 'get_market_status',
    tier: 'core',
    description:
      "获取市场当前实时状态：pre_market(盘前) / open(交易中) / lunch_break(午休) / after_hours(盘后) / closed(休市)。market 可选枚举 A/HK/US，默认 A。⚠️ 同步本地时钟判断、不发请求：A 股基于交易时段但不识别法定假日，港股/美股退化为'周一-周五 + 已知交易时段'近似。",
    inputSchema: obj({
      market: {
        type: 'string',
        enum: SUPPORTED_MARKET,
        default: 'A',
        description: '市场：A=A股 / HK=港股 / US=美股，默认 A',
      },
    }),
    // marketStatus 为同步方法，直接 return 调用结果（ToolDef.invoke 允许返回 unknown）
    invoke: (sdk, a) => sdk.calendar.marketStatus(a.market as SupportedMarket | undefined),
  },
];
