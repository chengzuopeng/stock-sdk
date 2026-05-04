/**
 * 历史保留的"扩展功能"方法（v1.9.0 之前已存在）。
 */
import type { MethodSpec } from '../types';
import { splitCsvCodes, jsCsvArray, jsStr } from '../utils';

export const extendedMethods: MethodSpec[] = [
  {
    name: 'getFundFlow',
    desc: '获取资金流向',
    category: 'extended',
    params: [
      { key: 'codes', label: '股票代码', type: 'text', default: 'sz000858', required: true, placeholder: '多个用逗号分隔' },
    ],
    code: (p) => `const flows = await sdk.getFundFlow(${jsCsvArray(p.codes)});
console.log(flows[0].mainNet);       // 主力净流入
console.log(flows[0].mainNetRatio);  // 主力净流入占比`,
    run: (sdk, params) => sdk.getFundFlow(splitCsvCodes(params.codes)),
  },
  {
    name: 'getPanelLargeOrder',
    desc: '获取盘口大单占比',
    category: 'extended',
    params: [
      { key: 'codes', label: '股票代码', type: 'text', default: 'sz000858', required: true, placeholder: '多个用逗号分隔' },
    ],
    code: (p) => `const orders = await sdk.getPanelLargeOrder(${jsCsvArray(p.codes)});
console.log(orders[0].buyLargeRatio);   // 买盘大单占比
console.log(orders[0].sellLargeRatio);  // 卖盘大单占比`,
    run: (sdk, params) => sdk.getPanelLargeOrder(splitCsvCodes(params.codes)),
  },
  {
    name: 'getTradingCalendar',
    desc: '获取 A 股交易日历',
    category: 'extended',
    params: [],
    code: () => `const calendar = await sdk.getTradingCalendar();
console.log(calendar.length);        // 交易日总数
console.log(calendar[0]);            // '1990-12-19' (第一个交易日)
console.log(calendar.slice(-5));     // 最近 5 个交易日`,
    run: (sdk) => sdk.getTradingCalendar(),
  },
  {
    name: 'getDividendDetail',
    desc: '获取股票分红派送详情',
    category: 'extended',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: '000001', required: true, placeholder: '如 000001 或 sz000001' },
    ],
    code: (p) => `const dividends = await sdk.getDividendDetail(${jsStr(p.symbol)});
console.log(dividends.length);              // 分红记录数
console.log(dividends[0].name);             // 平安银行
console.log(dividends[0].reportDate);       // 报告期
console.log(dividends[0].dividendPretax);   // 每10股派息(税前)
console.log(dividends[0].dividendDesc);     // 10派2.36元(含税,扣税后2.124元)
console.log(dividends[0].dividendYield);    // 股息率
console.log(dividends[0].eps);              // 每股收益
console.log(dividends[0].bps);              // 每股净资产
console.log(dividends[0].exDividendDate);   // 除权除息日
console.log(dividends[0].assignProgress);   // 方案进度`,
    run: (sdk, params) => sdk.getDividendDetail(params.symbol),
  },
];
