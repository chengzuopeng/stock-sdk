/** Phase 1/2 新增：大宗交易 / 融资融券 */
import type { MethodSpec } from '../types';
import { jsStr, jsObject } from '../utils';

function buildOptionalDateRange(params: Record<string, string>) {
  const options: any = {};
  if (params.startDate?.trim()) options.startDate = params.startDate.trim();
  if (params.endDate?.trim()) options.endDate = params.endDate.trim();
  return options;
}

export const blockTradeMarginMethods: MethodSpec[] = [
  // === 大宗交易 ===
  {
    name: 'getBlockTradeMarketStat',
    desc: '大宗交易市场每日总览',
    category: 'extended',
    params: [],
    code: () => `const stat = await sdk.getBlockTradeMarketStat();
console.log(stat.length);
console.log(stat[0]?.date);
console.log(stat[0]?.totalAmount);         // 大宗交易总额(元)
console.log(stat[0]?.premiumRatio);        // 溢价占比`,
    run: (sdk) => sdk.getBlockTradeMarketStat(),
  },
  {
    name: 'getBlockTradeDetail',
    desc: '大宗交易明细（按日期范围）',
    category: 'extended',
    params: [
      { key: 'startDate', label: '开始日期', type: 'date', default: '2024-01-01' },
      { key: 'endDate', label: '结束日期', type: 'date', default: '2024-01-31' },
    ],
    code: (p) => {
      const opts = jsObject({ startDate: p.startDate, endDate: p.endDate });
      return `const detail = await sdk.getBlockTradeDetail(${opts});
console.log(detail.length);
console.log(detail[0]?.dealPrice);      // 成交价
console.log(detail[0]?.premiumRate);    // 溢价率(%)
console.log(detail[0]?.buyBranch);      // 买方营业部`;
    },
    run: (sdk, params) => sdk.getBlockTradeDetail(buildOptionalDateRange(params)),
  },
  {
    name: 'getBlockTradeDailyStat',
    desc: '大宗交易每日统计（按股票汇总）',
    category: 'extended',
    params: [
      { key: 'startDate', label: '开始日期', type: 'date', default: '2024-01-01' },
      { key: 'endDate', label: '结束日期', type: 'date', default: '2024-01-31' },
    ],
    code: (p) => {
      const opts = jsObject({ startDate: p.startDate, endDate: p.endDate });
      return `const stat = await sdk.getBlockTradeDailyStat(${opts});
console.log(stat.length);
console.log(stat[0]?.dealCount);
console.log(stat[0]?.dealTotalAmount);`;
    },
    run: (sdk, params) => sdk.getBlockTradeDailyStat(buildOptionalDateRange(params)),
  },
  // === 融资融券 ===
  {
    name: 'getMarginAccountInfo',
    desc: '融资融券账户统计',
    category: 'extended',
    params: [],
    code: () => `const margin = await sdk.getMarginAccountInfo();
console.log(margin.length);
console.log(margin[0]?.finBalance);          // 融资余额(元)
console.log(margin[0]?.avgGuaranteeRatio);   // 维保比例(%)`,
    run: (sdk) => sdk.getMarginAccountInfo(),
  },
  {
    name: 'getMarginTargetList',
    desc: '融资融券标的明细',
    category: 'extended',
    params: [
      { key: 'date', label: '交易日', type: 'date', default: '', placeholder: '默认服务端最新交易日' },
    ],
    code: (p) => {
      const args = p.date?.trim() ? jsStr(p.date) : '';
      return `const targets = await sdk.getMarginTargetList(${args});
console.log(targets.length);
console.log(targets[0]?.code);
console.log(targets[0]?.finBalance);     // 融资余额(元)`;
    },
    run: (sdk, params) => sdk.getMarginTargetList(params.date?.trim() || undefined),
  },
];
