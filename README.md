# Stock SDK

[![npm version](https://img.shields.io/npm/v/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![npm downloads](https://img.shields.io/npm/dm/stock-sdk.svg)](https://www.npmjs.com/package/stock-sdk)
[![license](https://img.shields.io/npm/l/stock-sdk)](https://github.com/chengzuopeng/stock-sdk/blob/master/LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-95.88%25-brightgreen.svg)](https://github.com/chengzuopeng/stock-sdk)

**[English](./README_EN.md)** | 中文

为 **前端和 Node.js 设计的股票行情 SDK**。

无需 Python、无需后端服务，直接在 **浏览器或 Node.js** 中获取 **A 股 / 港股 / 美股 / 公募基金** 的实时行情与 K 线数据。

**✨ 零依赖 | 🌐 Browser + Node.js | 📦 <10KB | 🧠 完整 TypeScript 类型**

📦 [NPM](https://www.npmjs.com/package/stock-sdk) | 📖 [GitHub](https://github.com/chengzuopeng/stock-sdk) | 🎮 [在线演示](https://chengzuopeng.github.io/stock-sdk/)

## Why stock-sdk？

如果你是前端工程师，可能遇到过这些问题：

* 股票行情工具大多是 **Python 生态**，前端难以直接使用
* 想做行情看板 / Demo，不想额外维护后端服务
* 财经接口返回格式混乱、编码复杂（GBK / 并发 / 批量）
* AkShare 很强，但并不适合浏览器或 Node.js 项目

**stock-sdk 的目标很简单：**

> 让前端工程师，用最熟悉的 JavaScript / TypeScript，优雅地获取股票行情数据。

---

## 使用场景

* 📊 股票行情看板（Web / Admin）
* 📈 数据可视化（ECharts / TradingView）
* 🎓 股票 / 金融课程 Demo
* 🧪 量化策略原型验证（JS / Node）
* 🕒 Node.js 定时抓取行情数据

---

## 特性

- ✅ **零依赖**，轻量级（压缩后 < 20KB）
- ✅ 支持 **浏览器** 和 **Node.js 18+** 双端运行
- ✅ 同时提供 **ESM** 和 **CommonJS** 两种模块格式
- ✅ 完整的 **TypeScript** 类型定义和单元测试覆盖
- ✅ **A 股、港股、美股、公募基金**实时行情
- ✅ **历史 K 线**（日/周/月）、**分钟 K 线**（1/5/15/30/60 分钟）和**当日分时走势**数据
- ✅ **技术指标**：内置 MA、MACD、BOLL、KDJ、RSI、WR 等常用指标计算
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

## 快速开始（10 行 Demo）

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const quotes = await sdk.getSimpleQuotes([
  'sh000001',
  'sz000858',
  'sh600519',
]);

quotes.forEach(q => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});
```

## 示例：全市场 A 股行情

前端直接一次性获取全市场 A 股行情（5000+股票），无需 Python 或后端服务。

```ts
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});

console.log(`共获取 ${allQuotes.length} 只股票`);
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
| [`getHistoryKline`](#gethistoryklinesymbol-options-promisehistorykline) | A 股历史 K 线（日/周/月） |
| [`getHKHistoryKline`](#gethkhistoryklinesymbol-options-promisehkushistorykline) | 港股历史 K 线（日/周/月） |
| [`getUSHistoryKline`](#getushistoryklinesymbol-options-promisehkushistorykline) | 美股历史 K 线（日/周/月） |
| [`getMinuteKline`](#getminuteklinesymbol-options-promiseminutetimeline--minutekline) | A 股分钟 K 线（1/5/15/30/60 分钟） |
| [`getTodayTimeline`](#gettodaytimelinecode-promisetodaytimelineresponse) | A 股当日分时走势 |

### 技术指标

| 方法 | 说明 |
|------|------|
| [`getKlineWithIndicators`](#getklinewithindicatorssymbol-options-promiseklinewithindicators) | 获取带技术指标的 K 线数据 |
| [`calcMA`](#calcmadata-options-maresult) | 计算均线（SMA/EMA/WMA） |
| [`calcMACD`](#calcmacddata-options-macdresult) | 计算 MACD |
| [`calcBOLL`](#calcbolldata-options-bollresult) | 计算布林带 |
| [`calcKDJ`](#calckdjdata-options-kdjresult) | 计算 KDJ |
| [`calcRSI`](#calcrsidata-options-rsiresult) | 计算 RSI |
| [`calcWR`](#calcwrdata-options-wrresult) | 计算威廉指标 |
| [`calcBIAS`](#calcbiasdata-options-biasresult) | 计算乖离率 |
| [`calcCCI`](#calcccidata-options-cciresult) | 计算商品通道指数 |
| [`calcATR`](#calcatrdata-options-atrresult) | 计算平均真实波幅 |

### 扩展数据

| 方法 | 说明 |
|------|------|
| [`getFundFlow`](#getfundflowcodes-promisefundflow) | 资金流向 |
| [`getPanelLargeOrder`](#getpanellargeordercodes-promisepanellargeorder) | 盘口大单占比 |

### 批量查询

| 方法 | 说明 |
|------|------|
| [`getAShareCodeList`](#getasharecodellistincludeexchange-promisestring) | 获取全部 A 股代码 |
| [`getUSCodeList`](#getuscodelistincludemarket-promisestring) | 获取全部美股代码 |
| [`getHKCodeList`](#gethkcodelist-promisestring) | 获取全部港股代码 |
| [`getAllAShareQuotes`](#getallasharequotesoptions-promisefullquote) | 获取全市场 A 股行情 |
| [`getAllHKShareQuotes`](#getallhksharequotesoptions-promisehkquote) | 获取全市场港股行情 |
| [`getAllUSShareQuotes`](#getallusssharequotesoptions-promiseusquote) | 获取全市场美股行情 |
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
  outerVolume: number;    // 外盘
  innerVolume: number;    // 内盘
  bid: { price: number; volume: number }[];  // 买一~买五
  ask: { price: number; volume: number }[];  // 卖一~卖五
  time: string;           // 时间戳 yyyyMMddHHmmss
  change: number;         // 涨跌额
  changePercent: number;  // 涨跌幅 %
  volume2: number;        // 成交量（手，字段36）
  amount: number;         // 成交额（万）
  turnoverRate: number | null;   // 换手率 %
  pe: number | null;             // 市盈率（TTM）
  amplitude: number | null;      // 振幅 %
  circulatingMarketCap: number | null; // 流通市值（亿）
  totalMarketCap: number | null; // 总市值（亿）
  pb: number | null;             // 市净率
  limitUp: number | null;        // 涨停价
  limitDown: number | null;      // 跌停价
  volumeRatio: number | null;    // 量比
  avgPrice: number | null;       // 均价
  peStatic: number | null;       // 市盈率（静）
  peDynamic: number | null;      // 市盈率（动）
  high52w: number | null;        // 52周最高价
  low52w: number | null;         // 52周最低价
  circulatingShares: number | null; // 流通股本（股）
  totalShares: number | null;    // 总股本（股）
  raw: string[];                 // 原始字段数组（供扩展使用）
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

### `getHKHistoryKline(symbol, options?): Promise<HKUSHistoryKline[]>`

获取港股历史 K 线（日/周/月），数据来源：东方财富。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 港股代码，5 位数字（如 `'00700'`、`'09988'`） |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | K 线周期，默认 `'daily'` |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | 复权类型，默认 `'hfq'`（后复权） |
| `options.startDate` | `string` | 开始日期 `YYYYMMDD` |
| `options.endDate` | `string` | 结束日期 `YYYYMMDD` |

**返回类型**

```typescript
interface HKUSHistoryKline {
  date: string;               // 日期 YYYY-MM-DD
  code: string;               // 股票代码
  name: string;               // 股票名称
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
// 获取腾讯控股日 K 线
const klines = await sdk.getHKHistoryKline('00700');

// 获取阿里巴巴周 K 线，前复权
const weeklyKlines = await sdk.getHKHistoryKline('09988', {
  period: 'weekly',
  adjust: 'qfq',
  startDate: '20240101',
  endDate: '20241231',
});
console.log(klines[0].name);   // 腾讯控股
console.log(klines[0].close);  // 收盘价
```

---

### `getUSHistoryKline(symbol, options?): Promise<HKUSHistoryKline[]>`

获取美股历史 K 线（日/周/月），数据来源：东方财富。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 美股代码，格式：`{market}.{ticker}`（如 `'105.MSFT'`、`'106.BABA'`） |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | K 线周期，默认 `'daily'` |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | 复权类型，默认 `'hfq'`（后复权） |
| `options.startDate` | `string` | 开始日期 `YYYYMMDD` |
| `options.endDate` | `string` | 结束日期 `YYYYMMDD` |

**市场代码说明**

| 代码 | 说明 | 示例 |
|------|------|------|
| `105` | 纳斯达克 | `105.AAPL`（苹果）、`105.MSFT`（微软）、`105.TSLA`（特斯拉） |
| `106` | 纽交所 | `106.BABA`（阿里巴巴） |
| `107` | 美国其他 | `107.XXX` |

**示例**

```typescript
// 获取微软日 K 线
const klines = await sdk.getUSHistoryKline('105.MSFT');

// 获取苹果周 K 线，前复权
const weeklyKlines = await sdk.getUSHistoryKline('105.AAPL', {
  period: 'weekly',
  adjust: 'qfq',
  startDate: '20240101',
  endDate: '20241231',
});
console.log(klines[0].name);   // 微软
console.log(klines[0].close);  // 收盘价

// 获取阿里巴巴月 K 线
const monthlyKlines = await sdk.getUSHistoryKline('106.BABA', {
  period: 'monthly',
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

### `getUSCodeList(includeMarket?): Promise<string[]>`

获取全部美股代码列表。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `includeMarket` | `boolean` | 是否包含市场前缀（如 `105.`），默认 `true` |

**示例**

```typescript
// 包含市场前缀
const codes = await sdk.getUSCodeList();
// ['105.MSFT', '105.AAPL', '106.BABA', ...]

// 不包含市场前缀
const pureCodes = await sdk.getUSCodeList(false);
// ['MSFT', 'AAPL', 'BABA', ...]
```

> 市场代码说明：`105` = 纳斯达克，`106` = 纽交所，`107` = 其他

---

### `getHKCodeList(): Promise<string[]>`

获取全部港股代码列表。

**示例**

```typescript
const codes = await sdk.getHKCodeList();
// ['00700', '09988', '03690', ...]
```

---

### `getAllAShareQuotes(options?): Promise<FullQuote[]>`

获取全市场 A 股实时行情（5000+ 只股票），返回格式同 `getFullQuotes`。

> ⚠️ 如遇超时或报错，可尝试减小 `batchSize`（如设为 `100`）。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.batchSize` | `number` | 单次请求股票数量，默认 `500`，最大 `500` |
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

### `getAllHKShareQuotes(options?): Promise<HKQuote[]>`

获取全市场港股实时行情，返回格式同 `getHKQuotes`。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.batchSize` | `number` | 单次请求股票数量，默认 `500`，最大 `500` |
| `options.concurrency` | `number` | 最大并发数，默认 `7` |
| `options.onProgress` | `(completed, total) => void` | 进度回调 |

**示例**

```typescript
const allHKQuotes = await sdk.getAllHKShareQuotes({
  batchSize: 300,
  concurrency: 3,
});
console.log(`共获取 ${allHKQuotes.length} 只港股`);
```

---

### `getAllUSShareQuotes(options?): Promise<USQuote[]>`

获取全市场美股实时行情，返回格式同 `getUSQuotes`。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `options.batchSize` | `number` | 单次请求股票数量，默认 `500`，最大 `500` |
| `options.concurrency` | `number` | 最大并发数，默认 `7` |
| `options.onProgress` | `(completed, total) => void` | 进度回调 |

**示例**

```typescript
const allUSQuotes = await sdk.getAllUSShareQuotes({
  batchSize: 300,
  concurrency: 3,
});
console.log(`共获取 ${allUSQuotes.length} 只美股`);
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

**返回类型**

```typescript
interface USQuote {
  marketId: string;              // 市场标识
  name: string;                  // 名称
  code: string;                  // 股票代码
  price: number;                 // 最新价
  prevClose: number;             // 昨收
  open: number;                  // 今开
  volume: number;                // 成交量
  time: string;                  // 时间
  change: number;                // 涨跌额
  changePercent: number;         // 涨跌幅%
  high: number;                  // 最高
  low: number;                   // 最低
  amount: number;                // 成交额
  turnoverRate: number | null;   // 换手率%
  pe: number | null;             // 市盈率
  amplitude: number | null;      // 振幅%
  totalMarketCap: number | null; // 总市值(亿)
  pb: number | null;             // 市净率
  high52w: number | null;        // 52周最高价
  low52w: number | null;         // 52周最低价
  raw: string[];                 // 原始字段数组
}
```

**示例**

```typescript
const quotes = await sdk.getUSQuotes(['AAPL', 'MSFT']);
console.log(quotes[0].code);        // AAPL.OQ
console.log(quotes[0].price);       // 270.97
console.log(quotes[0].high52w);     // 288.62
console.log(quotes[0].low52w);      // 168.64
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

## 技术指标

### `getKlineWithIndicators(symbol, options): Promise<KlineWithIndicators[]>`

获取带技术指标的 K 线数据。支持 A 股、港股、美股，自动识别市场。

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `symbol` | `string` | 股票代码 |
| `options.market` | `'A' \| 'HK' \| 'US'` | 可选，市场类型（不传则自动识别） |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | 可选，K 线周期，默认 `'daily'` |
| `options.adjust` | `'' \| 'qfq' \| 'hfq'` | 可选，复权类型，默认 `'hfq'` |
| `options.startDate` | `string` | 可选，开始日期 `YYYYMMDD` |
| `options.endDate` | `string` | 可选，结束日期 `YYYYMMDD` |
| `options.indicators` | `IndicatorOptions` | 技术指标配置 |

**indicators 配置**

```typescript
interface IndicatorOptions {
  ma?: MAOptions | boolean;    // 均线
  macd?: MACDOptions | boolean; // MACD
  boll?: BOLLOptions | boolean; // 布林带
  kdj?: KDJOptions | boolean;   // KDJ
  rsi?: RSIOptions | boolean;   // RSI
  wr?: WROptions | boolean;     // WR
}

// 各指标可选参数
interface MAOptions {
  periods?: number[];  // 周期数组，默认 [5, 10, 20, 30, 60, 120, 250]
  type?: 'sma' | 'ema' | 'wma';  // 均线类型，默认 'sma'
}

interface MACDOptions {
  short?: number;   // 短期 EMA 周期，默认 12
  long?: number;    // 长期 EMA 周期，默认 26
  signal?: number;  // 信号线周期，默认 9
}

interface BOLLOptions {
  period?: number;  // 均线周期，默认 20
  stdDev?: number;  // 标准差倍数，默认 2
}

interface KDJOptions {
  period?: number;   // RSV 周期，默认 9
  kPeriod?: number;  // K 平滑周期，默认 3
  dPeriod?: number;  // D 平滑周期，默认 3
}

interface RSIOptions {
  periods?: number[];  // 周期数组，默认 [6, 12, 24]
}

interface WROptions {
  periods?: number[];  // 周期数组，默认 [6, 10]
}

interface BIASOptions {
  periods?: number[];  // 周期数组，默认 [6, 12, 24]
}

interface CCIOptions {
  period?: number;  // 周期，默认 14
}

interface ATROptions {
  period?: number;  // 周期，默认 14
}
```

**示例**

```typescript
// 获取平安银行带技术指标的日 K 线
const data = await sdk.getKlineWithIndicators('sz000001', {
  startDate: '20240101',
  endDate: '20241231',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    kdj: true,
    rsi: { periods: [6, 12] },
    wr: true,
    bias: { periods: [6, 12, 24] },
    cci: { period: 14 },
    atr: { period: 14 },
  }
});

// 使用数据
data.forEach(k => {
  console.log(`${k.date}: ${k.close}`);
  console.log(`  MA5=${k.ma?.ma5}, MA10=${k.ma?.ma10}`);
  console.log(`  MACD: DIF=${k.macd?.dif}, DEA=${k.macd?.dea}`);
  console.log(`  BOLL: 上=${k.boll?.upper}, 中=${k.boll?.mid}, 下=${k.boll?.lower}`);
  console.log(`  KDJ: K=${k.kdj?.k}, D=${k.kdj?.d}, J=${k.kdj?.j}`);
  console.log(`  RSI6=${k.rsi?.rsi6}, WR6=${k.wr?.wr6}`);
  console.log(`  BIAS6=${k.bias?.bias6}, CCI=${k.cci?.cci}, ATR=${k.atr?.atr}`);
});

// 港股（自动识别）
const hkData = await sdk.getKlineWithIndicators('00700', {
  indicators: { ma: true, macd: true }
});

// 美股（自动识别）
const usData = await sdk.getKlineWithIndicators('105.MSFT', {
  indicators: { boll: true, rsi: true }
});
```

---

### 独立指标计算函数

SDK 还导出了独立的指标计算函数，可自行传入数据计算：

```typescript
import {
  calcMA,
  calcSMA,
  calcEMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
  calcBIAS,
  calcCCI,
  calcATR,
  addIndicators,
} from 'stock-sdk';

// 获取 K 线数据
const klines = await sdk.getHistoryKline('sz000001');
const closes = klines.map(k => k.close);

// 计算均线
const ma = calcMA(closes, { periods: [5, 10, 20], type: 'sma' });
console.log(ma[10].ma5);  // 第 10 天的 5 日均线

// 计算 MACD
const macd = calcMACD(closes);
console.log(macd[50].dif, macd[50].dea, macd[50].macd);

// 计算布林带
const boll = calcBOLL(closes, { period: 20, stdDev: 2 });
console.log(boll[30].upper, boll[30].mid, boll[30].lower);

// 计算 KDJ（需要 OHLC 数据）
const ohlcv = klines.map(k => ({
  open: k.open, high: k.high, low: k.low, close: k.close
}));
const kdj = calcKDJ(ohlcv, { period: 9 });
console.log(kdj[20].k, kdj[20].d, kdj[20].j);

// 计算乖离率
const bias = calcBIAS(closes, { periods: [6, 12, 24] });
console.log(bias[30].bias6, bias[30].bias12, bias[30].bias24);

// 计算 CCI（需要 HLC 数据）
const hlc = klines.map(k => ({ high: k.high, low: k.low, close: k.close }));
const cci = calcCCI(hlc, { period: 14 });
console.log(cci[30].cci);

// 计算 ATR（需要 HLC 数据）
const atr = calcATR(hlc, { period: 14 });
console.log(atr[30].atr, atr[30].tr);

// 使用 addIndicators 一次性添加多个指标
const withIndicators = addIndicators(klines, {
  ma: { periods: [5, 10] },
  macd: true,
  boll: true,
  bias: true,
  cci: true,
  atr: true,
});
console.log(withIndicators[50].ma?.ma5);
console.log(withIndicators[50].macd?.dif);
console.log(withIndicators[50].bias?.bias6);
console.log(withIndicators[50].cci?.cci);
console.log(withIndicators[50].atr?.atr);
```

---

## 浏览器直接使用

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

---

如果这个项目对你有帮助，欢迎 Star ⭐ 或提出 Issue 反馈。