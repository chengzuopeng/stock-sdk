/**
 * MCP 工具：参考数据（分红配股明细 / 交易日历原始数组）。
 * 走 sdk.reference 命名空间，底层复用 QuoteService。
 */
import type { ToolDef } from '../types';
import { obj, symbolField } from './schema';

export const referenceTools: ToolDef[] = [
  {
    name: 'get_dividend_detail',
    tier: 'full',
    description:
      '获取 A 股分红配股明细：历年送转、派息（每 10 股派 X 元）、除权除息日、股权登记日等。代码带不带交易所前缀均可（如 600519 / sh600519）。',
    inputSchema: obj({ symbol: symbolField('单只股票代码，如 600519 / sh600519') }, ['symbol']),
    invoke: (sdk, a) => sdk.reference.dividendDetail(a.symbol as string),
  },
  {
    name: 'get_trading_calendar',
    tier: 'full',
    description:
      "获取 A 股交易日历原始数组（升序 'YYYY-MM-DD' 字符串列表，来自腾讯接口，带 12 小时缓存）。⚠️ 体积大：返回数千个交易日。只需判断某日是否交易日 / 取上一或下一交易日时，优先用 calendar 命名空间下的工具，无需拉全量。",
    inputSchema: obj({}),
    invoke: (sdk) => sdk.reference.tradingCalendar(),
  },
];
