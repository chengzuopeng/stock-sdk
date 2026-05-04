/** Phase 1/2 新增：沪深港通 / 北向资金 */
import type { MethodSpec } from '../types';
import {
  NORTHBOUND_DIRECTION_OPTIONS,
  NORTHBOUND_RANK_PERIOD_OPTIONS,
  jsStr,
  jsObject,
} from '../utils';

function buildDateRange(params: Record<string, string>) {
  const options: any = {};
  if (params.startDate?.trim()) options.startDate = params.startDate.trim();
  if (params.endDate?.trim()) options.endDate = params.endDate.trim();
  return options;
}

export const northboundMethods: MethodSpec[] = [
  {
    name: 'getNorthboundMinute',
    desc: '北向 / 南向资金分时数据',
    category: 'extended',
    params: [
      { key: 'direction', label: '方向', type: 'select', default: 'north', options: NORTHBOUND_DIRECTION_OPTIONS },
    ],
    code: (p) => `const points = await sdk.getNorthboundMinute(${jsStr(p.direction)});
console.log(points.length);
console.log(points.at(-1)?.totalNetInflow);   // 最新合计净流入(万元)`,
    run: (sdk, params) => sdk.getNorthboundMinute(params.direction as 'north' | 'south'),
  },
  {
    name: 'getNorthboundFlowSummary',
    desc: '沪深港通市场资金流向汇总',
    category: 'extended',
    params: [],
    code: () => `const summary = await sdk.getNorthboundFlowSummary();
console.log(summary.length);   // 通常 4 行（北向沪/深 + 南向沪/深）
summary.forEach(s => {
  console.log(\`\${s.boardName}: 净买额 \${s.netBuyAmount} 元\`);
});`,
    run: (sdk) => sdk.getNorthboundFlowSummary(),
  },
  {
    name: 'getNorthboundHoldingRank',
    desc: '北向 / 沪股通 / 深股通持股个股排行',
    category: 'extended',
    params: [
      {
        key: 'market',
        label: '市场',
        type: 'select',
        default: 'all',
        options: [
          { value: 'all', label: '全部（北向）' },
          { value: 'shanghai', label: '沪股通' },
          { value: 'shenzhen', label: '深股通' },
        ],
      },
      { key: 'period', label: '周期', type: 'select', default: '5day', options: NORTHBOUND_RANK_PERIOD_OPTIONS },
    ],
    code: (p) => `const rank = await sdk.getNorthboundHoldingRank(${jsObject({
      market: p.market,
      period: p.period,
    })});
console.log(rank.length);
console.log(rank[0]?.name);
console.log(rank[0]?.holdMarketValue);   // 持股市值(元)`,
    run: (sdk, params) =>
      sdk.getNorthboundHoldingRank({
        market: params.market as 'all' | 'shanghai' | 'shenzhen',
        period: params.period as 'today' | '3day' | '5day' | '10day' | 'month' | 'quarter' | 'year',
      }),
  },
  {
    name: 'getNorthboundHistory',
    desc: '北向 / 南向资金按日历史',
    category: 'extended',
    params: [
      { key: 'direction', label: '方向', type: 'select', default: 'north', options: NORTHBOUND_DIRECTION_OPTIONS },
      { key: 'startDate', label: '开始日期', type: 'date', default: '' },
      { key: 'endDate', label: '结束日期', type: 'date', default: '' },
    ],
    code: (p) => {
      const opts = jsObject({ startDate: p.startDate, endDate: p.endDate });
      return `const history = await sdk.getNorthboundHistory(${jsStr(p.direction)}, ${opts});
console.log(history.length);
console.log(history[0]?.netBuyAmount);`;
    },
    run: (sdk, params) =>
      sdk.getNorthboundHistory(params.direction as 'north' | 'south', buildDateRange(params)),
  },
  {
    name: 'getNorthboundIndividual',
    desc: '个股的北向持仓历史',
    category: 'extended',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: '600519', required: true, placeholder: '如 600519 或 sh600519' },
      { key: 'startDate', label: '开始日期', type: 'date', default: '' },
      { key: 'endDate', label: '结束日期', type: 'date', default: '' },
    ],
    code: (p) => {
      const opts = jsObject({ startDate: p.startDate, endDate: p.endDate });
      return `const moutai = await sdk.getNorthboundIndividual(${jsStr(p.symbol)}, ${opts});
console.log(moutai.length);
console.log(moutai[0]?.holdShares);
console.log(moutai[0]?.holdMarketValue);`;
    },
    run: (sdk, params) => sdk.getNorthboundIndividual(params.symbol, buildDateRange(params)),
  },
];
