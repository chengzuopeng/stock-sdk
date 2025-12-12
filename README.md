# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)

基于腾讯财经 `qt.gtimg.cn` 非官方接口封装的 TypeScript SDK，支持 A 股、港股、美股、公募基金实时行情查询。

**同时支持浏览器端和 Node.js 端使用。**

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk)

## 特性

- ✅ 零依赖，轻量级（使用原生 fetch 和 TextDecoder）
- ✅ 支持浏览器和 Node.js 18+ 双端运行
- ✅ 同时提供 ESM 和 CommonJS 两种模块格式
- ✅ 完整的 TypeScript 类型定义
- ✅ A 股、港股、美股、公募基金实时行情
- ✅ 资金流向、盘口大单等扩展数据
- ✅ 内置全部 A 股代码列表（5000+）
- ✅ 支持批量获取全市场行情（并发控制）

## 安装

```bash
npm install stock-sdk
# 或
yarn add stock-sdk
```

## 快速开始

```typescript
// ESM (浏览器 / Node.js)
import { StockSDK } from 'stock-sdk';

// CommonJS (Node.js)
// const { StockSDK } = require('stock-sdk');

const sdk = new StockSDK();

// A 股全量行情
const fullQuotes = await sdk.getFullQuotes(['sz000858', 'sh600000']);
console.log(fullQuotes);

// 简要行情（参数格式与 getFullQuotes 相同）
const simpleQuotes = await sdk.getSimpleQuotes(['sz000858', 'sh000001']);
console.log(simpleQuotes);
```

## API 文档

### `getFullQuotes(codes: string[]): Promise<FullQuote[]>`

获取 A 股 / 指数全量行情数据。

**参数**

- `codes` — 股票代码数组，格式 `<market><code>`，如 `['sz000858', 'sh600000']`

**返回**

```typescript
interface FullQuote {
  marketId: string;      // 市场标识
  name: string;          // 名称
  code: string;          // 股票代码
  price: number;         // 最新价
  prevClose: number;     // 昨收
  open: number;          // 今开
  volume: number;        // 成交量(手)
  outerVolume: number;   // 外盘
  innerVolume: number;   // 内盘
  bid: { price: number; volume: number }[];  // 买一~买五
  ask: { price: number; volume: number }[];  // 卖一~卖五
  time: string;          // 时间戳 yyyyMMddHHmmss
  change: number;        // 涨跌额
  changePercent: number; // 涨跌幅%
  high: number;          // 最高
  low: number;           // 最低
  volume2: number;       // 成交量(手)
  amount: number;        // 成交额(万)
  turnoverRate: number | null;  // 换手率%
  pe: number | null;            // 市盈率(TTM)
  amplitude: number | null;     // 振幅%
  circulatingMarketCap: number | null;  // 流通市值(亿)
  totalMarketCap: number | null;        // 总市值(亿)
  pb: number | null;            // 市净率
  limitUp: number | null;       // 涨停价
  limitDown: number | null;     // 跌停价
  volumeRatio: number | null;   // 量比
  avgPrice: number | null;      // 均价
  peStatic: number | null;      // 市盈率(静)
  peDynamic: number | null;     // 市盈率(动)
  high52w: number | null;       // 52周最高价
  low52w: number | null;        // 52周最低价
  circulatingShares: number | null;  // 流通股本(股)
  totalShares: number | null;        // 总股本(股)
  raw: string[];                // 原始字段数组
}
```

**示例**

```typescript
const quotes = await sdk.getFullQuotes(['sz000858']);
console.log(quotes[0].name);  // 五 粮 液
console.log(quotes[0].price); // 111.70
```

---

### `getAllAShareQuotes(options?): Promise<FullQuote[]>`

获取全部 A 股实时行情（使用内置股票代码列表，包含 5000+ 只股票）。

返回的每只股票数据格式与 `getFullQuotes` 相同。

**参数**

- `options` — 可选配置对象
  - `batchSize` — 单次请求的股票数量，默认 `700`
  - `concurrency` — 最大并发请求数，默认 `7`
  - `onProgress` — 进度回调函数 `(completed: number, total: number) => void`

**示例**

```typescript
// 获取全部 A 股行情
const allQuotes = await sdk.getAllAShareQuotes();
console.log(`共获取 ${allQuotes.length} 只股票行情`);

// 自定义配置
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 500,      // 每次请求 500 只
  concurrency: 3,      // 最多 3 个并发
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});
```

---

### `getAllQuotesByCodes(codes, options?): Promise<FullQuote[]>`

批量获取指定股票的全量行情（支持自定义股票列表）。

返回的每只股票数据格式与 `getFullQuotes` 相同。

**参数**

- `codes` — 股票代码数组
- `options` — 可选配置对象（同 `getAllAShareQuotes`）

**示例**

```typescript
const codes = ['sz000858', 'sh600000', 'sh600519', /* ... */];
const quotes = await sdk.getAllQuotesByCodes(codes, {
  batchSize: 100,
  concurrency: 2,
});
```

---

### `getSimpleQuotes(codes: string[]): Promise<SimpleQuote[]>`

获取简要行情（股票 / 指数）。

**参数**

