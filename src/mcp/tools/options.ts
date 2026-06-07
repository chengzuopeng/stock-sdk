/**
 * MCP 工具：期权（中金所股指期权 / ETF 期权 / 商品期权 / 中金所列表 / 期权龙虎榜）。
 * 二级命名空间 sdk.options.{index,etf,commodity,cffex} + 顶层 sdk.options.lhb。
 */
import type { IndexOptionProduct, ETFOptionCate } from '../../types';
import type { ToolDef } from '../types';
import { symbolField, obj } from './schema';

/** 中金所股指期权产品（src/types/options.ts: IndexOptionProduct） */
const INDEX_OPTION_PRODUCT = ['ho', 'io', 'mo'] as const;

/** ETF 期权品种（src/types/options.ts: ETFOptionCate） */
const ETF_OPTION_CATE = ['50ETF', '300ETF', '500ETF', '科创50', '科创板50'] as const;

export const optionsTools: ToolDef[] = [
  {
    name: 'get_index_option_spot',
    tier: 'full',
    description:
      '获取中金所股指期权 T 型实时报价（认购/认沽分列）。product=产品代码(ho/io/mo)；contract=合约月份。',
    inputSchema: obj(
      {
        product: {
          type: 'string',
          enum: INDEX_OPTION_PRODUCT,
          description: '产品代码：ho / io / mo',
        },
        contract: symbolField('合约（月份），如 2406'),
      },
      ['product', 'contract']
    ),
    invoke: (sdk, a) =>
      sdk.options.index.spot(a.product as IndexOptionProduct, a.contract as string),
  },
  {
    name: 'get_index_option_kline',
    tier: 'full',
    description: '获取中金所股指期权某合约的日 K 线。',
    inputSchema: obj({ symbol: symbolField('期权合约代码') }, ['symbol']),
    invoke: (sdk, a) => sdk.options.index.kline(a.symbol as string),
  },
  {
    name: 'get_etf_option_months',
    tier: 'full',
    description: '获取 ETF 期权可交易月份列表（含标的/品种信息）。cate=期权品种。',
    inputSchema: obj(
      {
        cate: {
          type: 'string',
          enum: ETF_OPTION_CATE,
          description: '期权品种：50ETF / 300ETF / 500ETF / 科创50 / 科创板50',
        },
      },
      ['cate']
    ),
    invoke: (sdk, a) => sdk.options.etf.months(a.cate as ETFOptionCate),
  },
  {
    name: 'get_etf_option_expire_day',
    tier: 'full',
    description:
      '获取 ETF 期权指定月份的到期日与剩余天数。month 格式 YYYY-MM（如 2024-06），可直接取自 get_etf_option_months 返回的月份。',
    inputSchema: obj(
      {
        cate: {
          type: 'string',
          enum: ETF_OPTION_CATE,
          description: '期权品种：50ETF / 300ETF / 500ETF / 科创50 / 科创板50',
        },
        month: symbolField('月份 YYYY-MM，如 2024-06（可取自 get_etf_option_months 返回的月份）'),
      },
      ['cate', 'month']
    ),
    invoke: (sdk, a) =>
      sdk.options.etf.expireDay(a.cate as ETFOptionCate, a.month as string),
  },
  {
    name: 'get_etf_option_minute',
    tier: 'full',
    description: '获取 ETF 期权某合约的当日分时数据（价格、成交量、持仓量、均价）。',
    inputSchema: obj({ code: symbolField('期权合约代码') }, ['code']),
    invoke: (sdk, a) => sdk.options.etf.minute(a.code as string),
  },
  {
    name: 'get_etf_option_daily_kline',
    tier: 'full',
    description: '获取 ETF 期权某合约的日 K 线。',
    inputSchema: obj({ code: symbolField('期权合约代码') }, ['code']),
    invoke: (sdk, a) => sdk.options.etf.dailyKline(a.code as string),
  },
  {
    name: 'get_etf_option_five_day_minute',
    tier: 'full',
    description: '获取 ETF 期权某合约的近 5 日分时数据。',
    inputSchema: obj({ code: symbolField('期权合约代码') }, ['code']),
    invoke: (sdk, a) => sdk.options.etf.fiveDayMinute(a.code as string),
  },
  {
    name: 'get_commodity_option_spot',
    tier: 'full',
    description:
      '获取商品期权 T 型实时报价（认购/认沽分列）。variety=品种代码（如 cu/m/au）；contract=合约月份。',
    inputSchema: obj(
      {
        variety: symbolField('品种代码，如 cu / m / au'),
        contract: symbolField('合约（月份），如 2406'),
      },
      ['variety', 'contract']
    ),
    invoke: (sdk, a) =>
      sdk.options.commodity.spot(a.variety as string, a.contract as string),
  },
  {
    name: 'get_commodity_option_kline',
    tier: 'full',
    description: '获取商品期权某合约的日 K 线。',
    inputSchema: obj({ symbol: symbolField('期权合约代码') }, ['symbol']),
    invoke: (sdk, a) => sdk.options.commodity.kline(a.symbol as string),
  },
  {
    name: 'get_cffex_option_quotes',
    tier: 'full',
    description:
      '获取中金所全部期权实时行情列表（价格、涨跌、成交、持仓、行权价、剩余天数等）。⚠️ 体积大：默认 pageSize=20000 返回全市场合约。',
    inputSchema: obj({
      pageSize: { type: 'integer', description: '每页条数，默认 20000' },
    }),
    invoke: (sdk, a) => sdk.options.cffex.quotes({ pageSize: a.pageSize as number | undefined }),
  },
  {
    name: 'get_option_lhb',
    tier: 'full',
    description:
      '获取期权龙虎榜（按标的与日期，含成交量/持仓量排名、会员席位、净买卖等）。date 格式 YYYY-MM-DD。',
    inputSchema: obj(
      {
        symbol: symbolField('期权标的/合约代码'),
        date: symbolField('日期 YYYY-MM-DD，如 2024-06-03'),
      },
      ['symbol', 'date']
    ),
    invoke: (sdk, a) => sdk.options.lhb(a.symbol as string, a.date as string),
  },
];
