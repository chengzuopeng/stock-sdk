/**
 * 公募基金扩展数据演示（v1.10.0+）
 *
 * 4 个方法承载在 FundService 上：分红 / 历史净值 / 实时估值 / 同类排名。
 * 数据源为东方财富 / 天天基金；浏览器端走 <script> 注入加载（无 CORS 头），
 * 并发由 SDK 内部 withScriptMutex 串行化保护。
 */
import type { MethodSpec } from '../types';
import { jsStr } from '../utils';

export const fundMethods: MethodSpec[] = [
  {
    name: 'getFundDividendList',
    desc: '基金 / ETF 分红明细（按年份分页，可按代码过滤）',
    category: 'fund',
    params: [
      {
        key: 'year',
        label: '年份',
        type: 'number',
        default: '2024',
        required: true,
        placeholder: '如 2024',
      },
      {
        key: 'page',
        label: '页码',
        type: 'text',
        default: '1',
        placeholder: "数字或 'all'（全部页面聚合）",
      },
      {
        key: 'code',
        label: '基金代码（可选过滤）',
        type: 'text',
        default: '',
        placeholder: '如 110011；留空查全市场',
      },
    ],
    code: (p) => {
      const opts: string[] = [`year: ${p.year || '2024'}`];
      if (p.page && p.page !== '1') {
        opts.push(p.page === 'all' ? `page: 'all'` : `page: ${p.page}`);
      }
      if (p.code) opts.push(`code: ${jsStr(p.code)}`);
      return `const r = await sdk.getFundDividendList({ ${opts.join(', ')} });
console.log('total pages:', r.totalPages, 'page size:', r.pageSize);
console.log('items:', r.items.length);
console.log(r.items[0]);
// { code, name, equityRecordDate, exDividendDate, dividendPerShare, payDate, raw }`;
    },
    run: (sdk, params) => {
      const opts: Record<string, unknown> = {
        year: params.year ? Number(params.year) : new Date().getFullYear(),
      };
      if (params.page === 'all') opts.page = 'all';
      else if (params.page && params.page !== '1') {
        opts.page = Number(params.page);
      }
      if (params.code) opts.code = params.code;
      return sdk.getFundDividendList(opts);
    },
  },
  {
    name: 'getFundNavHistory',
    desc: '基金历史净值（单位 + 累计，一次返回全历史）',
    category: 'fund',
    params: [
      {
        key: 'code',
        label: '基金代码',
        type: 'text',
        default: '110011',
        required: true,
        placeholder: '如 110011（易方达优质精选）',
      },
    ],
    code: (p) => `const h = await sdk.getFundNavHistory(${jsStr(p.code)});
console.log(h.name, '共', h.items.length, '条净值');
const latest = h.items[h.items.length - 1];
console.log('最新:', latest.date, '单位', latest.nav, '累计', latest.accNav);
console.log('最近 5 条:', h.items.slice(-5));`,
    run: (sdk, params) => sdk.getFundNavHistory(params.code),
  },
  {
    name: 'getFundEstimate',
    desc: '基金当日实时估值（含 T-1 净值 + 盘中估算）',
    category: 'fund',
    params: [
      {
        key: 'code',
        label: '基金代码',
        type: 'text',
        default: '005827',
        required: true,
        placeholder: '如 005827（易方达蓝筹精选）',
      },
    ],
    code: (p) => `const e = await sdk.getFundEstimate(${jsStr(p.code)});
console.log(e.name);
console.log('最新已结净值:', e.nav, '（', e.navDate, '）');
console.log('盘中估算:', e.estimatedNav, '（', e.estimatedChangePercent, '%）');
console.log('估算时间:', e.estimateTime);`,
    run: (sdk, params) => sdk.getFundEstimate(params.code),
  },
  {
    name: 'getFundRankHistory',
    desc: '基金同类排名走势（每日近三月排名 + 百分位）',
    category: 'fund',
    params: [
      {
        key: 'code',
        label: '基金代码',
        type: 'text',
        default: '110011',
        required: true,
        placeholder: '如 110011',
      },
    ],
    code: (p) => `const r = await sdk.getFundRankHistory(${jsStr(p.code)});
console.log(r.name, '共', r.items.length, '个报告点');
const latest = r.items[r.items.length - 1];
console.log(\`最新: \${latest.date}  排名 \${latest.rank}/\${latest.total}  百分位 \${latest.percentile}%\`);`,
    run: (sdk, params) => sdk.getFundRankHistory(params.code),
  },
];
