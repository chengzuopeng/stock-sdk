/**
 * MCP 工具：实时行情 / 搜索 / 代码列表 / 批量行情。
 * 本文件同时作为各参数形态的范例：codes 数组 / 单 symbol / options 对象 / 无参 / 枚举。
 */
import type { AShareMarket, USMarket } from '../../sdk';
import type { ToolDef } from '../types';
import { codesField, symbolField, obj } from './schema';

const A_SHARE_MARKET = ['sh', 'sz', 'bj', 'kc', 'cy'] as const;
const US_MARKET = ['NASDAQ', 'NYSE', 'AMEX'] as const;

export const quotesTools: ToolDef[] = [
  {
    name: 'get_a_share_quotes',
    tier: 'core',
    description: '获取 A 股 / 指数全量行情（腾讯）：最新价、涨跌幅、五档盘口、市值、PE/PB 等。',
    inputSchema: obj({ codes: codesField }, ['codes']),
    invoke: (sdk, a) => sdk.quotes.cn(a.codes as string[]),
  },
  {
    name: 'get_a_share_simple_quotes',
    tier: 'full',
    description: '获取 A 股 / 指数简要行情（价格、涨跌幅、成交量额）。',
    inputSchema: obj({ codes: codesField }, ['codes']),
    invoke: (sdk, a) => sdk.quotes.cnSimple(a.codes as string[]),
  },
  {
    name: 'get_hk_quotes',
    tier: 'core',
    description: '获取港股行情。代码 5 位数字，带不带 hk 前缀均可（如 00700 / hk00700）。',
    inputSchema: obj({ codes: codesField }, ['codes']),
    invoke: (sdk, a) => sdk.quotes.hk(a.codes as string[]),
  },
  {
    name: 'get_us_quotes',
    tier: 'core',
    description: '获取美股行情。代码如 AAPL / BABA。',
    inputSchema: obj({ codes: codesField }, ['codes']),
    invoke: (sdk, a) => sdk.quotes.us(a.codes as string[]),
  },
  {
    name: 'get_fund_quotes',
    tier: 'core',
    description: '获取公募基金行情（场内 / 场外，净值类）。',
    inputSchema: obj({ codes: codesField }, ['codes']),
    invoke: (sdk, a) => sdk.quotes.fund(a.codes as string[]),
  },
  {
    name: 'get_fund_flow',
    tier: 'full',
    description: '获取资金流向（简版，按代码批量）。',
    inputSchema: obj({ codes: codesField }, ['codes']),
    invoke: (sdk, a) => sdk.quotes.fundFlow(a.codes as string[]),
  },
  {
    name: 'get_panel_large_order',
    tier: 'full',
    description: '获取盘口大单占比。',
    inputSchema: obj({ codes: codesField }, ['codes']),
    invoke: (sdk, a) => sdk.quotes.largeOrder(a.codes as string[]),
  },
  {
    name: 'get_today_timeline',
    tier: 'core',
    description: '获取 A 股当日分时走势（单只）。',
    inputSchema: obj({ code: symbolField('单只股票代码，如 600519 / sh600519') }, ['code']),
    invoke: (sdk, a) => sdk.quotes.timeline(a.code as string),
  },
];

export const searchTools: ToolDef[] = [
  {
    name: 'search',
    tier: 'core',
    description: '模糊搜索股票 / 指数 / 基金（代码 / 名称 / 拼音）。返回 code、name、market、category。',
    inputSchema: obj({ keyword: { type: 'string', description: '搜索关键词' } }, ['keyword']),
    invoke: (sdk, a) => sdk.search(a.keyword as string),
  },
];

export const codesTools: ToolDef[] = [
  {
    name: 'get_a_share_code_list',
    tier: 'full',
    description: '获取 A 股全量代码列表（可按市场筛选 / 去交易所前缀）。',
    inputSchema: obj({
      simple: { type: 'boolean', description: '去掉交易所前缀' },
      market: { type: 'string', enum: A_SHARE_MARKET, description: '按板块筛选' },
    }),
    invoke: (sdk, a) =>
      sdk.codes.cn({
        simple: a.simple as boolean | undefined,
        market: a.market as AShareMarket | undefined,
      }),
  },
  {
    name: 'get_us_code_list',
    tier: 'full',
    description: '获取美股全量代码列表。',
    inputSchema: obj({
      simple: { type: 'boolean', description: '去掉市场前缀' },
      market: { type: 'string', enum: US_MARKET },
    }),
    invoke: (sdk, a) =>
      sdk.codes.us({
        simple: a.simple as boolean | undefined,
        market: a.market as USMarket | undefined,
      }),
  },
  {
    name: 'get_hk_code_list',
    tier: 'full',
    description: '获取港股全量代码列表。',
    inputSchema: obj({}),
    invoke: (sdk) => sdk.codes.hk(),
  },
  {
    name: 'get_fund_code_list',
    tier: 'full',
    description: '获取基金全量代码列表。',
    inputSchema: obj({}),
    invoke: (sdk) => sdk.codes.fund(),
  },
];

export const batchTools: ToolDef[] = [
  {
    name: 'get_all_a_share_quotes',
    tier: 'full',
    description: '批量拉取全市场 A 股行情。⚠️ 可能耗时数十秒、返回数千条（结果会被裁剪）。',
    inputSchema: obj({
      market: { type: 'string', enum: A_SHARE_MARKET },
      batchSize: { type: 'integer', description: '单批代码数，默认 500' },
      concurrency: { type: 'integer', description: '并发数，默认 7' },
    }),
    invoke: (sdk, a) =>
      sdk.batch.cn({
        market: a.market as AShareMarket | undefined,
        batchSize: a.batchSize as number | undefined,
        concurrency: a.concurrency as number | undefined,
      }),
  },
  {
    name: 'get_all_hk_quotes',
    tier: 'full',
    description: '批量拉取全市场港股行情。⚠️ 耗时。',
    inputSchema: obj({
      batchSize: { type: 'integer' },
      concurrency: { type: 'integer' },
    }),
    invoke: (sdk, a) =>
      sdk.batch.hk({
        batchSize: a.batchSize as number | undefined,
        concurrency: a.concurrency as number | undefined,
      }),
  },
  {
    name: 'get_all_us_quotes',
    tier: 'full',
    description: '批量拉取全市场美股行情。⚠️ 耗时。',
    inputSchema: obj({
      market: { type: 'string', enum: US_MARKET },
      batchSize: { type: 'integer' },
      concurrency: { type: 'integer' },
    }),
    invoke: (sdk, a) =>
      sdk.batch.us({
        market: a.market as USMarket | undefined,
        batchSize: a.batchSize as number | undefined,
        concurrency: a.concurrency as number | undefined,
      }),
  },
  {
    name: 'get_quotes_by_codes',
    tier: 'full',
    description: '按代码列表批量拉取完整行情。',
    inputSchema: obj(
      {
        codes: codesField,
        batchSize: { type: 'integer' },
        concurrency: { type: 'integer' },
      },
      ['codes']
    ),
    invoke: (sdk, a) =>
      sdk.batch.byCodes(a.codes as string[], {
        batchSize: a.batchSize as number | undefined,
        concurrency: a.concurrency as number | undefined,
      }),
  },
];
