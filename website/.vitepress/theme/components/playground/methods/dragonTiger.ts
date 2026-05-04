/** Phase 1/2 新增：龙虎榜 */
import type { MethodSpec } from '../types';
import { DRAGON_TIGER_PERIOD_OPTIONS, jsStr, jsObject } from '../utils';

export const dragonTigerMethods: MethodSpec[] = [
  {
    name: 'getDragonTigerDetail',
    desc: '龙虎榜详情（按日期范围）',
    category: 'extended',
    params: [
      { key: 'startDate', label: '开始日期', type: 'date', default: '2024-01-01', required: true },
      { key: 'endDate', label: '结束日期', type: 'date', default: '2024-01-31', required: true },
    ],
    code: (p) => `const list = await sdk.getDragonTigerDetail(${jsObject({
      startDate: p.startDate,
      endDate: p.endDate,
    })});
console.log(list.length);
console.log(list[0]?.name);
console.log(list[0]?.netBuyAmount);   // 净买额(元)
console.log(list[0]?.reason);         // 上榜原因`,
    run: (sdk, params) =>
      sdk.getDragonTigerDetail({ startDate: params.startDate, endDate: params.endDate }),
  },
  {
    name: 'getDragonTigerStockStats',
    desc: '龙虎榜个股上榜统计',
    category: 'extended',
    params: [
      { key: 'period', label: '统计周期', type: 'select', default: '1month', options: DRAGON_TIGER_PERIOD_OPTIONS },
    ],
    code: (p) => `const stats = await sdk.getDragonTigerStockStats(${jsStr(p.period)});
console.log(stats.length);
console.log(stats[0]?.name);            // 上榜次数最多的股票
console.log(stats[0]?.count);`,
    run: (sdk, params) =>
      sdk.getDragonTigerStockStats(params.period as '1month' | '3month' | '6month' | '1year'),
  },
  {
    name: 'getDragonTigerInstitution',
    desc: '机构买卖统计（按日期范围）',
    category: 'extended',
    params: [
      { key: 'startDate', label: '开始日期', type: 'date', default: '2024-01-01', required: true },
      { key: 'endDate', label: '结束日期', type: 'date', default: '2024-01-31', required: true },
    ],
    code: (p) => `const list = await sdk.getDragonTigerInstitution(${jsObject({
      startDate: p.startDate,
      endDate: p.endDate,
    })});
console.log(list.length);
console.log(list[0]?.orgBuyAmount);    // 机构买入额(元)
console.log(list[0]?.orgNetAmount);    // 机构净额(元)`,
    run: (sdk, params) =>
      sdk.getDragonTigerInstitution({ startDate: params.startDate, endDate: params.endDate }),
  },
  {
    name: 'getDragonTigerBranchRank',
    desc: '营业部排行',
    category: 'extended',
    params: [
      { key: 'period', label: '统计周期', type: 'select', default: '1month', options: DRAGON_TIGER_PERIOD_OPTIONS },
    ],
    code: (p) => `const branches = await sdk.getDragonTigerBranchRank(${jsStr(p.period)});
console.log(branches.length);
console.log(branches[0]?.name);           // 排名第一的营业部
console.log(branches[0]?.totalBuyAmount);`,
    run: (sdk, params) =>
      sdk.getDragonTigerBranchRank(params.period as '1month' | '3month' | '6month' | '1year'),
  },
  {
    name: 'getDragonTigerStockSeatDetail',
    desc: '个股某日上榜席位明细（买入榜+卖出榜）',
    category: 'extended',
    params: [
      { key: 'symbol', label: '股票代码', type: 'text', default: '600519', required: true, placeholder: '如 600519' },
      { key: 'date', label: '上榜日期', type: 'date', default: '2024-01-15', required: true },
    ],
    code: (p) => `const seats = await sdk.getDragonTigerStockSeatDetail(${jsStr(p.symbol)}, ${jsStr(p.date)});
const buyers = seats.filter(s => s.side === 'buy');
const sellers = seats.filter(s => s.side === 'sell');
console.log(\`买方席位: \${buyers.length}, 卖方席位: \${sellers.length}\`);
console.log(buyers[0]?.branchName, buyers[0]?.buyAmount);`,
    run: (sdk, params) => sdk.getDragonTigerStockSeatDetail(params.symbol, params.date),
  },
];
