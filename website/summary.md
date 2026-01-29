# Stock SDK 文档汇总（基于 `website/` 中文文档）

## 项目介绍
Stock SDK 是一个为前端与 Node.js 设计的股票行情 TypeScript SDK，零依赖、轻量（压缩 < 20KB），支持 A 股/港股/美股/公募基金的实时行情、历史 K 线与常用技术指标。

**核心特性**
- 零依赖、轻量（< 20KB）
- 浏览器与 Node.js 18+ 双端运行
- ESM / CommonJS 双格式
- 完整 TypeScript 类型与单测覆盖
- 多市场行情与 K 线数据
- 内置 MA/MACD/BOLL/KDJ/RSI/WR/BIAS/CCI/ATR/OBV/ROC/DMI/SAR/KC 指标
- 内置重试、限流、UA 轮换与熔断保护
- 资金流向、盘口大单、分红派送、批量全市场行情

**数据来源**
- 腾讯财经：A 股/指数、港股、美股、基金、资金流向、盘口大单、分时走势
- 东方财富：A 股/港股/美股历史 K 线、A 股分钟 K 线、行业/概念板块、分红派送

**运行环境**
- 浏览器：现代浏览器（Chrome/Safari/Edge/Firefox）
- Node.js：18+（依赖内置 `fetch` / `TextDecoder`）

## 安装与使用
**安装**
```bash
npm install stock-sdk
# or
yarn add stock-sdk
# or
pnpm add stock-sdk
```

**CDN**
```html
<script type="module">
  import { StockSDK } from 'https://unpkg.com/stock-sdk/dist/index.js';
  const sdk = new StockSDK();
</script>
```

**模块格式**
```ts
// ESM
import { StockSDK } from 'stock-sdk';

// CJS
const { StockSDK } = require('stock-sdk');
```

## SDK 初始化与配置
```ts
import { StockSDK } from 'stock-sdk';
const sdk = new StockSDK(options?);
```

**配置参数**
| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `baseUrl` | `string` | `'https://qt.gtimg.cn'` | 腾讯行情请求地址（可替换为代理） |
| `timeout` | `number` | `30000` | 请求超时时间（毫秒） |
| `retry` | `RetryOptions` | 见下表 | 重试配置 |
| `headers` | `Record<string, string>` | - | 自定义请求头 |
| `userAgent` | `string` | - | 自定义 User-Agent（浏览器环境可能被忽略） |
| `rateLimit` | `RateLimitOptions` | - | 限流配置（防止请求过快被频控） |
| `rotateUserAgent` | `boolean` | `false` | 是否启用 UA 轮换（仅 Node.js 有效） |
| `circuitBreaker` | `CircuitBreakerOptions` | - | 熔断器配置（连续失败时暂停请求） |

**RetryOptions**
| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `maxRetries` | `number` | `3` | 最大重试次数 |
| `baseDelay` | `number` | `1000` | 初始退避延迟（毫秒） |
| `maxDelay` | `number` | `30000` | 最大退避延迟（毫秒） |
| `backoffMultiplier` | `number` | `2` | 退避系数 |
| `retryableStatusCodes` | `number[]` | `[408, 429, 500, 502, 503, 504]` | 可重试 HTTP 状态码 |
| `retryOnNetworkError` | `boolean` | `true` | 网络错误是否重试 |
| `retryOnTimeout` | `boolean` | `true` | 超时是否重试 |
| `onRetry` | `function` | - | 回调 `(attempt, error, delay) => void` |

**RateLimitOptions**
| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `requestsPerSecond` | `number` | `5` | 每秒最大请求数 |
| `maxBurst` | `number` | `= requestsPerSecond` | 令牌桶容量（允许的突发请求数） |

**CircuitBreakerOptions（默认关闭）**
| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `failureThreshold` | `number` | `5` | 连续失败多少次后触发熔断 |
| `resetTimeout` | `number` | `30000` | 熔断持续时间（毫秒），之后进入半开状态 |
| `halfOpenRequests` | `number` | `1` | 半开状态允许的探测请求数 |
| `onStateChange` | `function` | - | 状态变化回调 `(from, to) => void` |

**熔断器状态说明**
- **CLOSED**：正常状态，允许所有请求
- **OPEN**：熔断状态，拒绝所有请求，抛出 `CircuitBreakerError`
- **HALF_OPEN**：半开状态，允许少量请求探测服务是否恢复

