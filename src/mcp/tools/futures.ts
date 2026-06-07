/**
 * MCP 工具：期货 / 全球期货 / 库存数据。
 * 国内期货 K 线、全球期货实时行情与 K 线、交易所库存、COMEX 金银库存。
 */
import type { ToolDef } from '../types';
import { obj, symbolField, periodHistory, startDateYmd, endDateYmd } from './schema';

/** COMEX 库存品种（gold=黄金 / silver=白银） */
const COMEX_SYMBOL = ['gold', 'silver'] as const;

export const futuresTools: ToolDef[] = [
  {
    name: 'get_futures_kline',
    tier: 'core',
    description:
      '获取国内期货历史 K 线（东财）：开高低收、成交量、持仓量等。' +
      'symbol 为合约代码，如 rb2605(螺纹钢) / IF2604(沪深300股指) / au2606(黄金)，' +
      'period 默认 daily(日线)，startDate/endDate 为 YYYYMMDD。',
    inputSchema: obj(
      {
        symbol: symbolField('期货合约代码，如 rb2605 / IF2604 / au2606'),
        period: periodHistory,
        startDate: startDateYmd,
        endDate: endDateYmd,
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.futures.kline(a.symbol as string, {
        period: a.period as 'daily' | 'weekly' | 'monthly' | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
      }),
  },
  {
    name: 'get_global_futures_spot',
    tier: 'full',
    description:
      '获取全球期货实时行情（东财）：国际原油、黄金、外盘指数期货等的最新价、涨跌幅、成交量。' +
      'pageSize 为每页条数，默认 20。',
    inputSchema: obj({
      pageSize: { type: 'integer', description: '每页条数，默认 20' },
    }),
    invoke: (sdk, a) =>
      sdk.futures.globalSpot({
        pageSize: a.pageSize as number | undefined,
      }),
  },
  {
    name: 'get_global_futures_kline',
    tier: 'full',
    description:
      '获取全球期货历史 K 线（东财）：开高低收、成交量等。' +
      'symbol 为合约代码，period 默认 daily，startDate/endDate 为 YYYYMMDD。' +
      'marketCode 为东财市场代码（用于未内置品种，可从全球期货实时行情结果反查）。',
    inputSchema: obj(
      {
        symbol: symbolField('全球期货合约代码，如 CONC(WTI 原油) / GC00Y(COMEX 黄金)'),
        period: periodHistory,
        startDate: startDateYmd,
        endDate: endDateYmd,
        marketCode: { type: 'integer', description: '东财市场代码（未内置品种时手动指定）' },
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.futures.globalKline(a.symbol as string, {
        period: a.period as 'daily' | 'weekly' | 'monthly' | undefined,
        startDate: a.startDate as string | undefined,
        endDate: a.endDate as string | undefined,
        marketCode: a.marketCode as number | undefined,
      }),
  },
  {
    name: 'get_futures_inventory_symbols',
    tier: 'full',
    description: '获取期货库存品种列表（东财）：可查库存的品种代码与名称，供 get_futures_inventory 使用。',
    inputSchema: obj({}),
    invoke: (sdk) => sdk.futures.inventorySymbols(),
  },
  {
    name: 'get_futures_inventory',
    tier: 'full',
    description:
      '获取指定品种的期货库存历史（东财）：交易所注册仓单 / 库存量及增减。' +
      'symbol 为品种代码（见 get_futures_inventory_symbols），' +
      'startDate 为 YYYY-MM-DD(默认 2020-10-28)。' +
      'pageSize 仅为单页批量大小（默认 500），接口返回全量历史，过大时会被裁剪。',
    inputSchema: obj(
      {
        symbol: symbolField('库存品种代码（见 get_futures_inventory_symbols）'),
        startDate: { type: 'string', description: '开始日期 YYYY-MM-DD，默认 2020-10-28' },
        pageSize: {
          type: 'integer',
          description: '单页批量大小，默认 500；接口返回全量历史，过大时会被裁剪',
        },
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.futures.inventory(a.symbol as string, {
        startDate: a.startDate as string | undefined,
        pageSize: a.pageSize as number | undefined,
      }),
  },
  {
    name: 'get_comex_inventory',
    tier: 'full',
    description:
      '获取 COMEX 黄金 / 白银库存历史（东财）：注册库存、合格库存及总量变化。' +
      "symbol 必填，取 'gold'(黄金) 或 'silver'(白银)。" +
      'pageSize 仅为单页批量大小（默认 500），接口返回全量历史，过大时会被裁剪。',
    inputSchema: obj(
      {
        symbol: { type: 'string', enum: COMEX_SYMBOL, description: "品种：gold=黄金 / silver=白银" },
        pageSize: {
          type: 'integer',
          description: '单页批量大小，默认 500；接口返回全量历史，过大时会被裁剪',
        },
      },
      ['symbol']
    ),
    invoke: (sdk, a) =>
      sdk.futures.comexInventory(a.symbol as 'gold' | 'silver', {
        pageSize: a.pageSize as number | undefined,
      }),
  },
];