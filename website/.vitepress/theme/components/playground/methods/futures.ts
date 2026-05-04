import type { MethodSpec } from '../types';
import {
  getDefaultDateRangeISO,
  KLINE_PERIOD_OPTIONS,
  jsStr,
  jsObject,
  toCompactDate,
} from '../utils';

const dates = getDefaultDateRangeISO();

/** 期货 K 线 SDK 直传 beg/end 给东方财富，必须用 YYYYMMDD 格式 */
function buildFuturesKlineOptions(params: Record<string, string>) {
  const options: any = { period: params.period };
  const start = toCompactDate(params.startDate);
  const end = toCompactDate(params.endDate);
  if (start) options.startDate = start;
  if (end) options.endDate = end;
  return options;
}

function renderFuturesKlineCall(method: string, p: Record<string, string>): string {
  const opts = jsObject({
    period: p.period,
    startDate: toCompactDate(p.startDate),
    endDate: toCompactDate(p.endDate),
  });
  return `await sdk.${method}(${jsStr(p.symbol)}, ${opts})`;
}

export const futuresMethods: MethodSpec[] = [
  {
    name: 'getFuturesKline',
    desc: '获取国内期货历史 K 线',
    category: 'futures',
    params: [
      { key: 'symbol', label: '合约代码', type: 'text', default: 'RBM', required: true, placeholder: '如 RBM(主连), rb2510(具体合约)' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
      { key: 'startDate', label: '开始日期', type: 'date', default: dates.startDate },
      { key: 'endDate', label: '结束日期', type: 'date', default: dates.endDate },
    ],
    code: (p) => `const klines = ${renderFuturesKlineCall('getFuturesKline', p)};
console.log(klines[0].date);          // '2026-02-27'
console.log(klines[0].close);         // 收盘价
console.log(klines[0].openInterest);  // 持仓量`,
    run: (sdk, params) => sdk.getFuturesKline(params.symbol, buildFuturesKlineOptions(params)),
  },
  {
    name: 'getGlobalFuturesSpot',
    desc: '获取全球期货实时行情',
    category: 'futures',
    params: [],
    code: () => `const quotes = await sdk.getGlobalFuturesSpot();
// 返回 600+ 个国际期货品种
console.log(quotes[0].name);    // COMEX铜
console.log(quotes[0].code);    // HG00Y
console.log(quotes[0].price);   // 最新价
console.log(quotes[0].changePercent);  // 涨跌幅%`,
    run: (sdk) => sdk.getGlobalFuturesSpot(),
  },
  {
    name: 'getGlobalFuturesKline',
    desc: '获取全球期货历史 K 线',
    category: 'futures',
    params: [
      { key: 'symbol', label: '合约代码', type: 'text', default: 'HG00Y', required: true, placeholder: '如 HG00Y(COMEX铜), CL00Y(原油)' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
      { key: 'startDate', label: '开始日期', type: 'date', default: dates.startDate },
      { key: 'endDate', label: '结束日期', type: 'date', default: dates.endDate },
    ],
    code: (p) => `const klines = ${renderFuturesKlineCall('getGlobalFuturesKline', p)};
console.log(klines[0].date);          // 日期
console.log(klines[0].close);         // 收盘价
console.log(klines[0].openInterest);  // 持仓量`,
    run: (sdk, params) =>
      sdk.getGlobalFuturesKline(params.symbol, buildFuturesKlineOptions(params)),
  },
  {
    name: 'getFuturesInventorySymbols',
    desc: '获取期货库存品种列表',
    category: 'futures',
    params: [],
    code: () => `const symbols = await sdk.getFuturesInventorySymbols();
console.log(symbols[0].code);  // 品种代码
console.log(symbols[0].name);  // 品种名称`,
    run: (sdk) => sdk.getFuturesInventorySymbols(),
  },
  {
    name: 'getFuturesInventory',
    desc: '获取期货库存数据',
    category: 'futures',
    params: [
      { key: 'symbol', label: '品种代码', type: 'text', default: 'RB', required: true, placeholder: '大写，如 RB, AG, CU' },
      { key: 'startDate', label: '开始日期', type: 'date', default: '2024-01-01' },
    ],
    code: (p) => {
      const opts = jsObject({ startDate: p.startDate });
      return `const inventory = await sdk.getFuturesInventory(${jsStr(p.symbol)}, ${opts});
console.log(inventory[0].date);       // 日期
console.log(inventory[0].inventory);  // 库存量
console.log(inventory[0].change);     // 增减`;
    },
    run: (sdk, params) => {
      const options: any = {};
      if (params.startDate) options.startDate = params.startDate;
      return sdk.getFuturesInventory(params.symbol, options);
    },
  },
  {
    name: 'getComexInventory',
    desc: '获取 COMEX 黄金/白银库存',
    category: 'futures',
    params: [
      {
        key: 'symbol',
        label: '品种',
        type: 'select',
        default: 'gold',
        required: true,
        options: [
          { value: 'gold', label: '黄金' },
          { value: 'silver', label: '白银' },
        ],
      },
    ],
    code: (p) => `const inventory = await sdk.getComexInventory(${jsStr(p.symbol)});
console.log(inventory[0].date);         // 日期
console.log(inventory[0].storageTon);   // 库存量(吨)
console.log(inventory[0].storageOunce); // 库存量(盎司)`,
    run: (sdk, params) => sdk.getComexInventory(params.symbol),
  },
];
