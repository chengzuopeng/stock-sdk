import type { MethodSpec, RunContext } from '../types';
import {
  A_SHARE_MARKET_OPTIONS,
  US_MARKET_OPTIONS,
  jsObject,
  jsStr,
  jsCsvArray,
  splitCsvCodes,
} from '../utils';

function progressFor(ctx: RunContext) {
  return (completed: number, total: number) => {
    ctx.onProgress?.(`加载中... ${completed}/${total} 批次`);
  };
}

/**
 * 把 simple/market 这类可选过滤参数渲染成 `getXxxCodeList()` 或
 * `getXxxCodeList({ simple: true, market: 'kc' })`。
 */
function renderCodeListCall(method: string, p: Record<string, string>): string {
  const opts: Record<string, unknown> = {};
  if (p.simple === 'true') opts.simple = true;
  if (p.market) opts.market = p.market;
  if (Object.keys(opts).length === 0) {
    return `await sdk.${method}()`;
  }
  // simple 是 boolean，market 是字符串，需要分开处理引号
  const optStr = jsObject(opts, new Set(['market']));
  return `await sdk.${method}(${optStr})`;
}

/** 渲染 getAllXxxQuotes 的 options 字面量（带 onProgress 注释） */
function renderAllQuotesCall(method: string, p: Record<string, string>, hasMarket: boolean): string {
  const opts: Record<string, unknown> = {};
  if (hasMarket && p.market) opts.market = p.market;
  if (p.batchSize) opts.batchSize = parseInt(p.batchSize) || undefined;
  if (p.concurrency) opts.concurrency = parseInt(p.concurrency) || undefined;
  const optStr = jsObject(opts, hasMarket ? new Set(['market']) : new Set());
  return `await sdk.${method}(${optStr})`;
}

