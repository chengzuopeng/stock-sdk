import type { MethodSpec } from '../types';
import {
  getDefaultDateRangeISO,
  KLINE_PERIOD_OPTIONS,
  jsStr,
  jsObject,
  toCompactDate,
} from '../utils';

const dates = getDefaultDateRangeISO();

/** 板块 K 线 SDK 直传 beg/end 给东方财富，必须用 YYYYMMDD 格式 */
function buildBoardKlineOptions(params: Record<string, string>) {
  const options: any = { period: params.period };
  const start = toCompactDate(params.startDate);
  const end = toCompactDate(params.endDate);
  if (start) options.startDate = start;
  if (end) options.endDate = end;
  return options;
}

function renderBoardKlineCall(method: string, p: Record<string, string>): string {
  const opts = jsObject({
    period: p.period,
    startDate: toCompactDate(p.startDate),
    endDate: toCompactDate(p.endDate),
  });
  return `await sdk.${method}(${jsStr(p.symbol)}, ${opts})`;
}

export const boardMethods: MethodSpec[] = [
  // === 行业板块 ===
  {
    name: 'getIndustryList',
    desc: '获取行业板块列表',
    category: 'board',
    params: [],
    code: () => `const boards = await sdk.getIndustryList();
// 返回: IndustryBoard[]
console.log(boards[0].name);  // 板块名称
console.log(boards[0].code);  // BK1027`,
    run: (sdk) => sdk.getIndustryList(),
  },
  {
    name: 'getIndustrySpot',
    desc: '获取行业板块实时行情',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '互联网服务', required: true, placeholder: '如 互联网服务 或 BK0447' },
    ],
    code: (p) => `const spot = await sdk.getIndustrySpot(${jsStr(p.symbol)});
// 返回: IndustryBoardSpot[]
console.log(spot[0].item);   // 指标名称
console.log(spot[0].value);  // 指标值`,
    run: (sdk, params) => sdk.getIndustrySpot(params.symbol),
  },
  {
    name: 'getIndustryConstituents',
    desc: '获取行业板块成分股',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '互联网服务', required: true, placeholder: '如 互联网服务 或 BK0447' },
    ],
    code: (p) => `const stocks = await sdk.getIndustryConstituents(${jsStr(p.symbol)});
// 返回: IndustryBoardConstituent[]
console.log(stocks[0].name);  // 股票名称
console.log(stocks[0].code);  // 股票代码`,
    run: (sdk, params) => sdk.getIndustryConstituents(params.symbol),
  },
  {
    name: 'getIndustryKline',
    desc: '获取行业板块 K 线',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '互联网服务', required: true, placeholder: '如 互联网服务 或 BK0447' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
      { key: 'startDate', label: '开始日期', type: 'date', default: dates.startDate },
      { key: 'endDate', label: '结束日期', type: 'date', default: dates.endDate },
    ],
    code: (p) => `const klines = ${renderBoardKlineCall('getIndustryKline', p)};
console.log(klines[0].date);   // 日期
console.log(klines[0].close);  // 收盘价`,
    run: (sdk, params) => sdk.getIndustryKline(params.symbol, buildBoardKlineOptions(params)),
  },
  {
    name: 'getIndustryMinuteKline',
    desc: '获取行业板块分时/分钟 K 线',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '互联网服务', required: true, placeholder: '如 互联网服务 或 BK0447' },
      {
        key: 'period',
        label: 'K线周期',
        type: 'select',
        default: '5',
        options: [
          { value: '1', label: '1分钟(分时)' },
          { value: '5', label: '5分钟' },
          { value: '15', label: '15分钟' },
          { value: '30', label: '30分钟' },
          { value: '60', label: '60分钟' },
        ],
      },
    ],
    code: (p) => `const data = await sdk.getIndustryMinuteKline(${jsStr(p.symbol)}, ${jsObject({ period: p.period })});
// period === '1' 时返回当日分时；其他值返回对应分钟 K 线
console.log(data[0].time);   // '2024-12-17 09:35'
console.log(data[0].close);  // 收盘价`,
    run: (sdk, params) => sdk.getIndustryMinuteKline(params.symbol, { period: params.period }),
  },
  // === 概念板块 ===
  {
    name: 'getConceptList',
    desc: '获取概念板块列表',
    category: 'board',
    params: [],
    code: () => `const boards = await sdk.getConceptList();
// 返回: ConceptBoard[]
console.log(boards[0].name);  // 板块名称
console.log(boards[0].code);  // BK0800`,
    run: (sdk) => sdk.getConceptList(),
  },
  {
    name: 'getConceptSpot',
    desc: '获取概念板块实时行情',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '人工智能', required: true, placeholder: '如 人工智能 或 BK0800' },
    ],
    code: (p) => `const spot = await sdk.getConceptSpot(${jsStr(p.symbol)});
// 返回: ConceptBoardSpot[]
console.log(spot[0].item);   // 指标名称
console.log(spot[0].value);  // 指标值`,
    run: (sdk, params) => sdk.getConceptSpot(params.symbol),
  },
  {
    name: 'getConceptConstituents',
    desc: '获取概念板块成分股',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '人工智能', required: true, placeholder: '如 人工智能 或 BK0800' },
    ],
    code: (p) => `const stocks = await sdk.getConceptConstituents(${jsStr(p.symbol)});
// 返回: ConceptBoardConstituent[]
console.log(stocks[0].name);  // 股票名称
console.log(stocks[0].code);  // 股票代码`,
    run: (sdk, params) => sdk.getConceptConstituents(params.symbol),
  },
  {
    name: 'getConceptKline',
    desc: '获取概念板块 K 线',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '人工智能', required: true, placeholder: '如 人工智能 或 BK0800' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
      { key: 'startDate', label: '开始日期', type: 'date', default: dates.startDate },
      { key: 'endDate', label: '结束日期', type: 'date', default: dates.endDate },
    ],
    code: (p) => `const klines = ${renderBoardKlineCall('getConceptKline', p)};
console.log(klines[0].date);   // 日期
console.log(klines[0].close);  // 收盘价`,
    run: (sdk, params) => sdk.getConceptKline(params.symbol, buildBoardKlineOptions(params)),
  },
  {
    name: 'getConceptMinuteKline',
    desc: '获取概念板块分时/分钟 K 线',
    category: 'board',
    params: [
      { key: 'symbol', label: '板块名称/代码', type: 'text', default: '人工智能', required: true, placeholder: '如 人工智能 或 BK0800' },
      {
        key: 'period',
        label: 'K线周期',
        type: 'select',
        default: '5',
        options: [
          { value: '1', label: '1分钟(分时)' },
          { value: '5', label: '5分钟' },
          { value: '15', label: '15分钟' },
          { value: '30', label: '30分钟' },
          { value: '60', label: '60分钟' },
        ],
      },
    ],
    code: (p) => `const data = await sdk.getConceptMinuteKline(${jsStr(p.symbol)}, ${jsObject({ period: p.period })});
// period === '1' 时返回当日分时；其他值返回对应分钟 K 线
console.log(data[0].time);   // '2024-12-17 09:35'
console.log(data[0].close);  // 收盘价`,
    run: (sdk, params) => sdk.getConceptMinuteKline(params.symbol, { period: params.period }),
  },
];
