/**
 * MCP 工具：市场异动 —— 涨停股池 / 盘口异动 / 板块异动。
 * 参数形态：位置可选 enum + 位置可选日期（ztPool）、单个位置可选 enum（stockChanges）、无参（boardChanges）。
 */
import type { ZTPoolType, StockChangeType } from '../../types';
import type { ToolDef } from '../types';
import { obj } from './schema';

/** 涨停股池类型（见 src/types/marketEvent.ts ZTPoolType） */
const ZT_POOL_TYPE = ['zt', 'yesterday', 'strong', 'sub_new', 'broken', 'dt'] as const;

/** 盘口异动类型（见 src/types/marketEvent.ts StockChangeType，全 22 项） */
const STOCK_CHANGE_TYPE = [
  'rocket_launch', // 火箭发射
  'quick_rebound', // 快速反弹
  'large_buy', // 大笔买入
  'limit_up_seal', // 封涨停板
  'limit_down_open', // 打开跌停板
  'big_buy_order', // 有大买盘
  'auction_up', // 竞价上涨
  'high_open_5d', // 高开 5 日线
  'gap_up', // 向上缺口
  'high_60d', // 60 日新高
  'surge_60d', // 60 日大幅上涨
  'accelerate_down', // 加速下跌
  'high_dive', // 高台跳水
  'large_sell', // 大笔卖出
  'limit_down_seal', // 封跌停板
  'limit_up_open', // 打开涨停板
  'big_sell_order', // 有大卖盘
  'auction_down', // 竞价下跌
  'low_open_5d', // 低开 5 日线
  'gap_down', // 向下缺口
  'low_60d', // 60 日新低
  'drop_60d', // 60 日大幅下跌
] as const;

export const marketEventTools: ToolDef[] = [
  {
    name: 'get_zt_pool',
    tier: 'core',
    description:
      '获取涨停股池（东方财富）：涨停 / 昨日涨停 / 强势 / 次新 / 炸板 / 跌停。' +
      "字段含价格(元)、涨跌幅(%)、成交额(元)、流通/总市值(元)、换手率(%)、连板数、封板时间(HHMMSS) 等。" +
      'type 默认 zt；date 不传为最新交易日。',
    inputSchema: obj({
      type: {
        type: 'string',
        enum: ZT_POOL_TYPE,
        default: 'zt',
        description:
          '股池类型：zt=涨停 / yesterday=昨日涨停 / strong=强势 / sub_new=次新 / broken=炸板 / dt=跌停',
      },
      date: { type: 'string', description: '日期 YYYYMMDD 或 YYYY-MM-DD，不传为最新交易日' },
    }),
    invoke: (sdk, a) =>
      sdk.marketEvent.ztPool(a.type as ZTPoolType | undefined, a.date as string | undefined),
  },
  {
    name: 'get_stock_changes',
    tier: 'full',
    description:
      '获取当日盘口异动列表（东方财富）：每条含发生时间(HH:MM:SS)、代码、名称、异动类型及中文标签、相关信息。' +
      'type 不传默认 large_buy(大笔买入)。',
    inputSchema: obj({
      type: {
        type: 'string',
        enum: STOCK_CHANGE_TYPE,
        default: 'large_buy',
        description:
          '异动类型筛选：rocket_launch=火箭发射 / quick_rebound=快速反弹 / large_buy=大笔买入 / ' +
          'limit_up_seal=封涨停板 / limit_down_open=打开跌停板 / big_buy_order=有大买盘 / auction_up=竞价上涨 / ' +
          'high_open_5d=高开5日线 / gap_up=向上缺口 / high_60d=60日新高 / surge_60d=60日大幅上涨 / ' +
          'accelerate_down=加速下跌 / high_dive=高台跳水 / large_sell=大笔卖出 / limit_down_seal=封跌停板 / ' +
          'limit_up_open=打开涨停板 / big_sell_order=有大卖盘 / auction_down=竞价下跌 / low_open_5d=低开5日线 / ' +
          'gap_down=向下缺口 / low_60d=60日新低 / drop_60d=60日大幅下跌',
      },
    }),
    invoke: (sdk, a) => sdk.marketEvent.stockChanges(a.type as StockChangeType | undefined),
  },
  {
    name: 'get_board_changes',
    tier: 'full',
    description:
      '获取当日板块异动汇总（东方财富）：每条含板块名称、涨跌幅(%)、主力净流入(元)、异动总次数、' +
      '异动最频繁个股（代码 / 名称 / 方向）及异动类型分布。无参。',
    inputSchema: obj({}),
    invoke: (sdk) => sdk.marketEvent.boardChanges(),
  },
];
