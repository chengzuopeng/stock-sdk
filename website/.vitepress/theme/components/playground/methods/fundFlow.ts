/** Phase 1/2 新增：资金流向（深度） */
import type { MethodSpec } from '../types';
import {
  KLINE_PERIOD_OPTIONS,
  FUND_FLOW_INDICATOR_OPTIONS,
  SECTOR_TYPE_OPTIONS,
  jsStr,
  jsObject,
} from '../utils';

export const fundFlowMethods: MethodSpec[] = [
  {
    name: 'getIndividualFundFlow',
    desc: '获取个股资金流历史（日/周/月）',
    category: 'extended',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: 'sh600519', required: true, placeholder: '如 sh600519 或 600519' },
      { key: 'period', label: '周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
    ],
    code: (p) => `const flow = await sdk.getIndividualFundFlow(${jsStr(p.symbol)}, ${jsObject({ period: p.period })});
console.log(flow.length);
console.log(flow.at(-1)?.date);
console.log(flow.at(-1)?.mainNetInflow);   // 最新主力净流入(元)`,
    run: (sdk, params) =>
      sdk.getIndividualFundFlow(params.symbol, { period: params.period as 'daily' | 'weekly' | 'monthly' }),
  },
  {
    name: 'getMarketFundFlow',
    desc: '大盘资金流（上证 + 深证）',
    category: 'extended',
    params: [],
    code: () => `const market = await sdk.getMarketFundFlow();
console.log(market.length);
console.log(market.at(-1)?.shClose);     // 最新上证收盘
console.log(market.at(-1)?.szClose);     // 最新深证收盘
console.log(market.at(-1)?.mainNetInflow);`,
    run: (sdk) => sdk.getMarketFundFlow(),
  },
  {
    name: 'getFundFlowRank',
    desc: '个股资金流排名（沪深北 A 股全市场）',
    category: 'extended',
    params: [
      { key: 'indicator', label: '排名周期', type: 'select', default: 'today', options: FUND_FLOW_INDICATOR_OPTIONS },
    ],
    code: (p) => `const rank = await sdk.getFundFlowRank(${jsObject({ indicator: p.indicator })});
console.log(rank.length);
console.log(rank[0]?.name);           // 主力净流入第一名
console.log(rank[0]?.mainNetInflow);  // 主力净流入(元)`,
    run: (sdk, params) =>
      sdk.getFundFlowRank({ indicator: params.indicator as 'today' | '3day' | '5day' | '10day' }),
  },
  {
    name: 'getSectorFundFlowRank',
    desc: '板块资金流排名（行业 / 概念 / 地域）',
    category: 'extended',
    params: [
      { key: 'indicator', label: '排名周期', type: 'select', default: 'today', options: FUND_FLOW_INDICATOR_OPTIONS },
      { key: 'sectorType', label: '板块类型', type: 'select', default: 'industry', options: SECTOR_TYPE_OPTIONS },
    ],
    code: (p) => `const sectors = await sdk.getSectorFundFlowRank(${jsObject({
      indicator: p.indicator,
      sectorType: p.sectorType,
    })});
console.log(sectors.length);
console.log(sectors[0]?.name);           // 主力净流入第一的板块
console.log(sectors[0]?.topStockName);   // 该板块的领涨股`,
    run: (sdk, params) =>
      sdk.getSectorFundFlowRank({
        indicator: params.indicator as 'today' | '3day' | '5day' | '10day',
        sectorType: params.sectorType as 'industry' | 'concept' | 'region',
      }),
  },
  {
    name: 'getSectorFundFlowHistory',
    desc: '单个板块的历史资金流',
    category: 'extended',
    params: [
      { key: 'symbol', label: '板块代码', type: 'text', default: 'BK0475', required: true, placeholder: '如 BK0475 (银行) 或 90.BK0475' },
      { key: 'period', label: '周期', type: 'select', default: 'daily', options: KLINE_PERIOD_OPTIONS },
    ],
    code: (p) => `const banking = await sdk.getSectorFundFlowHistory(${jsStr(p.symbol)}, ${jsObject({ period: p.period })});
console.log(banking.length);
console.log(banking.at(-1)?.mainNetInflow);`,
    run: (sdk, params) =>
      sdk.getSectorFundFlowHistory(params.symbol, { period: params.period as 'daily' | 'weekly' | 'monthly' }),
  },
];
