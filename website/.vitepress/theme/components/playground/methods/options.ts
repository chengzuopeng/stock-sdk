import type { MethodSpec } from '../types';
import { jsStr } from '../utils';

export const optionsMethods: MethodSpec[] = [
  {
    name: 'getIndexOptionSpot',
    desc: '获取股指期权 T 型报价（看涨 + 看跌）',
    category: 'options',
    params: [
      {
        key: 'product',
        label: '品种',
        type: 'select',
        default: 'io',
        required: true,
        options: [
          { value: 'ho', label: '上证50 (ho)' },
          { value: 'io', label: '沪深300 (io)' },
          { value: 'mo', label: '中证1000 (mo)' },
        ],
      },
      { key: 'contract', label: '合约月份', type: 'text', default: '2506', required: true, placeholder: '如 2506' },
    ],
    code: (p) => `const t = await sdk.getIndexOptionSpot(${jsStr(p.product)}, ${jsStr(p.contract)});
console.log(t.calls.length);   // 看涨合约数
console.log(t.puts.length);    // 看跌合约数
console.log(t.calls[0].code);  // 合约代码`,
    run: (sdk, params) => sdk.getIndexOptionSpot(params.product, params.contract),
  },
  {
    name: 'getIndexOptionKline',
    desc: '获取股指期权合约日 K 线',
    category: 'options',
    params: [
      { key: 'symbol', label: '合约代码', type: 'text', default: 'io2506C4000', required: true, placeholder: '如 io2506C4000' },
    ],
    code: (p) => `const klines = await sdk.getIndexOptionKline(${jsStr(p.symbol)});
console.log(klines[0].date);   // 日期
console.log(klines[0].close);  // 收盘价
console.log(klines[0].volume); // 成交量`,
    run: (sdk, params) => sdk.getIndexOptionKline(params.symbol),
  },
  {
    name: 'getCFFEXOptionQuotes',
    desc: '获取中金所全部期权实时行情',
    category: 'options',
    params: [],
    code: () => `const quotes = await sdk.getCFFEXOptionQuotes();
console.log(quotes[0].code);           // 合约代码
console.log(quotes[0].price);          // 最新价
console.log(quotes[0].strikePrice);    // 行权价
console.log(quotes[0].remainDays);     // 剩余天数`,
    run: (sdk) => sdk.getCFFEXOptionQuotes(),
  },
  {
    name: 'getETFOptionMonths',
    desc: '获取 ETF 期权到期月份列表',
    category: 'options',
    params: [
      {
        key: 'cate',
        label: '品种',
        type: 'select',
        default: '50ETF',
        required: true,
        options: [
          { value: '50ETF', label: '50ETF' },
          { value: '300ETF', label: '300ETF' },
          { value: '500ETF', label: '500ETF' },
          { value: '科创50', label: '科创50' },
        ],
      },
    ],
    code: (p) => `const info = await sdk.getETFOptionMonths(${jsStr(p.cate)});
console.log(info.months);   // 到期月份
console.log(info.stockId);  // 标的代码`,
    run: (sdk, params) => sdk.getETFOptionMonths(params.cate),
  },
  {
    name: 'getETFOptionExpireDay',
    desc: '获取 ETF 期权到期日信息',
    category: 'options',
    params: [
      {
        key: 'cate',
        label: '品种',
        type: 'select',
        default: '50ETF',
        required: true,
        options: [
          { value: '50ETF', label: '50ETF' },
          { value: '300ETF', label: '300ETF' },
        ],
      },
      { key: 'month', label: '到期月份', type: 'text', default: '2026-06', required: true, placeholder: '格式 YYYY-MM' },
    ],
    code: (p) => `const info = await sdk.getETFOptionExpireDay(${jsStr(p.cate)}, ${jsStr(p.month)});
console.log(info.expireDay);      // 到期日
console.log(info.remainderDays);  // 剩余天数`,
    run: (sdk, params) => sdk.getETFOptionExpireDay(params.cate, params.month),
  },
  {
    name: 'getETFOptionMinute',
    desc: '获取 ETF 期权当日分钟行情',
    category: 'options',
    params: [
      { key: 'code', label: '期权代码', type: 'text', default: '10009633', required: true, placeholder: '纯数字' },
    ],
    code: (p) => `const data = await sdk.getETFOptionMinute(${jsStr(p.code)});
console.log(data.length);     // 当日分钟点数
console.log(data[0].time);    // HH:MM
console.log(data[0].price);   // 价格`,
    run: (sdk, params) => sdk.getETFOptionMinute(params.code),
  },
  {
    name: 'getETFOptionDailyKline',
    desc: '获取 ETF 期权历史日 K 线',
    category: 'options',
    params: [
      { key: 'code', label: '期权代码', type: 'text', default: '10009633', required: true, placeholder: '纯数字' },
    ],
    code: (p) => `const klines = await sdk.getETFOptionDailyKline(${jsStr(p.code)});
console.log(klines[0].date);   // 日期
console.log(klines[0].close);  // 收盘价`,
    run: (sdk, params) => sdk.getETFOptionDailyKline(params.code),
  },
  {
    name: 'getETFOption5DayMinute',
    desc: '获取 ETF 期权 5 日分钟行情',
    category: 'options',
    params: [
      { key: 'code', label: '期权代码', type: 'text', default: '10009633', required: true, placeholder: '纯数字' },
    ],
    code: (p) => `const data = await sdk.getETFOption5DayMinute(${jsStr(p.code)});
console.log(data.length);     // 5 个交易日的分钟点合计
console.log(data[0].time);
console.log(data[0].price);`,
    run: (sdk, params) => sdk.getETFOption5DayMinute(params.code),
  },
  {
    name: 'getCommodityOptionSpot',
    desc: '获取商品期权 T 型报价',
    category: 'options',
    params: [
      {
        key: 'variety',
        label: '品种',
        type: 'text',
        default: 'm',
        required: true,
        placeholder: '小写品种代码，如 m / au / cu / SR',
      },
      { key: 'contract', label: '合约月份', type: 'text', default: '2509', required: true, placeholder: '如 2509' },
    ],
    code: (p) => `const t = await sdk.getCommodityOptionSpot(${jsStr(p.variety)}, ${jsStr(p.contract)});
console.log(t.calls.length);
console.log(t.puts.length);
console.log(t.calls[0].code);   // 合约代码`,
    run: (sdk, params) => sdk.getCommodityOptionSpot(params.variety, params.contract),
  },
  {
    name: 'getCommodityOptionKline',
    desc: '获取商品期权合约日 K 线',
    category: 'options',
    params: [
      { key: 'symbol', label: '合约代码', type: 'text', default: 'm2509C3200', required: true, placeholder: '如 m2509C3200' },
    ],
    code: (p) => `const klines = await sdk.getCommodityOptionKline(${jsStr(p.symbol)});
console.log(klines[0].date);   // 日期
console.log(klines[0].close);  // 收盘价`,
    run: (sdk, params) => sdk.getCommodityOptionKline(params.symbol),
  },
  {
    name: 'getOptionLHB',
    desc: '获取期权龙虎榜',
    category: 'options',
    params: [
      { key: 'symbol', label: '标的代码', type: 'text', default: '510050', required: true, placeholder: '如 510050' },
      { key: 'date', label: '交易日期', type: 'date', default: '2022-01-21', required: true },
    ],
    code: (p) => `const lhb = await sdk.getOptionLHB(${jsStr(p.symbol)}, ${jsStr(p.date)});
console.log(lhb[0].memberName);  // 会员简称
console.log(lhb[0].rank);        // 排名`,
    run: (sdk, params) => sdk.getOptionLHB(params.symbol, params.date),
  },
];
