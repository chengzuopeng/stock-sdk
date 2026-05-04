import type { MethodSpec } from '../types';
import { splitCsvCodes, jsCsvArray } from '../utils';

export const quotesMethods: MethodSpec[] = [
  {
    name: 'getFullQuotes',
    desc: '获取 A 股/指数全量行情',
    category: 'quotes',
    params: [
      {
        key: 'codes',
        label: '股票代码',
        type: 'text',
        default: 'sz000858,sh600519',
        required: true,
        placeholder: '多个用逗号分隔，如 sz000858,sh600519',
      },
    ],
    code: (p) => `const quotes = await sdk.getFullQuotes(${jsCsvArray(p.codes)});
// 返回: FullQuote[]
console.log(quotes[0].name);   // 五 粮 液
console.log(quotes[0].price);  // 111.70`,
    run: (sdk, params) => sdk.getFullQuotes(splitCsvCodes(params.codes)),
  },
  {
    name: 'getSimpleQuotes',
    desc: '获取简要行情',
    category: 'quotes',
    params: [
      {
        key: 'codes',
        label: '股票代码',
        type: 'text',
        default: 'sz000858,sh000001',
        required: true,
        placeholder: '多个用逗号分隔',
      },
    ],
    code: (p) => `const quotes = await sdk.getSimpleQuotes(${jsCsvArray(p.codes)});
// 返回: SimpleQuote[]
console.log(quotes[0].name);  // 五 粮 液`,
    run: (sdk, params) => sdk.getSimpleQuotes(splitCsvCodes(params.codes)),
  },
  {
    name: 'getHKQuotes',
    desc: '获取港股行情',
    category: 'quotes',
    params: [
      {
        key: 'codes',
        label: '港股代码',
        type: 'text',
        default: '09988,00700',
        required: true,
        placeholder: '如 09988, 00700',
      },
    ],
    code: (p) => `const quotes = await sdk.getHKQuotes(${jsCsvArray(p.codes)});
// 返回: HKQuote[]
console.log(quotes[0].name);  // 阿里巴巴-W`,
    run: (sdk, params) => sdk.getHKQuotes(splitCsvCodes(params.codes)),
  },
  {
    name: 'getUSQuotes',
    desc: '获取美股行情',
    category: 'quotes',
    params: [
      {
        key: 'codes',
        label: '美股代码',
        type: 'text',
        default: 'AAPL,MSFT,BABA',
        required: true,
        placeholder: '如 BABA, AAPL',
      },
    ],
    code: (p) => `const quotes = await sdk.getUSQuotes(${jsCsvArray(p.codes)});
// 返回: USQuote[]
console.log(quotes[0].code);  // BABA.N`,
    run: (sdk, params) => sdk.getUSQuotes(splitCsvCodes(params.codes)),
  },
  {
    name: 'getFundQuotes',
    desc: '获取公募基金行情',
    category: 'quotes',
    params: [
      {
        key: 'codes',
        label: '基金代码',
        type: 'text',
        default: '000001,110011',
        required: true,
        placeholder: '如 000001, 110011',
      },
    ],
    code: (p) => `const funds = await sdk.getFundQuotes(${jsCsvArray(p.codes)});
// 返回: FundQuote[]
console.log(funds[0].name);  // 华夏成长混合
console.log(funds[0].nav);   // 最新净值`,
    run: (sdk, params) => sdk.getFundQuotes(splitCsvCodes(params.codes)),
  },
];
