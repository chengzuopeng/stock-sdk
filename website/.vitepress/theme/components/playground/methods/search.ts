import type { MethodSpec } from '../types';
import { jsStr } from '../utils';

export const searchMethods: MethodSpec[] = [
  {
    name: 'search',
    desc: '搜索股票',
    category: 'search',
    params: [
      { key: 'keyword', label: '关键词', type: 'text', default: 'maotai', required: true, placeholder: '代码 / 名称 / 拼音' },
    ],
    code: (p) => `const results = await sdk.search(${jsStr(p.keyword)});
// 返回: SearchResult[]
console.log(results[0].name);    // 贵州茅台
console.log(results[0].code);    // sh600519
console.log(results[0].market);  // sh`,
    run: (sdk, params) => sdk.search(params.keyword),
  },
];