## 错误处理与重试
- 默认指数退避：`baseDelay * backoffMultiplier^attempt`
- HTTP 非 2xx 时抛出 `HttpError`
- 超时错误为 `DOMException` 且 `name === 'AbortError'`
- 熔断器处于 `OPEN` 时会抛出 `CircuitBreakerError`（需显式开启）

## 代码格式与数据说明
- **A 股/指数**：6 位数字或 `sh/sz/bj` 前缀，如 `000001` / `sh000001`
- **港股**：5 位数字，如 `00700`
- **美股行情查询**：`AAPL` 等
- **美股 K 线**：`{市场}.{ticker}`，如 `105.AAPL`（105=纳斯达克，106=纽交所，107=其他）
- **A 股成交量单位**：`volume` 为手（1 手=100 股），`amount` 为万
- **getTodayTimeline**：`volume` 为累计股数，`amount` 为累计元

---

# API 参考（全部方法与类型）

## 实时行情

### getFullQuotes
**签名**
```ts
getFullQuotes(codes: string[]): Promise<FullQuote[]>
```
**参数**
| 参数 | 类型 | 说明 |
|---|---|---|
| `codes` | `string[]` | A 股/指数代码数组 |

**返回类型**
```ts
interface FullQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  outerVolume: number;
  innerVolume: number;
  bid: { price: number; volume: number }[];
  ask: { price: number; volume: number }[];
  time: string; // yyyyMMddHHmmss
  change: number;
  changePercent: number;
  volume2: number;
  amount: number; // 万
  turnoverRate: number | null;
  pe: number | null;
  amplitude: number | null;
  circulatingMarketCap: number | null; // 亿
  totalMarketCap: number | null;       // 亿
  pb: number | null;
  limitUp: number | null;
  limitDown: number | null;
  volumeRatio: number | null;
  avgPrice: number | null;
  peStatic: number | null;
  peDynamic: number | null;
  high52w: number | null;
  low52w: number | null;
  circulatingShares: number | null;
  totalShares: number | null;
  raw: string[];
}
```

### getSimpleQuotes
**签名**
```ts
getSimpleQuotes(codes: string[]): Promise<SimpleQuote[]>
```
**参数**
| 参数 | 类型 | 说明 |
|---|---|---|
| `codes` | `string[]` | A 股/指数代码数组 |

**返回类型**
```ts
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
  raw: string[];
}
```

### getHKQuotes
**签名**
```ts
getHKQuotes(codes: string[]): Promise<HKQuote[]>
```
**参数**
| 参数 | 类型 | 说明 |
|---|---|---|
| `codes` | `string[]` | 港股代码数组 |

