# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-95.88%25-brightgreen.svg)](https://github.com/chengzuopeng/stock-sdk)

轻量级股票行情 SDK，基于腾讯财经 `qt.gtimg.cn` 和东方财富等数据源，支持 A 股、港股、美股、公募基金实时行情及历史 K 线查询。

**✨ 零依赖 | 🌐 浏览器 + Node.js 双端支持 | 📦 ESM + CommonJS**

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [在线演示](https://chengzuopeng.github.io/stock-sdk/)

## 特性

- ✅ **零依赖**，轻量级（压缩后 < 10KB）
- ✅ 支持 **浏览器** 和 **Node.js 18+** 双端运行
- ✅ 同时提供 **ESM** 和 **CommonJS** 两种模块格式
- ✅ 完整的 **TypeScript** 类型定义的单元测试覆盖
- ✅ **A 股、港股、美股、公募基金**实时行情
- ✅ **历史 K 线**（日/周/月）、**分钟 K 线**（1/5/15/30/60 分钟）和**当日分时走势**数据
- ✅ **资金流向**、**盘口大单**等扩展数据
- ✅ 获取全部 **A 股代码列表**（5000+ 只股票）和批量获取**全市场行情**（内置并发控制）

## 安装

```bash
npm install stock-sdk
# 或
yarn add stock-sdk
# 或
pnpm add stock-sdk
```

## 快速开始

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// A 股全量行情
const quotes = await sdk.getFullQuotes(['sz000858', 'sh600519']);
console.log(quotes[0].name, quotes[0].price);

// 历史 K 线
const klines = await sdk.getHistoryKline('000001', { period: 'daily' });

// 当日分时
const timeline = await sdk.getTodayTimeline('sz000001');
```

## API 文档

### 实时行情

| 方法 | 说明 |
|------|------|
| [`getFullQuotes`](#getfullquotescodes-promisefullquote) | A 股/指数全量行情 |
| [`getSimpleQuotes`](#getsimplequotescodes-promisesimplequote) | A 股/指数简要行情 |
| [`getHKQuotes`](#gethkquotescodes-promisehkquote) | 港股行情 |
| [`getUSQuotes`](#getusquotescodes-promiseusquote) | 美股行情 |
| [`getFundQuotes`](#getfundquotescodes-promisefundquote) | 公募基金行情 |

### K 线数据

| 方法 | 说明 |
|------|------|
| [`getHistoryKline`](#gethistoryklinesymbol-options-promisehistorykline) | 历史 K 线（日/周/月） |
| [`getMinuteKline`](#getminuteklinesymbol-options-promiseminutetimeline--minutekline) | 分钟 K 线（1/5/15/30/60 分钟） |
| [`getTodayTimeline`](#gettodaytimelinecode-promisetodaytimelineresponse) | 当日分时走势 |

### 扩展数据

| 方法 | 说明 |
|------|------|
| [`getFundFlow`](#getfundflowcodes-promisefundflow) | 资金流向 |
| [`getPanelLargeOrder`](#getpanellargeordercodes-promisepanellargeorder) | 盘口大单占比 |

### 批量查询

| 方法 | 说明 |
|------|------|
| [`getAShareCodeList`](#getasharecodellistincludeexchange-promisestring) | 获取全部 A 股代码 |
| [`getAllAShareQuotes`](#getallasharequotesoptions-promisefullquote) | 获取全市场 A 股行情 |
| [`getAllQuotesByCodes`](#getallquotesbycodescodes-options-promisefullquote) | 批量获取指定股票行情 |

---

### `getFullQuotes(codes): Promise<FullQuote[]>`

获取 A 股/指数全量行情数据。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 股票代码数组，如 `['sz000858', 'sh600519']` |

**返回类型**

```typescript
interface FullQuote {
  marketId: string;       // 市场标识
  name: string;           // 名称
  code: string;           // 股票代码
  price: number;          // 最新价
  prevClose: number;      // 昨收
  open: number;           // 今开
  high: number;           // 最高
  low: number;            // 最低
  volume: number;         // 成交量（手）
  amount: number;         // 成交额（万）
  change: number;         // 涨跌额
  changePercent: number;  // 涨跌幅 %
  bid: { price: number; volume: number }[];  // 买一~买五
  ask: { price: number; volume: number }[];  // 卖一~卖五
  turnoverRate: number | null;   // 换手率 %
  pe: number | null;             // 市盈率（TTM）
  pb: number | null;             // 市净率
  totalMarketCap: number | null; // 总市值（亿）
  circulatingMarketCap: number | null; // 流通市值（亿）
  volumeRatio: number | null;    // 量比
  limitUp: number | null;        // 涨停价
  limitDown: number | null;      // 跌停价
  // ... 更多字段见类型定义
}
```

**示例**

```typescript
const quotes = await sdk.getFullQuotes(['sz000858']);
console.log(quotes[0].name);   // 五 粮 液
console.log(quotes[0].price);  // 111.70
console.log(quotes[0].changePercent);  // 2.35
```

---

### `getSimpleQuotes(codes): Promise<SimpleQuote[]>`

获取简要行情（股票/指数）。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 代码数组，如 `['sz000858', 'sh000001']` |

**返回类型**

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
  marketCap: number | null;
  marketType: string;
}
```

**示例**

```typescript
const quotes = await sdk.getSimpleQuotes(['sh000001']);
console.log(quotes[0].name);  // 上证指数
```

---

### `getHistoryKline(symbol, options?): Promise<HistoryKline[]>`

获取 A 股历史 K 线（日/周/月），数据来源：东方财富。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 股票代码，如 `'000001'` 或 `'sz000001'` |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | K 线周期，默认 `'daily'` |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | 复权类型，默认 `'hfq'`（后复权） |
| `options.startDate` | `string` | 开始日期 `YYYYMMDD` |
| `options.endDate` | `string` | 结束日期 `YYYYMMDD` |

**返回类型**

```typescript
interface HistoryKline {
  date: string;               // 日期 YYYY-MM-DD
  code: string;               // 股票代码
  open: number | null;        // 开盘价
  close: number | null;       // 收盘价
  high: number | null;        // 最高价
  low: number | null;         // 最低价
  volume: number | null;      // 成交量
  amount: number | null;      // 成交额
  changePercent: number | null;  // 涨跌幅 %
  change: number | null;         // 涨跌额
  amplitude: number | null;      // 振幅 %
  turnoverRate: number | null;   // 换手率 %
}
```

**示例**

```typescript
// 获取日线（默认后复权）
const dailyKlines = await sdk.getHistoryKline('000001');

// 获取周线，前复权，指定日期范围
const weeklyKlines = await sdk.getHistoryKline('sz000858', {
  period: 'weekly',
  adjust: 'qfq',
  startDate: '20240101',
  endDate: '20241231',
});
```

---

### `getMinuteKline(symbol, options?): Promise<MinuteTimeline[] | MinuteKline[]>`

获取 A 股分钟 K 线或分时数据，数据来源：东方财富。

> **注意**：`period='1'` 分时数据仅返回近 5 个交易日数据。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 股票代码，如 `'000001'` 或 `'sz000001'` |
| `options.period` | `'1' \| '5' \| '15' \| '30' \| '60'` | K 线周期，默认 `'1'`（分时） |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | 复权类型（仅 5/15/30/60 有效），默认 `'hfq'` |
| `options.startDate` | `string` | 开始时间 `YYYY-MM-DD HH:mm:ss` |
| `options.endDate` | `string` | 结束时间 `YYYY-MM-DD HH:mm:ss` |

**示例**

```typescript
// 获取分时数据
const timeline = await sdk.getMinuteKline('000001');

// 获取 5 分钟 K 线
const kline5m = await sdk.getMinuteKline('sz000858', { period: '5' });
```

---

### `getTodayTimeline(code): Promise<TodayTimelineResponse>`

获取当日分时走势数据，数据来源：腾讯财经。

> **注意**：仅返回当日交易时段数据，成交量和成交额为累计值。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 股票代码，如 `'sz000001'` |

**返回类型**

```typescript
interface TodayTimelineResponse {
  code: string;             // 股票代码
  date: string;             // 交易日期 YYYYMMDD
  data: TodayTimeline[];    // 分时数据列表
}

interface TodayTimeline {
  time: string;      // 时间 HH:mm
  price: number;     // 成交价
  volume: number;    // 累计成交量（股）
  amount: number;    // 累计成交额（元）
  avgPrice: number;  // 当日均价
}
```

**示例**

```typescript
const timeline = await sdk.getTodayTimeline('sz000001');
console.log(timeline.date);              // '20241218'
console.log(timeline.data[0].avgPrice);  // 当日均价
```

---

### `getAShareCodeList(includeExchange?): Promise<string[]>`

获取全部 A 股代码列表（沪市、深市、北交所 5000+ 只股票）。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `includeExchange` | `boolean` | 是否包含交易所前缀，默认 `true` |

**示例**

```typescript
// 包含交易所前缀
const codes = await sdk.getAShareCodeList();
// ['sh600000', 'sz000001', 'bj430047', ...]

// 不包含交易所前缀
const pureCodes = await sdk.getAShareCodeList(false);
// ['600000', '000001', '430047', ...]
```

---

### `getAllAShareQuotes(options?): Promise<FullQuote[]>`

获取全市场 A 股实时行情（5000+ 只股票），返回格式同 `getFullQuotes`。

> ⚠️ 如遇超时或报错，可尝试减小 `batchSize`（如设为 `100`）。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.batchSize` | `number` | 单次请求股票数量，默认 `500` |
| `options.concurrency` | `number` | 最大并发数，默认 `7` |
| `options.onProgress` | `(completed, total) => void` | 进度回调 |

**示例**

```typescript
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});
console.log(`共获取 ${allQuotes.length} 只股票`);
```

---

### `getAllQuotesByCodes(codes, options?): Promise<FullQuote[]>`

批量获取指定股票的全量行情，参数同 `getAllAShareQuotes`。

```typescript
const quotes = await sdk.getAllQuotesByCodes(
  ['sz000858', 'sh600519', 'sh600000'],
  { batchSize: 100, concurrency: 2 }
);
```

---

### `getFundFlow(codes): Promise<FundFlow[]>`

获取资金流向数据。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 股票代码数组，如 `['sz000858']` |

**返回类型**

```typescript
interface FundFlow {
  code: string;
  name: string;
  mainInflow: number;     // 主力流入
  mainOutflow: number;    // 主力流出
  mainNet: number;        // 主力净流入
  mainNetRatio: number;   // 主力净流入占比
  retailInflow: number;   // 散户流入
  retailOutflow: number;  // 散户流出
  retailNet: number;      // 散户净流入
  retailNetRatio: number; // 散户净流入占比
  totalFlow: number;      // 总资金流
  date: string;
}
```

---

### `getPanelLargeOrder(codes): Promise<PanelLargeOrder[]>`

获取盘口大单占比。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 股票代码数组，如 `['sz000858']` |

**返回类型**

```typescript
interface PanelLargeOrder {
  buyLargeRatio: number;   // 买盘大单占比
  buySmallRatio: number;   // 买盘小单占比
  sellLargeRatio: number;  // 卖盘大单占比
  sellSmallRatio: number;  // 卖盘小单占比
}
```

---

### `getHKQuotes(codes): Promise<HKQuote[]>`

获取港股行情。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 港股代码数组，如 `['09988', '00700']` |

**示例**

```typescript
const quotes = await sdk.getHKQuotes(['09988']);
console.log(quotes[0].name);  // 阿里巴巴-W
```

---

### `getUSQuotes(codes): Promise<USQuote[]>`

获取美股行情。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 美股代码数组，如 `['BABA', 'AAPL']` |

**示例**

```typescript
const quotes = await sdk.getUSQuotes(['BABA', 'AAPL']);
console.log(quotes[0].code);  // BABA.N
```

---

### `getFundQuotes(codes): Promise<FundQuote[]>`

获取公募基金行情。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 基金代码数组，如 `['000001', '110011']` |

**返回类型**

```typescript
interface FundQuote {
  code: string;
  name: string;
  nav: number;      // 最新单位净值
  accNav: number;   // 累计净值
  change: number;   // 当日涨跌额
  navDate: string;  // 净值日期
}
```

---

### `batchRaw(params): Promise<{ key: string; fields: string[] }[]>`

批量混合查询，返回原始解析结果。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `params` | `string` | 逗号分隔的查询参数，如 `'sz000858,s_sh000001'` |

**示例**

```typescript
const raw = await sdk.batchRaw('sz000858,s_sh000001');
console.log(raw[0].key);     // sz000858
console.log(raw[0].fields);  // ['51', '五 粮 液', '000858', ...]
```

---

## 浏览器使用

SDK 使用原生 `TextDecoder` 解码 GBK 编码数据，无需额外 polyfill。

```html
<script type="module">
  import { StockSDK } from 'https://unpkg.com/stock-sdk/dist/index.js';

  const sdk = new StockSDK();
  const quotes = await sdk.getFullQuotes(['sz000858']);
  console.log(quotes[0].name, quotes[0].price);
</script>
```

---

## 开发

```bash
# 安装依赖
yarn install

# 运行测试
yarn test

# 查看覆盖率
yarn test --coverage

# 构建
yarn build

# 启动调试页面
yarn dev
```

## 许可证

[ISC](./LICENSE)

---

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [在线演示](https://chengzuopeng.github.io/stock-sdk/) | 🐛 [Issues](https://github.com/chengzuopeng/stock-sdk/issues)