export const batchMethods: MethodSpec[] = [
  {
    name: 'getAShareCodeList',
    desc: '获取全部 A 股代码',
    category: 'batch',
    params: [
      {
        key: 'simple',
        label: '简化代码（不含前缀）',
        type: 'select',
        default: 'false',
        options: [
          { value: 'false', label: '否' },
          { value: 'true', label: '是' },
        ],
      },
      { key: 'market', label: '市场筛选', type: 'select', default: '', options: A_SHARE_MARKET_OPTIONS },
    ],
    code: (p) => `const codes = ${renderCodeListCall('getAShareCodeList', p)};
// ['sh600000', 'sz000001', 'bj920001', ...]`,
    run: (sdk, params) => {
      const options: any = {};
      if (params.simple === 'true') options.simple = true;
      if (params.market) options.market = params.market;
      return sdk.getAShareCodeList(Object.keys(options).length > 0 ? options : undefined);
    },
  },
  {
    name: 'getHKCodeList',
    desc: '获取全部港股代码',
    category: 'batch',
    params: [],
    code: () => `const codes = await sdk.getHKCodeList();
console.log(codes[0]);  // '00700'`,
    run: (sdk) => sdk.getHKCodeList(),
  },
  {
    name: 'getFundCodeList',
    desc: '获取全部基金代码',
    category: 'batch',
    params: [],
    code: () => `const codes = await sdk.getFundCodeList();
console.log(codes.length);  // 26068
console.log(codes.slice(0, 5));  // ['000001', '000002', ...]`,
    run: (sdk) => sdk.getFundCodeList(),
  },
  {
    name: 'getUSCodeList',
    desc: '获取全部美股代码',
    category: 'batch',
    params: [
      {
        key: 'simple',
        label: '简化代码（不含前缀）',
        type: 'select',
        default: 'false',
        options: [
          { value: 'false', label: '否' },
          { value: 'true', label: '是' },
        ],
      },
      { key: 'market', label: '市场筛选', type: 'select', default: '', options: US_MARKET_OPTIONS },
    ],
    code: (p) => `const codes = ${renderCodeListCall('getUSCodeList', p)};
// ['105.MSFT', '106.BABA', ...]`,
    run: (sdk, params) => {
      const options: any = {};
      if (params.simple === 'true') options.simple = true;
      if (params.market) options.market = params.market;
      return sdk.getUSCodeList(Object.keys(options).length > 0 ? options : undefined);
    },
  },
  {
    name: 'getAllAShareQuotes',
    desc: '获取全市场 A 股行情',
    category: 'batch',
    params: [
      { key: 'market', label: '市场筛选', type: 'select', default: '', options: A_SHARE_MARKET_OPTIONS },
      { key: 'batchSize', label: '批量大小', type: 'number', default: '500', placeholder: '默认 500' },
      { key: 'concurrency', label: '并发数', type: 'number', default: '7', placeholder: '默认 7' },
    ],
    code: (p) => `const allQuotes = ${renderAllQuotesCall('getAllAShareQuotes', p, true)};
// 实际场景建议带 onProgress 回调跟踪进度
console.log(\`共 \${allQuotes.length} 只\`);`,
    run: (sdk, params, ctx) => {
      const options: any = {
        batchSize: parseInt(params.batchSize) || 500,
        concurrency: parseInt(params.concurrency) || 7,
        onProgress: progressFor(ctx),
      };
      if (params.market) options.market = params.market;
      return sdk.getAllAShareQuotes(options);
    },
  },
  {
    name: 'getAllHKShareQuotes',
    desc: '获取全市场港股行情',
    category: 'batch',
    params: [
      { key: 'batchSize', label: '批量大小', type: 'number', default: '300', placeholder: '默认 500' },
      { key: 'concurrency', label: '并发数', type: 'number', default: '5', placeholder: '默认 7' },
    ],
    code: (p) => `const allHKQuotes = ${renderAllQuotesCall('getAllHKShareQuotes', p, false)};
console.log(\`共获取 \${allHKQuotes.length} 只港股\`);
console.log(allHKQuotes[0].name);      // 股票名称
console.log(allHKQuotes[0].currency);  // 货币(HKD)`,
    run: (sdk, params, ctx) =>
      sdk.getAllHKShareQuotes({
        batchSize: parseInt(params.batchSize) || 300,
        concurrency: parseInt(params.concurrency) || 5,
        onProgress: progressFor(ctx),
      }),
  },
  {
    name: 'getAllUSShareQuotes',
    desc: '获取全市场美股行情',
    category: 'batch',
    params: [
      { key: 'market', label: '市场筛选', type: 'select', default: '', options: US_MARKET_OPTIONS },
      { key: 'batchSize', label: '批量大小', type: 'number', default: '300', placeholder: '默认 500' },
      { key: 'concurrency', label: '并发数', type: 'number', default: '5', placeholder: '默认 7' },
    ],
    code: (p) => `const allUSQuotes = ${renderAllQuotesCall('getAllUSShareQuotes', p, true)};
console.log(\`共获取 \${allUSQuotes.length} 只美股\`);
console.log(allUSQuotes[0].name);      // 股票名称`,
    run: (sdk, params, ctx) => {
      const options: any = {
        batchSize: parseInt(params.batchSize) || 300,
        concurrency: parseInt(params.concurrency) || 5,
        onProgress: progressFor(ctx),
      };
      if (params.market) options.market = params.market;
      return sdk.getAllUSShareQuotes(options);
    },
  },
  {
    name: 'getAllQuotesByCodes',
    desc: '按指定代码列表批量获取 A 股完整行情',
    category: 'batch',
    params: [
      {
        key: 'codes',
        label: '股票代码',
        type: 'text',
        default: 'sh600519,sz000858,sh601318,sz000001',
        required: true,
        placeholder: '多个用逗号分隔',
      },
      { key: 'batchSize', label: '批量大小', type: 'number', default: '500', placeholder: '默认 500' },
      { key: 'concurrency', label: '并发数', type: 'number', default: '7', placeholder: '默认 7' },
    ],
    code: (p) => {
      const opts = jsObject({
        batchSize: parseInt(p.batchSize) || undefined,
        concurrency: parseInt(p.concurrency) || undefined,
      });
      return `const quotes = await sdk.getAllQuotesByCodes(${jsCsvArray(p.codes)}, ${opts});
console.log(\`共获取 \${quotes.length} 只\`);
console.log(quotes[0].name);   // 股票名称
console.log(quotes[0].price);  // 当前价`;
    },
    run: (sdk, params, ctx) =>
      sdk.getAllQuotesByCodes(splitCsvCodes(params.codes), {
        batchSize: parseInt(params.batchSize) || 500,
        concurrency: parseInt(params.concurrency) || 7,
        onProgress: progressFor(ctx),
      }),
  },
  {
    name: 'batchRaw',
    desc: '腾讯批量行情原始接口（高级用法，返回未解析字段）',
    category: 'batch',
    params: [
      {
        key: 'params',
        label: '查询字符串',
        type: 'text',
        default: 'sh600519,sz000858',
        required: true,
        placeholder: '逗号拼接的代码字符串，如 sh600519,sz000858',
      },
    ],
    code: (p) => `const raw = await sdk.batchRaw(${jsStr(p.params)});
// 返回 [{ key: 'sh600519', fields: ['51', '贵州茅台', ...] }, ...]
console.log(raw[0].key);
console.log(raw[0].fields.length);  // 通常 50+ 字段`,
    run: (sdk, params) => sdk.batchRaw(params.params),
  },
];
