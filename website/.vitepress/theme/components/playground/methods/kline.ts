import type { MethodSpec } from '../types';
import {
  getDefaultDateRangeISO,
  KLINE_PERIOD_OPTIONS,
  ADJUST_OPTIONS,
  jsStr,
  jsObject,
  toCompactDate,
} from '../utils';

const dates = getDefaultDateRangeISO();

/**
 * K 线接口共享的 options 构建逻辑。
 * 注意：这些 SDK 方法把 startDate/endDate 直接透传给东方财富，
 * 服务端只接受 YYYYMMDD，必须把 date input 的 YYYY-MM-DD 先转换。
 */
function buildKlineOptions(params: Record<string, string>) {
  const options: any = { period: params.period, adjust: params.adjust };
  const start = toCompactDate(params.startDate);
  const end = toCompactDate(params.endDate);
  if (start) options.startDate = start;
  if (end) options.endDate = end;
  return options;
}

/** 把当前 params 渲染成 `getXxx('symbol', { period, adjust, startDate, endDate })` */
function renderKlineCall(method: string, p: Record<string, string>): string {
  const opts = jsObject({
    period: p.period,
    adjust: p.adjust,
    startDate: toCompactDate(p.startDate),
    endDate: toCompactDate(p.endDate),
  });
  return `await sdk.${method}(${jsStr(p.symbol)}, ${opts})`;
}

export const klineMethods: MethodSpec[] = [
  {
    name: 'getHistoryKline',
    desc: '获取 A 股历史 K 线',
    category: 'kline',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: 'sz000001', required: true, placeholder: '如 sz000001' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
      { key: 'adjust', label: '复权类型', type: 'select', default: 'qfq', options: ADJUST_OPTIONS },
      { key: 'startDate', label: '开始日期', type: 'date', default: dates.startDate },
      { key: 'endDate', label: '结束日期', type: 'date', default: dates.endDate },
    ],
    code: (p) => `const klines = ${renderKlineCall('getHistoryKline', p)};
console.log(klines[0].date);   // '2024-12-17'
console.log(klines[0].close);  // 收盘价`,
    run: (sdk, params) => sdk.getHistoryKline(params.symbol, buildKlineOptions(params)),
  },
  {
    name: 'getHKHistoryKline',
    desc: '获取港股历史 K 线',
    category: 'kline',
    params: [
      { key: 'symbol', label: '港股代码', type: 'text', default: '00700', required: true, placeholder: '如 00700' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
      { key: 'adjust', label: '复权类型', type: 'select', default: 'qfq', options: ADJUST_OPTIONS },
      { key: 'startDate', label: '开始日期', type: 'date', default: dates.startDate },
      { key: 'endDate', label: '结束日期', type: 'date', default: dates.endDate },
    ],
    code: (p) => `const klines = ${renderKlineCall('getHKHistoryKline', p)};
console.log(klines[0].name);   // '腾讯控股'
console.log(klines[0].close);  // 收盘价`,
    run: (sdk, params) => sdk.getHKHistoryKline(params.symbol, buildKlineOptions(params)),
  },
  {
    name: 'getUSHistoryKline',
    desc: '获取美股历史 K 线',
    category: 'kline',
    params: [
      { key: 'symbol', label: '美股代码', type: 'text', default: '105.MSFT', required: true, placeholder: '如 105.MSFT' },
      { key: 'period', label: 'K线周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
      { key: 'adjust', label: '复权类型', type: 'select', default: 'qfq', options: ADJUST_OPTIONS },
      { key: 'startDate', label: '开始日期', type: 'date', default: dates.startDate },
      { key: 'endDate', label: '结束日期', type: 'date', default: dates.endDate },
    ],
    code: (p) => `// 市场代码: 105(纳斯达克), 106(纽交所)
const klines = ${renderKlineCall('getUSHistoryKline', p)};
console.log(klines[0].name);   // '微软'
console.log(klines[0].close);  // 收盘价`,
    run: (sdk, params) => sdk.getUSHistoryKline(params.symbol, buildKlineOptions(params)),
  },
  {
    name: 'getMinuteKline',
    desc: '获取分钟 K 线/分时',
    category: 'kline',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: 'sz000001', required: true, placeholder: '如 sz000001' },
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
      { key: 'adjust', label: '复权类型', type: 'select', default: 'qfq', options: ADJUST_OPTIONS },
    ],
    code: (p) => `const klines = await sdk.getMinuteKline(${jsStr(p.symbol)}, ${jsObject({
      period: p.period,
      adjust: p.adjust,
    })});
console.log(klines[0].time);  // '2024-12-17 09:35'`,
    run: (sdk, params) =>
      sdk.getMinuteKline(params.symbol, { period: params.period, adjust: params.adjust }),
  },
  {
    name: 'getTodayTimeline',
    desc: '获取当日分时走势',
    category: 'kline',
    params: [
      { key: 'code', label: '股票代码', type: 'text', default: 'sz000001', required: true, placeholder: '如 sz000001' },
    ],
    code: (p) => `const timeline = await sdk.getTodayTimeline(${jsStr(p.code)});
console.log(timeline.date);         // '20241217'
console.log(timeline.data.length);  // 240
console.log(timeline.data[0].price);     // 成交价
console.log(timeline.data[0].avgPrice);  // 均价`,
    run: (sdk, params) => sdk.getTodayTimeline(params.code),
  },
];