- `codes` — 代码数组，格式与 `getFullQuotes` 相同，如 `['sz000858', 'sh000001']`

**返回**

```typescript
interface SimpleQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  marketCap: number | null;  // 总市值(亿)
  marketType: string;        // 如 GP-A / ZS
  raw: string[];
}
```

**示例**

```typescript
const quotes = await sdk.getSimpleQuotes(['sh000001']);
console.log(quotes[0].name);  // 上证指数
```

---

### `getFundFlow(codes: string[]): Promise<FundFlow[]>`

获取资金流向数据。

**参数**

- `codes` — 代码数组，格式 `ff_<market><code>`，如 `['ff_sz000858']`

**返回**

```typescript
interface FundFlow {
  code: string;
  mainInflow: number;    // 主力流入
  mainOutflow: number;   // 主力流出
  mainNet: number;       // 主力净流入
  mainNetRatio: number;  // 主力净流入占比
  retailInflow: number;  // 散户流入
  retailOutflow: number; // 散户流出
  retailNet: number;     // 散户净流入
  retailNetRatio: number;// 散户净流入占比
  totalFlow: number;     // 总资金流
  name: string;
  date: string;
  raw: string[];
}
```

**示例**

```typescript
const flows = await sdk.getFundFlow(['ff_sz000858']);
console.log(flows[0].mainNet);
```

---

### `getPanelLargeOrder(codes: string[]): Promise<PanelLargeOrder[]>`

获取盘口大单占比。

**参数**

- `codes` — 代码数组，格式 `s_pk<market><code>`，如 `['s_pksz000858']`

**返回**

```typescript
interface PanelLargeOrder {
  buyLargeRatio: number;   // 买盘大单占比
  buySmallRatio: number;   // 买盘小单占比
  sellLargeRatio: number;  // 卖盘大单占比
  sellSmallRatio: number;  // 卖盘小单占比
  raw: string[];
}
```

**示例**

```typescript
const orders = await sdk.getPanelLargeOrder(['s_pksz000858']);
console.log(orders[0].buyLargeRatio);
```

---

### `getHKQuotes(codes: string[]): Promise<HKQuote[]>`

获取港股扩展行情。

**参数**

- `codes` — 代码数组，格式 `r_hk<code>`，如 `['r_hk09988']`

**返回**

```typescript
interface HKQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  prevClose: number;
  open: number;
  volume: number;
  time: string;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  amount: number;
  lotSize: number | null;
  circulatingMarketCap: number | null;
  totalMarketCap: number | null;
  currency: string;
  raw: string[];
}
```

**示例**

```typescript
const quotes = await sdk.getHKQuotes(['r_hk09988']);
console.log(quotes[0].name);  // 阿里巴巴-W
```

---

### `getUSQuotes(codes: string[]): Promise<USQuote[]>`

获取美股简要行情。

**参数**

- `codes` — 代码数组，格式 `s_us<code>`，如 `['s_usBABA']`

**返回**

```typescript
interface USQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  marketCap: number | null;
  raw: string[];
}
```

**示例**

```typescript
const quotes = await sdk.getUSQuotes(['s_usBABA']);
console.log(quotes[0].code);  // BABA.N
```

---

### `getFundQuotes(codes: string[]): Promise<FundQuote[]>`

获取公募基金行情。

**参数**

- `codes` — 代码数组，格式 `jj<六位代码>`，如 `['jj000001']`

**返回**

```typescript
interface FundQuote {
  code: string;
  name: string;
  nav: number;       // 最新单位净值
  accNav: number;    // 累计净值
  change: number;    // 当日涨跌额
  navDate: string;   // 净值日期
  raw: string[];
}
```

**示例**

```typescript
const funds = await sdk.getFundQuotes(['jj000001']);
console.log(funds[0].name);  // 华夏成长混合
```

---

### `batchRaw(params: string): Promise<{ key: string; fields: string[] }[]>`

批量混合查询，返回原始解析结果。

**参数**

- `params` — 逗号分隔的多个查询参数，如 `'sz000858,s_sh000001,jj000001'`

**返回**

```typescript
{ key: string; fields: string[] }[]
```

**示例**

```typescript
const raw = await sdk.batchRaw('sz000858,s_sh000001');
console.log(raw[0].key);    // sz000858
console.log(raw[0].fields); // ['51', '五 粮 液', '000858', ...]
```

---

### `codeList`

导出的全部 A 股代码列表（包含沪市、深市、北交所）。

```typescript
import { codeList } from 'stock-sdk';

console.log(codeList.length);  // 5000+
console.log(codeList[0]);      // 'bj920000'
```

---

## 浏览器使用说明

在浏览器端使用时，SDK 会自动使用浏览器原生的 `TextDecoder` 来解码 GBK 编码的响应数据，无需额外的 polyfill。

```html
<script type="module">
  import { StockSDK } from 'https://unpkg.com/stock-sdk/dist/index.js';
  
  const sdk = new StockSDK();
  const quotes = await sdk.getFullQuotes(['sz000858']);
  console.log(quotes[0].name, quotes[0].price);
</script>
```

## 开发

```bash
# 安装依赖
yarn install

# 运行测试
yarn test

# 构建
yarn build
```

## 许可证

ISC
