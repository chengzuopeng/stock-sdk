/** Phase 1/2 新增：涨停板 / 盘口异动 */
import type { MethodSpec } from '../types';
import { jsStr } from '../utils';

const ZT_POOL_TYPE_OPTIONS = [
  { value: 'zt', label: '涨停股池' },
  { value: 'yesterday', label: '昨日涨停' },
  { value: 'strong', label: '强势股池' },
  { value: 'sub_new', label: '次新股池' },
  { value: 'broken', label: '炸板股池' },
  { value: 'dt', label: '跌停股池' },
];

const STOCK_CHANGE_TYPE_OPTIONS = [
  { value: 'rocket_launch', label: '火箭发射' },
  { value: 'quick_rebound', label: '快速反弹' },
  { value: 'large_buy', label: '大笔买入' },
  { value: 'limit_up_seal', label: '封涨停板' },
  { value: 'limit_down_open', label: '打开跌停板' },
  { value: 'big_buy_order', label: '有大买盘' },
  { value: 'auction_up', label: '竞价上涨' },
  { value: 'high_open_5d', label: '高开5日线' },
  { value: 'gap_up', label: '向上缺口' },
  { value: 'high_60d', label: '60日新高' },
  { value: 'surge_60d', label: '60日大幅上涨' },
  { value: 'accelerate_down', label: '加速下跌' },
  { value: 'high_dive', label: '高台跳水' },
  { value: 'large_sell', label: '大笔卖出' },
  { value: 'limit_down_seal', label: '封跌停板' },
  { value: 'limit_up_open', label: '打开涨停板' },
  { value: 'big_sell_order', label: '有大卖盘' },
  { value: 'auction_down', label: '竞价下跌' },
  { value: 'low_open_5d', label: '低开5日线' },
  { value: 'gap_down', label: '向下缺口' },
  { value: 'low_60d', label: '60日新低' },
  { value: 'drop_60d', label: '60日大幅下跌' },
];

export const marketEventMethods: MethodSpec[] = [
  {
    name: 'getZTPool',
    desc: '获取涨停 / 跌停 / 强势 等股池',
    category: 'extended',
    params: [
      { key: 'type', label: '池子类型', type: 'select', default: 'zt', options: ZT_POOL_TYPE_OPTIONS },
      { key: 'date', label: '交易日', type: 'date', default: '', placeholder: '默认今天' },
    ],
    code: (p) => {
      const args = p.date?.trim() ? `${jsStr(p.type)}, ${jsStr(p.date)}` : jsStr(p.type);
      return `const pool = await sdk.getZTPool(${args});
console.log(pool.length);
console.log(pool[0]?.name);                     // 第一只涨停股
console.log(pool[0]?.continuousBoardCount);     // 连板数`;
    },
    run: (sdk, params) => sdk.getZTPool(params.type, params.date?.trim() || undefined),
  },
  {
    name: 'getStockChanges',
    desc: '盘口异动（共 22 种类型）',
    category: 'extended',
    params: [
      { key: 'type', label: '异动类型', type: 'select', default: 'large_buy', options: STOCK_CHANGE_TYPE_OPTIONS },
    ],
    code: (p) => `const changes = await sdk.getStockChanges(${jsStr(p.type)});
console.log(changes.length);              // 当日异动次数
console.log(changes[0]?.time);            // 09:30:55
console.log(changes[0]?.changeTypeLabel); // 中文异动类型`,
    run: (sdk, params) => sdk.getStockChanges(params.type),
  },
  {
    name: 'getBoardChanges',
    desc: '当日板块异动详情',
    category: 'extended',
    params: [],
    code: () => `const boards = await sdk.getBoardChanges();
console.log(boards.length);              // 异动板块数
console.log(boards[0]?.name);            // 异动最频繁板块
console.log(boards[0]?.totalChangeCount);
console.log(boards[0]?.topStockName);    // 异动最频繁个股`,
    run: (sdk) => sdk.getBoardChanges(),
  },
];