**返回类型**
```ts
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

### getUSQuotes
**签名**
```ts
getUSQuotes(codes: string[]): Promise<USQuote[]>
```
**参数**
| 参数 | 类型 | 说明 |
|---|---|---|
| `codes` | `string[]` | 美股代码数组 |

**返回类型**
```ts
interface USQuote {
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
  turnoverRate: number | null;
  pe: number | null;
  amplitude: number | null;
  totalMarketCap: number | null;
  pb: number | null;
  high52w: number | null;
  low52w: number | null;
  raw: string[];
}
```

### getFundQuotes
**签名**
```ts
getFundQuotes(codes: string[]): Promise<FundQuote[]>
```
**参数**
| 参数 | 类型 | 说明 |
|---|---|---|
| `codes` | `string[]` | 基金代码数组（6 位） |

**返回类型**
```ts
interface FundQuote {
  code: string;
  name: string;
  nav: number;
  accNav: number;
  change: number;
  navDate: string;
  raw: string[];
}
```

---

## K 线数据

### getHistoryKline（A 股）
**签名**
```ts
getHistoryKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<HistoryKline[]>
```
**参数**
| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `symbol` | `string` | - | A 股代码，如 `000001` 或 `sz000001` |
| `period` | `string` | `'daily'` | 日/周/月 |
| `adjust` | `string` | `'qfq'` | 复权类型 |
| `startDate` | `string` | - | `YYYYMMDD` |
| `endDate` | `string` | - | `YYYYMMDD` |

**返回类型**
```ts
interface HistoryKline {
  date: string; // YYYY-MM-DD
  code: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  changePercent: number | null;
  change: number | null;
  amplitude: number | null;
  turnoverRate: number | null;
}
```

### getHKHistoryKline（港股）
**签名**
```ts
getHKHistoryKline(symbol: string, options?): Promise<HKUSHistoryKline[]>
```
**参数**
| 参数 | 类型 | 说明 |
|---|---|---|
| `symbol` | `string` | 港股 5 位代码 |

**返回类型**
```ts
interface HKUSHistoryKline {
  date: string;
  code: string;
  name: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  changePercent: number | null;
  change: number | null;
  amplitude: number | null;
  turnoverRate: number | null;
}
```

### getUSHistoryKline（美股）
**签名**
```ts
getUSHistoryKline(symbol: string, options?): Promise<HKUSHistoryKline[]>
```
**参数**
| 参数 | 类型 | 说明 |
|---|---|---|
| `symbol` | `string` | `{market}.{ticker}` |

### getMinuteKline（A 股分钟 K）
**签名**
```ts
getMinuteKline(
  symbol: string,
  options?: {
    period?: '1' | '5' | '15' | '30' | '60';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<MinuteTimeline[] | MinuteKline[]>
```
**参数**
| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `symbol` | `string` | - | A 股代码 |
| `period` | `string` | `'1'` | 分时/分钟周期 |
| `adjust` | `string` | `'qfq'` | 复权（仅 5/15/30/60 有效） |
| `startDate` | `string` | - | `YYYY-MM-DD HH:mm[:ss]` |
| `endDate` | `string` | - | `YYYY-MM-DD HH:mm[:ss]` |

**返回类型（period='1'）**
```ts
interface MinuteTimeline {
  time: string; // YYYY-MM-DD HH:mm
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  avgPrice: number | null;
}
```

**返回类型（period=5/15/30/60）**
```ts
interface MinuteKline {
  time: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  changePercent: number | null;
  change: number | null;
  amplitude: number | null;
  turnoverRate: number | null;
}
```

### getTodayTimeline
**签名**
```ts
getTodayTimeline(code: string): Promise<TodayTimelineResponse>
```
**参数**
| 参数 | 类型 | 说明 |
|---|---|---|
| `code` | `string` | A 股代码（如 `sz000001`） |

**返回类型**
```ts
interface TodayTimelineResponse {
  code: string;
  date: string; // YYYYMMDD
  data: TodayTimeline[];
}

interface TodayTimeline {
  time: string; // HH:mm
  price: number;
  volume: number; // 累计成交量（股）
  amount: number; // 累计成交额（元）
  avgPrice: number;
}
```

---

## 技术指标

### getKlineWithIndicators
**签名**
```ts
getKlineWithIndicators(
  symbol: string,
  options?: {
    market?: 'A' | 'HK' | 'US';
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
    indicators?: IndicatorOptions;
  }
): Promise<KlineWithIndicators[]>
```

**IndicatorOptions**
```ts
interface IndicatorOptions {
  ma?: MAOptions | boolean;
  macd?: MACDOptions | boolean;
  boll?: BOLLOptions | boolean;
  kdj?: KDJOptions | boolean;
  rsi?: RSIOptions | boolean;
  wr?: WROptions | boolean;
  bias?: BIASOptions | boolean;
  cci?: CCIOptions | boolean;
  atr?: ATROptions | boolean;
}
```

**返回类型说明**
- 返回项为对应市场的 K 线记录（与 `getHistoryKline` / `getHKHistoryKline` / `getUSHistoryKline` 相同字段）
- 每条记录附加以下可选指标字段：

```ts
interface KlineWithIndicators {
  ma?: { ma5?: number; ma10?: number; ma20?: number; ma60?: number };
  macd?: { dif: number; dea: number; macd: number };
  boll?: { upper: number; mid: number; lower: number };
  kdj?: { k: number; d: number; j: number };
  rsi?: { rsi6?: number; rsi12?: number; rsi24?: number };
  wr?: { wr6?: number; wr10?: number };
  bias?: { bias6?: number; bias12?: number; bias24?: number };
  cci?: { cci: number };
  atr?: { atr: number };
}
```

### 指标基础类型
```ts
interface OHLCV {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume?: number | null;
}
```

### calcMA / calcSMA / calcEMA / calcWMA
**calcMA**
```ts
calcMA(closes: (number | null)[], options?: MAOptions): MAResult[]
```
```ts
interface MAOptions {
  periods?: number[]; // 默认 [5,10,20,30,60,120,250]
  type?: 'sma' | 'ema' | 'wma';
}

interface MAResult {
  [key: string]: number | null; // ma5, ma10...
}
```

**calcSMA / calcEMA / calcWMA**
```ts
calcSMA(data: (number | null)[], period: number): (number | null)[]
calcEMA(data: (number | null)[], period: number): (number | null)[]
calcWMA(data: (number | null)[], period: number): (number | null)[]
```

### calcMACD
```ts
calcMACD(closes: (number | null)[], options?: MACDOptions): MACDResult[]
```
```ts
interface MACDOptions {
  short?: number;  // 默认 12
  long?: number;   // 默认 26
  signal?: number; // 默认 9
}

interface MACDResult {
  dif: number | null;
  dea: number | null;
  macd: number | null;
}
```

### calcBOLL
```ts
calcBOLL(closes: (number | null)[], options?: BOLLOptions): BOLLResult[]
```
```ts
interface BOLLOptions {
  period?: number; // 默认 20
  stdDev?: number; // 默认 2
}

interface BOLLResult {
  mid: number | null;
  upper: number | null;
  lower: number | null;
  bandwidth: number | null;
}
```

### calcKDJ
```ts
calcKDJ(data: OHLCV[], options?: KDJOptions): KDJResult[]
```
```ts
interface KDJOptions {
  period?: number;  // 默认 9
  kPeriod?: number; // 默认 3
  dPeriod?: number; // 默认 3
}

interface KDJResult {
  k: number | null;
  d: number | null;
  j: number | null;
}
```

### calcRSI
```ts
calcRSI(closes: (number | null)[], options?: RSIOptions): RSIResult[]
```
```ts
interface RSIOptions {
  periods?: number[]; // 默认 [6,12,24]
}

interface RSIResult {
  [key: string]: number | null; // rsi6, rsi12...
}
```

### calcWR
```ts
calcWR(data: OHLCV[], options?: WROptions): WRResult[]
```
```ts
interface WROptions {
  periods?: number[]; // 默认 [6,10]
}

interface WRResult {
  [key: string]: number | null; // wr6, wr10...
}
```

### calcBIAS
```ts
calcBIAS(closes: (number | null)[], options?: BIASOptions): BIASResult[]
```
```ts
interface BIASOptions {
  periods?: number[]; // 默认 [6,12,24]
}

interface BIASResult {
  [key: string]: number | null; // bias6, bias12...
}
```

### calcCCI
```ts
calcCCI(data: OHLCV[], options?: CCIOptions): CCIResult[]
```
```ts
interface CCIOptions {
  period?: number; // 默认 14
}

interface CCIResult {
  cci: number | null;
}
```

### calcATR
```ts
calcATR(data: OHLCV[], options?: ATROptions): ATRResult[]
```
```ts
interface ATROptions {
  period?: number; // 默认 14
}

interface ATRResult {
  tr: number | null;
  atr: number | null;
}
```

### calcOBV
```ts
calcOBV(data: OHLCV[], options?: OBVOptions): OBVResult[]
```
```ts
interface OBVOptions {
  maPeriod?: number; // OBV 均线周期
}

interface OBVResult {
  obv: number | null;
  obvMa: number | null;
}
```

### calcROC
```ts
calcROC(data: OHLCV[], options?: ROCOptions): ROCResult[]
```
```ts
interface ROCOptions {
  period?: number;       // 默认 12
  signalPeriod?: number; // 信号线周期
}

interface ROCResult {
  roc: number | null;
  signal: number | null;
}
```

### calcDMI
```ts
calcDMI(data: OHLCV[], options?: DMIOptions): DMIResult[]
```
```ts
interface DMIOptions {
  period?: number;    // 默认 14
  adxPeriod?: number; // ADX 平滑周期
}

interface DMIResult {
  pdi: number | null;
  mdi: number | null;
  adx: number | null;
  adxr: number | null;
}
```

### calcSAR
```ts
calcSAR(data: OHLCV[], options?: SAROptions): SARResult[]
```
```ts
interface SAROptions {
  afStart?: number;     // 默认 0.02
  afIncrement?: number; // 默认 0.02
  afMax?: number;       // 默认 0.2
}

interface SARResult {
  sar: number | null;
  trend: 1 | -1 | null;
  ep: number | null;
  af: number | null;
}
```

### calcKC
```ts
calcKC(data: OHLCV[], options?: KCOptions): KCResult[]
```
```ts
interface KCOptions {
  emaPeriod?: number;  // 默认 20
  atrPeriod?: number;  // 默认 10
  multiplier?: number; // 默认 2
}

interface KCResult {
  mid: number | null;
  upper: number | null;
  lower: number | null;
  width: number | null;
}
```

### addIndicators
**用途**：为 K 线数组批量添加多个指标（用于图表渲染场景）  
**签名（文档示例）**
```ts
addIndicators(klines, options: IndicatorOptions): KlineWithIndicators[]
```

---

## 行业板块（东方财富）

### getIndustryList
```ts
getIndustryList(): Promise<IndustryBoard[]>
```
```ts
interface IndustryBoard {
  rank: number;
  name: string;
  code: string; // BKxxxx
  price: number | null;
  change: number | null;
  changePercent: number | null;
  totalMarketCap: number | null;
  turnoverRate: number | null;
  riseCount: number | null;
  fallCount: number | null;
  leadingStock: string | null;
  leadingStockChangePercent: number | null;
}
```

### getIndustrySpot
```ts
getIndustrySpot(symbol: string): Promise<IndustryBoardSpot[]>
```
```ts
interface IndustryBoardSpot {
  item: string;
  value: number | null;
}
```

### getIndustryConstituents
```ts
getIndustryConstituents(symbol: string): Promise<IndustryBoardConstituent[]>
```
```ts
interface IndustryBoardConstituent {
  rank: number;
  code: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  change: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  prevClose: number | null;
  turnoverRate: number | null;
  pe: number | null;
  pb: number | null;
}
```

### getIndustryKline
```ts
getIndustryKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<IndustryBoardKline[]>
```
```ts
interface IndustryBoardKline {
  date: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  changePercent: number | null;
  change: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  turnoverRate: number | null;
}
```

### getIndustryMinuteKline
```ts
getIndustryMinuteKline(
  symbol: string,
  options?: { period?: '1' | '5' | '15' | '30' | '60' }
): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]>
```
```ts
interface IndustryBoardMinuteTimeline {
  time: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  price: number | null;
}

interface IndustryBoardMinuteKline {
  time: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  changePercent: number | null;
  change: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  turnoverRate: number | null;
}
```

---

## 概念板块（东方财富）

### getConceptList
```ts
getConceptList(): Promise<ConceptBoard[]>
```
```ts
interface ConceptBoard {
  rank: number;
  name: string;
  code: string; // BKxxxx
  price: number | null;
  change: number | null;
  changePercent: number | null;
  totalMarketCap: number | null;
  turnoverRate: number | null;
  riseCount: number | null;
  fallCount: number | null;
  leadingStock: string | null;
  leadingStockChangePercent: number | null;
}
```

### getConceptSpot
```ts
getConceptSpot(symbol: string): Promise<ConceptBoardSpot[]>
```
```ts
interface ConceptBoardSpot {
  item: string;
  value: number | null;
}
```

### getConceptConstituents
```ts
getConceptConstituents(symbol: string): Promise<ConceptBoardConstituent[]>
```
```ts
interface ConceptBoardConstituent {
  rank: number;
  code: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  change: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  prevClose: number | null;
  turnoverRate: number | null;
  pe: number | null;
  pb: number | null;
}
```

### getConceptKline
```ts
getConceptKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<ConceptBoardKline[]>
```
```ts
interface ConceptBoardKline {
  date: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  changePercent: number | null;
  change: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  turnoverRate: number | null;
}
```

### getConceptMinuteKline
```ts
getConceptMinuteKline(
  symbol: string,
  options?: { period?: '1' | '5' | '15' | '30' | '60' }
): Promise<ConceptBoardMinuteTimeline[] | ConceptBoardMinuteKline[]>
```
```ts
interface ConceptBoardMinuteTimeline {
  time: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  price: number | null;
}

interface ConceptBoardMinuteKline {
  time: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  changePercent: number | null;
  change: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  turnoverRate: number | null;
}
```

---

## 批量与代码列表

### getAShareCodeList
```ts
getAShareCodeList(options?: GetAShareCodeListOptions): Promise<string[]>
```
```ts
interface GetAShareCodeListOptions {
  simple?: boolean;   // 是否移除交易所前缀，默认 false
  market?: 'sh' | 'sz' | 'bj' | 'kc' | 'cy'; // 筛选特定市场/板块
}
```
| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `simple` | `boolean` | `false` | 是否移除 `sh/sz/bj` 前缀 |
| `market` | `AShareMarket` | - | 筛选特定交易所或板块 |

**market 取值说明**
| 值 | 说明 | 代码特征 |
|---|---|---|
| `'sh'` | 上交所 | 6 开头 |
| `'sz'` | 深交所 | 0 和 3 开头 |
| `'bj'` | 北交所 | 92 开头 |
| `'kc'` | 科创板 | 688 开头 |
| `'cy'` | 创业板 | 30 开头 |

> 兼容旧 API：`getAShareCodeList(includeExchange?: boolean)`

### getHKCodeList
```ts
getHKCodeList(): Promise<string[]>
```

### getUSCodeList
```ts
getUSCodeList(options?: GetUSCodeListOptions): Promise<string[]>
```
```ts
interface GetUSCodeListOptions {
  simple?: boolean;   // 是否移除市场前缀，默认 false
  market?: 'NASDAQ' | 'NYSE' | 'AMEX'; // 筛选特定市场
}
```
| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `simple` | `boolean` | `false` | 是否移除前缀（如 `105.`） |
| `market` | `USMarket` | - | 筛选市场（NASDAQ/NYSE/AMEX） |

> 兼容旧 API：`getUSCodeList(includeMarket?: boolean)`

### getFundCodeList
```ts
getFundCodeList(): Promise<string[]>
```

### getAllAShareQuotes
```ts
getAllAShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<FullQuote[]>
```

### getAllQuotesByCodes
```ts
getAllQuotesByCodes(
  codes: string[],
  options?: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<FullQuote[]>
```

### getAllHKShareQuotes
```ts
getAllHKShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<HKQuote[]>
```

### getAllUSShareQuotes
```ts
getAllUSShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<USQuote[]>
```

**批量参数说明**
| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `batchSize` | `number` | `500` | 单次请求数量（最大 500） |
| `concurrency` | `number` | `7` | 最大并发数 |
| `onProgress` | `function` | - | 进度回调（按批次） |

### batchRaw
```ts
batchRaw(params: string): Promise<{ key: string; fields: string[] }[]>
```

---

## 扩展与其他

### getTradingCalendar
```ts
getTradingCalendar(): Promise<string[]>
```
**返回**：交易日期数组（如 `'1990-12-19'`）

### getDividendDetail
```ts
getDividendDetail(symbol: string): Promise<DividendDetail[]>
```
**返回**：分红派送详情列表（按报告期降序）
```ts
interface DividendDetail {
  code: string;
  name: string;
  reportDate: string | null;
  planNoticeDate: string | null;
  disclosureDate: string | null;
  assignTransferRatio: number | null;
  bonusRatio: number | null;
  transferRatio: number | null;
  dividendPretax: number | null;
  dividendDesc: string | null;
  dividendYield: number | null;
  eps: number | null;
  bps: number | null;
  capitalReserve: number | null;
  unassignedProfit: number | null;
  netProfitYoy: number | null;
  totalShares: number | null;
  equityRecordDate: string | null;
  exDividendDate: string | null;
  payDate: string | null;
  assignProgress: string | null;
  noticeDate: string | null;
}
```

### getFundFlow
```ts
getFundFlow(codes: string[]): Promise<FundFlow[]>
```
```ts
interface FundFlow {
  code: string;
  name: string;
  mainInflow: number;
  mainOutflow: number;
  mainNet: number;
  mainNetRatio: number;
  retailInflow: number;
  retailOutflow: number;
  retailNet: number;
  retailNetRatio: number;
  totalFlow: number;
  date: string;
  raw: string[];
}
```

### getPanelLargeOrder
```ts
getPanelLargeOrder(codes: string[]): Promise<PanelLargeOrder[]>
```
```ts
interface PanelLargeOrder {
  buyLargeRatio: number;
  buySmallRatio: number;
  sellLargeRatio: number;
  sellSmallRatio: number;
  raw: string[];
}
```

### search
```ts
function search(keyword: string): Promise<SearchResult[]>;
```
```ts
export interface SearchResult {
  code: string;   // 完整代码，如 sh600519
  name: string;
  market: string; // sh/sz/hk/us
  type: string;   // 资产类别
}
```
**跨域说明**：浏览器使用 JSONP（Script Tag Injection），Node.js 使用普通 HTTP。
