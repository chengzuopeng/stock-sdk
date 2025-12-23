# Stock SDK 技术指标方案设计

本文档设计 Stock SDK 的技术指标计算功能，包括均线、MACD、BOLL、KDJ、RSI 等常用技术指标。

---

## 目录

- [设计目标](#设计目标)
- [架构设计](#架构设计)
  - [功能架构](#功能架构)
  - [⭐ 工程架构设计（重要）](#工程架构设计重要)
- [数据基础](#数据基础)
- [指标类型定义](#指标类型定义)
- [指标计算公式](#指标计算公式)
- [API 设计](#api-设计)
- [⭐ 前置数据处理（关键）](#前置数据处理关键)
- [实现方案](#实现方案)
- [边界情况与异常处理](#边界情况与异常处理)
- [使用示例](#使用示例)
- [扩展性考虑](#扩展性考虑)
- [FAQ / 设计决策](#faq--设计决策)
- [检查清单](#检查清单)

---

## 设计目标

1. **零依赖**：所有指标计算均使用纯 JavaScript/TypeScript 实现，不引入第三方库
2. **易用性**：提供一站式 API，获取 K 线数据时可直接附带指标
3. **灵活性**：支持自定义参数（如 MA 周期、MACD 参数等）
4. **可组合**：指标计算函数可独立使用，也可组合使用
5. **类型安全**：完整的 TypeScript 类型定义
6. **数据一致性**：统一的缺失值处理策略和数据格式约束

---

## 架构设计

### 功能架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         StockSDK                                 │
├─────────────────────────────────────────────────────────────────┤
│  getHistoryKline()  │  getMinuteKline()  │  getHKHistoryKline() │
│                     │                     │  getUSHistoryKline() │
└──────────┬──────────┴──────────┬──────────┴──────────┬──────────┘
           │                     │                     │
           ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      K 线数据 (OHLCV)                            │
│  { date, open, high, low, close, volume, amount, ... }          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     指标计算层 (Indicators)                       │
├─────────────────────────────────────────────────────────────────┤
│  MA    │  EMA   │  MACD  │  BOLL  │  KDJ   │  RSI   │  WR      │
│  SMA   │  DEMA  │  DIF   │  Upper │  K     │        │  Williams│
│        │  TEMA  │  DEA   │  Mid   │  D     │        │          │
│        │        │  Hist  │  Lower │  J     │        │          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      输出：K 线 + 指标数据                        │
│  { date, open, high, low, close, volume, ma5, ma10, macd, ... } │
└─────────────────────────────────────────────────────────────────┘
```

### ⭐ 工程架构设计（重要）

#### 当前结构问题

当前 `sdk.ts` 已有约 950 行代码，包含所有行情获取方法。随着功能增加（技术指标、更多数据源），代码会越来越臃肿，导致：

- 单文件过大，难以维护
- 模块职责不清晰
- 测试文件也会膨胀
- 多人协作困难

#### 目标架构

采用 **分层 + 模块化** 架构，按职责拆分文件：

```
stock-sdk/
├── src/
│   ├── index.ts              # 统一导出入口
│   ├── sdk.ts                # SDK 主类（门面模式，组合各模块）
│   │
│   ├── types/                # 类型定义（按领域分组）
│   │   ├── index.ts          # 类型统一导出
│   │   ├── common.ts         # 通用类型（SDKOptions 等）
│   │   ├── quote.ts          # 行情相关类型
│   │   ├── kline.ts          # K 线相关类型
│   │   └── indicator.ts      # 指标相关类型
│   │
│   ├── core/                 # 核心基础设施
│   │   ├── index.ts          # 导出
│   │   ├── request.ts        # HTTP 请求封装
│   │   ├── parser.ts         # 响应解析器
│   │   └── utils.ts          # 工具函数
│   │
│   ├── providers/            # 数据源适配器（按数据源分组）
│   │   ├── index.ts          # 导出
│   │   ├── tencent/          # 腾讯财经数据源
│   │   │   ├── index.ts
│   │   │   ├── quote.ts      # 行情：getFullQuotes, getSimpleQuotes
│   │   │   ├── fundFlow.ts   # 资金流向：getFundFlow
│   │   │   └── timeline.ts   # 分时：getTodayTimeline
│   │   │
│   │   └── eastmoney/        # 东方财富数据源
│   │       ├── index.ts
│   │       ├── aShareKline.ts   # A股K线：getHistoryKline, getMinuteKline
│   │       ├── hkKline.ts       # 港股K线：getHKHistoryKline
│   │       └── usKline.ts       # 美股K线：getUSHistoryKline
│   │
│   ├── indicators/           # 技术指标（独立模块）
│   │   ├── index.ts          # 统一导出
│   │   ├── types.ts          # 指标类型定义
│   │   ├── ma.ts             # 均线：SMA, EMA, WMA
│   │   ├── macd.ts           # MACD
│   │   ├── boll.ts           # 布林带
│   │   ├── kdj.ts            # KDJ
│   │   ├── rsi.ts            # RSI
│   │   ├── wr.ts             # WR
│   │   └── addIndicators.ts  # 指标附加器
│   │
│   └── __tests__/            # 测试文件（镜像源码结构）
│       ├── sdk.test.ts
│       ├── core/
│       │   ├── request.test.ts
│       │   └── utils.test.ts
│       ├── providers/
│       │   ├── tencent/
│       │   └── eastmoney/
│       └── indicators/
│           ├── ma.test.ts
│           ├── macd.test.ts
│           └── ...
│
├── playground/               # 调试页面
├── dist/                     # 构建产物
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

#### 模块职责说明

| 模块 | 职责 | 示例 |
|------|-----|------|
| `types/` | 纯类型定义，无运行时代码 | `HistoryKline`, `MAOptions` |
| `core/` | 基础设施，与业务无关 | HTTP 请求、响应解析、工具函数 |
| `providers/` | 数据源适配，按来源分组 | 腾讯行情、东财K线 |
| `indicators/` | 技术指标计算，纯函数 | `calcMA()`, `calcMACD()` |
| `sdk.ts` | 门面类，组合各模块 | `new StockSDK()` |

#### SDK 主类设计（门面模式）

```typescript
// src/sdk.ts
import { SDKOptions } from './types';
import { RequestClient } from './core/request';
import * as tencent from './providers/tencent';
import * as eastmoney from './providers/eastmoney';
import { addIndicators } from './indicators';

export class StockSDK {
  private client: RequestClient;

  constructor(options: SDKOptions = {}) {
    this.client = new RequestClient(options);
  }

  // ========== 行情 ==========
  getFullQuotes = tencent.getFullQuotes.bind(null, this.client);
  getSimpleQuotes = tencent.getSimpleQuotes.bind(null, this.client);
  
  // ========== K 线 ==========
  getHistoryKline = eastmoney.getHistoryKline.bind(null, this.client);
  getMinuteKline = eastmoney.getMinuteKline.bind(null, this.client);
  getHKHistoryKline = eastmoney.getHKHistoryKline.bind(null, this.client);
  getUSHistoryKline = eastmoney.getUSHistoryKline.bind(null, this.client);
  
  // ========== 分时 ==========
  getTodayTimeline = tencent.getTodayTimeline.bind(null, this.client);
  
  // ========== 指标 ==========
  async getKlineWithIndicators(symbol: string, options?: KlineWithIndicatorsOptions) {
    // 调用 K 线获取 + 指标计算
    const klines = await this.getHistoryKline(symbol, options);
    return addIndicators(klines, options?.indicators);
  }
}
```

#### Provider 模块设计

每个 provider 文件导出纯函数，接收 `RequestClient` 作为第一个参数：

```typescript
// src/providers/tencent/quote.ts
import { RequestClient } from '../../core/request';
import { FullQuote } from '../../types';

export async function getFullQuotes(
  client: RequestClient,
  codes: string[]
): Promise<FullQuote[]> {
  if (codes.length === 0) return [];
  
  const url = buildUrl(codes);
  const response = await client.get(url);
  return parseFullQuotes(response);
}

// 内部函数
function buildUrl(codes: string[]): string { ... }
function parseFullQuotes(data: string): FullQuote[] { ... }
```

#### 导出策略

```typescript
// src/index.ts
// 默认导出 SDK 类
export { StockSDK } from './sdk';
export { StockSDK as default } from './sdk';

// 导出类型
export * from './types';

// 导出独立指标计算函数（供高级用户使用）
export {
  calcMA,
  calcEMA,
  calcSMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
} from './indicators';
```

#### 渐进式迁移策略

为避免一次性大规模重构，建议分阶段迁移：

| 阶段 | 内容 | 风险 |
|------|-----|------|
| **Phase 1** | 创建目录结构，抽取 `core/`（request、utils） | 低 |
| **Phase 2** | 拆分 `types/`，按领域分组 | 低 |
| **Phase 3** | 新增 `indicators/` 模块（新代码直接写在新结构） | 低 |
| **Phase 4** | 逐步迁移 `providers/`（每次迁移一个方法） | 中 |
| **Phase 5** | 重构 `sdk.ts` 为门面类 | 中 |
| **Phase 6** | 拆分测试文件 | 低 |

#### 代码规模预估

| 模块 | 当前行数 | 重构后预估 |
|------|---------|-----------|
| `sdk.ts` | ~950 行 | ~100 行（门面） |
| `core/` | - | ~200 行 |
| `providers/tencent/` | - | ~400 行 |
| `providers/eastmoney/` | - | ~400 行 |
| `indicators/` | - | ~500 行 |
| `types/` | ~150 行 | ~300 行 |
| **总计** | ~1100 行 | ~1900 行 |

> 总行数增加是因为模块化带来的导出/导入样板代码，但每个文件更小、更聚焦。

#### 扩展性分析

这套架构能够支撑以下扩展场景：

| 场景 | 如何扩展 |
|------|---------|
| 新增数据源（如新浪财经） | 在 `providers/` 下新增 `sina/` 目录 |
| 新增指标（如 ATR、CCI） | 在 `indicators/` 下新增对应文件 |
| 新增市场（如期货、基金） | 在 `providers/` 下新增对应模块 |
| 支持 WebSocket 实时推送 | 在 `core/` 下新增 `websocket.ts` |
| 支持数据缓存 | 在 `core/` 下新增 `cache.ts` |
| 支持多语言错误信息 | 在 `core/` 下新增 `i18n.ts` |

---

## 数据基础

技术指标计算基于 K 线数据，SDK 已提供以下 K 线获取方法：

| 方法 | 数据类型 | 说明 |
|------|---------|------|
| `getHistoryKline` | `HistoryKline[]` | A 股日/周/月 K 线 |
| `getMinuteKline` | `MinuteKline[]` | A 股 5/15/30/60 分钟 K 线 |
| `getHKHistoryKline` | `HKUSHistoryKline[]` | 港股日/周/月 K 线 |
| `getUSHistoryKline` | `HKUSHistoryKline[]` | 美股日/周/月 K 线 |

**K 线核心字段**：

```typescript
interface OHLCV {
  date: string;       // 日期/时间
  open: number;       // 开盘价
  high: number;       // 最高价
  low: number;        // 最低价
  close: number;      // 收盘价
  volume: number;     // 成交量
}
```

### ⚠️ 数据格式约束（重要）

为确保指标计算正确，K 线数据必须满足以下约束：

| 约束 | 要求 | 说明 |
|------|-----|------|
| **排序** | 按时间升序 | 最早的数据在数组头部，最新的在尾部 |
| **日期格式** | `YYYY-MM-DD` | 统一使用 ISO 格式，便于字符串比较 |
| **时间戳** | 可选 | 建议内部转换为时间戳进行比较 |
| **连续性** | 允许不连续 | 节假日/停牌导致的缺失是正常的 |

```typescript
// ✅ 正确的数据格式
const klines = [
  { date: '2024-12-01', close: 10.5, ... },  // 第 1 天
  { date: '2024-12-02', close: 10.8, ... },  // 第 2 天
  { date: '2024-12-05', close: 11.0, ... },  // 跳过周末
];

// ❌ 错误：倒序排列
const wrong = [
  { date: '2024-12-05', ... },
  { date: '2024-12-02', ... },
  { date: '2024-12-01', ... },
];
```

**内部处理**：SDK 在计算指标前会：
1. 检查数据是否按时间升序排列
2. 将日期统一转换为时间戳进行比较
3. 对于非升序数据，抛出错误或自动排序（可配置）

---

## 指标类型定义

### 1. 均线指标 (Moving Average)

```typescript
/** 均线数据 */
interface MAData {
  /** MA5 - 5日均线 */
  ma5: number | null;
  /** MA10 - 10日均线 */
  ma10: number | null;
  /** MA20 - 20日均线 */
  ma20: number | null;
  /** MA30 - 30日均线 */
  ma30: number | null;
  /** MA60 - 60日均线 */
  ma60: number | null;
  /** MA120 - 120日均线 */
  ma120: number | null;
  /** MA250 - 250日均线（年线） */
  ma250: number | null;
}

/** 均线配置 */
interface MAOptions {
  /** 均线周期数组，默认 [5, 10, 20, 30, 60, 120, 250] */
  periods?: number[];
  /** 均线类型：'sma'(简单) | 'ema'(指数) | 'wma'(加权)，默认 'sma' */
  type?: 'sma' | 'ema' | 'wma';
}
```

### 2. MACD 指标

```typescript
/** MACD 数据 */
interface MACDData {
  /** DIF - 快线（短期EMA - 长期EMA） */
  dif: number | null;
  /** DEA - 慢线（DIF 的 EMA） */
  dea: number | null;
  /** MACD 柱状图（(DIF - DEA) * 2） */
  macd: number | null;
}

/** MACD 配置 */
interface MACDOptions {
  /** 短期 EMA 周期，默认 12 */
  short?: number;
  /** 长期 EMA 周期，默认 26 */
  long?: number;
  /** 信号线 EMA 周期，默认 9 */
  signal?: number;
}
```

### 3. BOLL 布林带

```typescript
/** BOLL 数据 */
interface BOLLData {
  /** 中轨（N日均线） */
  mid: number | null;
  /** 上轨（中轨 + K * 标准差） */
  upper: number | null;
  /** 下轨（中轨 - K * 标准差） */
  lower: number | null;
  /** 带宽 ((上轨 - 下轨) / 中轨 * 100) */
  bandwidth: number | null;
}

/** BOLL 配置 */
interface BOLLOptions {
  /** 均线周期，默认 20 */
  period?: number;
  /** 标准差倍数，默认 2 */
  stdDev?: number;
}
```

### 4. KDJ 随机指标

```typescript
/** KDJ 数据 */
interface KDJData {
  /** K 值 */
  k: number | null;
  /** D 值 */
  d: number | null;
  /** J 值 */
  j: number | null;
}

/** KDJ 配置 */
interface KDJOptions {
  /** RSV 周期，默认 9 */
  period?: number;
  /** K 值平滑周期，默认 3 */
  kPeriod?: number;
  /** D 值平滑周期，默认 3 */
  dPeriod?: number;
}
```

### 5. RSI 相对强弱指标

```typescript
/** RSI 数据 */
interface RSIData {
  /** RSI6 */
  rsi6: number | null;
  /** RSI12 */
  rsi12: number | null;
  /** RSI24 */
  rsi24: number | null;
}

/** RSI 配置 */
interface RSIOptions {
  /** RSI 周期数组，默认 [6, 12, 24] */
  periods?: number[];
}
```

### 6. WR 威廉指标

```typescript
/** WR 数据 */
interface WRData {
  /** WR6 */
  wr6: number | null;
  /** WR10 */
  wr10: number | null;
}

/** WR 配置 */
interface WROptions {
  /** WR 周期数组，默认 [6, 10] */
  periods?: number[];
}
```

### 7. 综合指标输出

```typescript
/** 带技术指标的 K 线数据 */
interface KlineWithIndicators extends HistoryKline {
  /** 均线数据 */
  ma?: MAData;
  /** MACD 数据 */
  macd?: MACDData;
  /** BOLL 数据 */
  boll?: BOLLData;
  /** KDJ 数据 */
  kdj?: KDJData;
  /** RSI 数据 */
  rsi?: RSIData;
  /** WR 数据 */
  wr?: WRData;
}
```

---

## 指标计算公式

### 1. MA 简单移动平均线 (Simple Moving Average)

```
MA(N) = (C1 + C2 + ... + CN) / N

其中：C = 收盘价，N = 周期
```

### 2. EMA 指数移动平均线 (Exponential Moving Average)

```
EMA(N) = α × C + (1 - α) × EMA(N-1)

其中：
  α = 2 / (N + 1)
  C = 当日收盘价
  EMA(N-1) = 前一日 EMA
  
初始化方式（重要）：
  - 前 N-1 天：返回 null（数据不足）
  - 第 N 天：EMA 初始值 = 前 N 天的 SMA
  - 第 N+1 天起：使用标准 EMA 公式递推
  
注：使用 SMA 初始化可避免"首日=首日收盘价"导致的前段偏差问题
```

### 3. MACD 指数平滑异同移动平均线

```
DIF = EMA(12) - EMA(26)
DEA = EMA(DIF, 9)
MACD = (DIF - DEA) × 2
```

### 4. BOLL 布林带

```
中轨 = MA(N)
标准差 = √(Σ(Ci - MA)² / N)
上轨 = 中轨 + K × 标准差
下轨 = 中轨 - K × 标准差

其中：N = 20（默认），K = 2（默认）
```

### 5. KDJ 随机指标

```
RSV = (C - L9) / (H9 - L9) × 100

其中：
  C = 当日收盘价
  L9 = 9日最低价
  H9 = 9日最高价

K = 2/3 × K(-1) + 1/3 × RSV
D = 2/3 × D(-1) + 1/3 × K
J = 3K - 2D

初始值：K = D = 50
```

### 6. RSI 相对强弱指标

```
RS = 平均上涨幅度 / 平均下跌幅度
RSI = 100 - 100 / (1 + RS)

平均上涨幅度 = N 日内上涨总幅度 / N
平均下跌幅度 = N 日内下跌总幅度 / N
```

### 7. WR 威廉指标

```
WR = (HN - C) / (HN - LN) × 100

其中：
  HN = N 日内最高价
  LN = N 日内最低价
  C = 当日收盘价
```

---

## API 设计

### 方案一：一站式 API（推荐）

在获取 K 线时直接计算并附带指标数据。

#### 市场区分设计

**方案 A：通过 `market` 参数区分（推荐）**

```typescript
type MarketType = 'A' | 'HK' | 'US';

async getKlineWithIndicators(
  symbol: string,
  options?: {
    market?: MarketType;  // 市场类型，默认 'A'
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
    indicators?: IndicatorOptions;
  }
): Promise<KlineWithIndicators[]>
```

**方案 B：通过股票代码格式自动识别**

```typescript
// 代码格式规则
// A 股: 6 位数字 或 sh/sz/bj 前缀，如 '000001', 'sz000001'
// 港股: 5 位数字，如 '00700', '09988'
// 美股: {market}.{ticker} 格式，如 '105.MSFT', '106.BABA'

function detectMarket(symbol: string): MarketType {
  // 美股格式: 105.MSFT, 106.BABA
  if (/^\d{3}\.[A-Z]+$/.test(symbol)) {
    return 'US';
  }
  
  // 港股: 5 位纯数字
  if (/^\d{5}$/.test(symbol)) {
    return 'HK';
  }
  
  // A 股: 6 位数字或带 sh/sz/bj 前缀
  return 'A';
}
```

**方案 C：为每个市场提供独立方法**

```typescript
// A 股
async getAShareKlineWithIndicators(symbol: string, options?: ...);

// 港股
async getHKKlineWithIndicators(symbol: string, options?: ...);

// 美股
async getUSKlineWithIndicators(symbol: string, options?: ...);
```

#### 推荐：方案 A + 方案 B 结合

优先通过代码格式自动识别，同时支持手动指定：

```typescript
async getKlineWithIndicators(
  symbol: string,
  options?: {
    market?: 'A' | 'HK' | 'US';  // 可选，不传则自动识别
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
    indicators?: {
      ma?: MAOptions | boolean;
      macd?: MACDOptions | boolean;
      boll?: BOLLOptions | boolean;
      kdj?: KDJOptions | boolean;
      rsi?: RSIOptions | boolean;
      wr?: WROptions | boolean;
    };
  }
): Promise<KlineWithIndicators[]>
```

**使用示例**：

```typescript
// A 股（自动识别市场）
const aData = await sdk.getKlineWithIndicators('sz000001', {
  period: 'daily',
  startDate: '20240101',
  indicators: {
    ma: true,              // 使用默认参数
    macd: true,
    boll: { period: 20, stdDev: 2 },  // 自定义参数
    kdj: true,
  }
});

console.log(aData[0].ma.ma5);     // 5日均线
console.log(aData[0].macd.dif);   // DIF
console.log(aData[0].boll.upper); // 布林上轨
console.log(aData[0].kdj.k);      // K 值

// 港股（5 位代码，自动识别）
const hkData = await sdk.getKlineWithIndicators('00700', {
  startDate: '20240101',
  indicators: { ma: true, macd: true }
});

// 美股（市场代码.股票代码格式，自动识别）
const usData = await sdk.getKlineWithIndicators('105.MSFT', {
  startDate: '20240101',
  indicators: { ma: true, rsi: true }
});

// 手动指定市场（优先级高于自动识别）
const hkData2 = await sdk.getKlineWithIndicators('09988', {
  market: 'HK',  // 明确指定为港股
  startDate: '20240101',
  indicators: { boll: true }
});
```

### 方案二：独立计算函数

导出独立的指标计算函数，用户可自行传入数据计算：

```typescript
// 导出指标计算函数
export { calcMA, calcEMA, calcMACD, calcBOLL, calcKDJ, calcRSI, calcWR };

// 使用示例
import { StockSDK, calcMA, calcMACD } from 'stock-sdk';

const sdk = new StockSDK();
const klines = await sdk.getHistoryKline('sz000001');

// 单独计算均线
const closes = klines.map(k => k.close);
const maResults = calcMA(closes, { periods: [5, 10, 20] });
// maResults[i].ma5, maResults[i].ma10, maResults[i].ma20

// 或者使用底层函数计算单个周期
import { calcSMA, calcEMA } from 'stock-sdk';
const sma5 = calcSMA(closes, 5);   // 返回 (number | null)[]
const ema10 = calcEMA(closes, 10); // 返回 (number | null)[]

// 单独计算 MACD
const macdResult = calcMACD(closes, {
  short: 12,
  long: 26,
  signal: 9
});
```

### 方案三：链式调用 (Builder 模式)

```typescript
const data = await sdk.kline('sz000001')
  .period('daily')
  .dateRange('20240101', '20241231')
  .withMA([5, 10, 20, 60])
  .withMACD()
  .withBOLL()
  .withKDJ()
  .fetch();
```

---

## ⭐ 前置数据处理（关键）

### 问题描述

技术指标的计算需要**历史前置数据**。例如：

- 计算 `2024-12-01` 的 **MA60**（60日均线），需要从 `2024-12-01` 往前 60 个交易日的数据
- 计算 **MACD**，需要至少 `26 + 9 - 1 = 34` 个交易日的前置数据（长期EMA周期 + 信号线周期）
- 计算 **MA250**（年线），需要 250 个交易日的前置数据

**如果用户请求 `20241201` 到 `20241220` 的带指标 K 线数据，SDK 不能只请求这 20 天的数据，否则计算出的指标值将是错误的或为 null。**

### 解决方案

在 `getKlineWithIndicators` 方法内部自动处理：

```
用户请求日期范围: [startDate, endDate]
                        ↓
               计算所需前置天数
                        ↓
实际请求日期范围: [startDate - 前置天数, endDate]
                        ↓
                 获取完整 K 线数据
                        ↓
                 计算技术指标
                        ↓
     过滤返回: 只返回 [startDate, endDate] 范围内的数据
```

### 前置天数计算规则

```typescript
/**
 * 安全获取数组最大值（处理空数组）
 */
function safeMax(arr: number[], defaultValue: number = 0): number {
  if (!arr || arr.length === 0) return defaultValue;
  return Math.max(...arr);
}

/**
 * 计算各指标所需的最大前置天数
 * 
 * 注意：
 * - EMA 类指标需要 3-5 倍周期才能收敛，这里使用 3 倍作为回溯倍数
 * - 对于空数组情况会使用默认值，避免 Math.max(...[]) 返回 -Infinity
 */
function calcRequiredLookback(options: IndicatorOptions): number {
  let maxLookback = 0;
  let hasEmaBasedIndicator = false;  // 是否有 EMA 类指标
  
  // MA 均线
  if (options.ma) {
    const cfg = typeof options.ma === 'object' ? options.ma : {};
    const periods = cfg.periods ?? [5, 10, 20, 30, 60, 120, 250];
    const type = cfg.type ?? 'sma';
    maxLookback = Math.max(maxLookback, safeMax(periods, 20));
    if (type === 'ema') hasEmaBasedIndicator = true;
  }
  
  // MACD: 需要 long 周期的 EMA 收敛 + signal 周期的 DEA 计算
  // 推荐回溯：3 × long + signal（约 3×26+9 = 87 天）
  if (options.macd) {
    const cfg = typeof options.macd === 'object' ? options.macd : {};
    const long = cfg.long ?? 26;
    const signal = cfg.signal ?? 9;
    maxLookback = Math.max(maxLookback, long * 3 + signal);
    hasEmaBasedIndicator = true;
  }
  
  // BOLL: period
  if (options.boll) {
    const period = typeof options.boll === 'object' && options.boll.period 
      ? options.boll.period 
      : 20;
    maxLookback = Math.max(maxLookback, period);
  }
  
  // KDJ: period
  if (options.kdj) {
    const period = typeof options.kdj === 'object' && options.kdj.period 
      ? options.kdj.period 
      : 9;
    maxLookback = Math.max(maxLookback, period);
  }
  
  // RSI: max(periods) + 1（需要计算涨跌幅）
  if (options.rsi) {
    const periods = typeof options.rsi === 'object' && options.rsi.periods 
      ? options.rsi.periods 
      : [6, 12, 24];
    maxLookback = Math.max(maxLookback, safeMax(periods, 14) + 1);
  }
  
  // WR: max(periods)
  if (options.wr) {
    const periods = typeof options.wr === 'object' && options.wr.periods 
      ? options.wr.periods 
      : [6, 10];
    maxLookback = Math.max(maxLookback, safeMax(periods, 10));
  }
  
  // EMA 类指标需要更长的收敛期
  // 非 EMA 类使用 1.2 倍缓冲，EMA 类使用 1.5 倍
  const buffer = hasEmaBasedIndicator ? 1.5 : 1.2;
  return Math.ceil(maxLookback * buffer);
}
```

### 日期回推处理

由于交易日并非连续（有周末和节假日），需要按**自然日**回推更多天数：

```typescript
/**
 * 计算实际请求的开始日期
 * @param startDate 用户请求的开始日期 YYYYMMDD
 * @param tradingDays 需要的前置交易日数
 * @param ratio 交易日转自然日的系数，默认 1.5（适用于 A 股）
 * @returns 实际请求的开始日期 YYYYMMDD
 */
function calcActualStartDate(
  startDate: string, 
  tradingDays: number,
  ratio: number = 1.5
): string {
  // 考虑周末和节假日，按指定系数回推
  // A 股: 365 / 242 ≈ 1.51
  // 港股: 365 / 250 ≈ 1.46
  // 美股: 365 / 252 ≈ 1.45
  const naturalDays = Math.ceil(tradingDays * ratio);
  
  const date = new Date(
    parseInt(startDate.slice(0, 4)),
    parseInt(startDate.slice(4, 6)) - 1,
    parseInt(startDate.slice(6, 8))
  );
  
  date.setDate(date.getDate() - naturalDays);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}
```

### 市场识别与交易日差异

不同市场使用不同的 K 线接口，且交易日有差异：

| 市场 | 接口方法 | 年交易日数 | 代码格式示例 |
|------|---------|----------|------------|
| A 股 | `getHistoryKline` | ~242 天 | `000001`, `sz000001` |
| 港股 | `getHKHistoryKline` | ~250 天 | `00700`, `09988` |
| 美股 | `getUSHistoryKline` | ~252 天 | `105.MSFT`, `106.BABA` |

#### 市场自动识别

```typescript
type MarketType = 'A' | 'HK' | 'US';

/**
 * 通过代码格式自动识别市场
 */
function detectMarket(symbol: string): MarketType {
  // 美股: 市场代码.股票代码，如 105.MSFT, 106.BABA
  if (/^\d{3}\.[A-Z]+$/.test(symbol)) {
    return 'US';
  }
  
  // 港股: 5 位纯数字，如 00700, 09988
  if (/^\d{5}$/.test(symbol)) {
    return 'HK';
  }
  
  // A 股: 6 位数字或带 sh/sz/bj 前缀
  return 'A';
}
```

#### 按市场选择 K 线接口

```typescript
private async fetchKlineByMarket(
  symbol: string,
  market: MarketType,
  options: KlineOptions
): Promise<HistoryKline[] | HKUSHistoryKline[]> {
  switch (market) {
    case 'A':
      return this.getHistoryKline(symbol, options);
    case 'HK':
      return this.getHKHistoryKline(symbol, options);
    case 'US':
      return this.getUSHistoryKline(symbol, options);
  }
}
```

#### 交易日系数

```typescript
const NATURAL_DAY_RATIO: Record<MarketType, number> = {
  A: 1.50,   // 365 / 242 ≈ 1.51
  HK: 1.46,  // 365 / 250 ≈ 1.46
  US: 1.45,  // 365 / 252 ≈ 1.45
};
```

### 完整实现流程

```typescript
/**
 * 日期字符串转时间戳（统一使用时间戳比较，避免字符串格式问题）
 */
function dateToTimestamp(dateStr: string): number {
  // 支持 YYYYMMDD 和 YYYY-MM-DD 两种格式
  const normalized = dateStr.includes('-') 
    ? dateStr 
    : `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
  return new Date(normalized).getTime();
}

/**
 * 验证 K 线数据格式
 */
function validateKlines(klines: any[]): void {
  if (klines.length < 2) return;
  
  const first = dateToTimestamp(klines[0].date);
  const second = dateToTimestamp(klines[1].date);
  
  if (first > second) {
    throw new Error('K 线数据必须按时间升序排列');
  }
}

async getKlineWithIndicators(
  symbol: string,
  options: {
    market?: MarketType;  // 可选，不传则自动识别
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
    indicators?: IndicatorOptions;
  } = {}
): Promise<KlineWithIndicators[]> {
  const { startDate, endDate, indicators = {} } = options;
  
  // 步骤 1: 识别市场
  const market = options.market ?? detectMarket(symbol);
  
  // 步骤 2: 计算所需前置 K 线根数
  const requiredBars = calcRequiredLookback(indicators);
  
  // 步骤 3: 计算实际请求的开始日期（考虑市场交易日差异）
  const ratio = NATURAL_DAY_RATIO[market];
  const actualStartDate = startDate 
    ? calcActualStartDate(startDate, requiredBars, ratio) 
    : undefined;
  
  // 步骤 4: 请求扩展范围的 K 线数据（根据市场选择接口）
  let allKlines = await this.fetchKlineByMarket(symbol, market, {
    ...options,
    startDate: actualStartDate,
  });
  
  // 步骤 5: 验证数据格式（确保升序排列）
  validateKlines(allKlines);
  
  // 步骤 6: 检查是否有足够的前置数据（按需补拉策略）
  if (startDate && allKlines.length < requiredBars) {
    // 数据不足，尝试不限制起始日期重新请求
    allKlines = await this.fetchKlineByMarket(symbol, market, {
      ...options,
      startDate: undefined,  // 获取全部可用数据
    });
    validateKlines(allKlines);
  }
  
  // 步骤 7: 计算技术指标（基于完整数据）
  const withIndicators = addIndicators(allKlines, indicators);
  
  // 步骤 8: 过滤返回用户请求的日期范围（使用时间戳比较）
  if (startDate) {
    const startTs = dateToTimestamp(startDate);
    const endTs = endDate ? dateToTimestamp(endDate) : Infinity;
    return withIndicators.filter(k => {
      const ts = dateToTimestamp(k.date);
      return ts >= startTs && ts <= endTs;
    });
  }
  
  return withIndicators;
}
```

### 按需补拉策略说明

当通过日期回推获取的数据仍不足以计算指标时（如股票上市时间较短），SDK 会：

1. **首次请求**：按估算的回推日期请求数据
2. **检测不足**：如果返回的 K 线根数 < 所需前置根数
3. **补拉请求**：不限制起始日期，获取该股票全部可用数据
4. **降级处理**：如果仍然不足，指标值返回 `null`

```
用户请求 → 估算回推日期 → 拉取数据 
                              ↓
                        数据足够？
                         ↙    ↘
                       是      否
                        ↓       ↓
                   计算指标   补拉全量数据
                                 ↓
                            计算指标
                                 ↓
                        不足部分返回 null
```

### 示例说明

用户请求：
```typescript
await sdk.getKlineWithIndicators('sz000001', {
  startDate: '20241201',
  endDate: '20241220',
  indicators: {
    ma: { periods: [5, 10, 60] },  // 需要 60 根 K 线
    macd: true,                     // 需要约 87 根 K 线（3×26+9）
  }
});
```

SDK 内部处理：

| 步骤 | 说明 |
|------|------|
| 1 | 计算最大前置根数：`max(60, 87) = 87`，加缓冲 `87 * 1.5 ≈ 131` |
| 2 | 回推自然日：`131 * 1.5 ≈ 197` 天（约 6.5 个月） |
| 3 | 实际请求范围：约 `20240517` ~ `20241220` |
| 4 | 验证数据格式（确保升序） |
| 5 | 检查数据是否足够，不足则补拉 |
| 6 | 计算指标（基于完整数据） |
| 7 | 使用时间戳过滤，返回 `20241201` ~ `20241220` 范围内的数据 |

---

## 边界情况与异常处理

### ⚠️ 统一缺失值处理策略（重要）

为避免不同指标间空值处理不一致导致的问题，定义统一策略：

| 情况 | 处理方式 | 输出 |
|------|---------|------|
| 窗口期内数据不足 | 标记为预热期 | `null` |
| 窗口内存在 `null` | 按有效数据计算或跳过 | 见下表 |
| 分母为 0 | 短路处理 | `null` 或极值 |
| 全部数据缺失 | 无法计算 | `null` |

#### 各指标空值处理规则

| 指标 | 窗口内有 null 时 | 说明 |
|------|-----------------|------|
| **SMA** | 需全部有效才计算 | 有任意 null → 结果 null |
| **EMA** | 跳过 null，保持上一值 | 遇 null 时 EMA 不更新 |
| **BOLL** | 同 SMA | 依赖 SMA |
| **KDJ** | 高低价窗口需全有效 | 否则 RSV=null → K/D/J=null |
| **RSI** | 需 N 个有效涨跌幅 | 否则返回 null |
| **WR** | 高低价窗口需全有效 | 否则返回 null |

```typescript
/**
 * 检查窗口内是否有足够的有效数据
 */
function hasEnoughValidData(
  data: (number | null)[], 
  start: number, 
  end: number,
  required: number
): boolean {
  let count = 0;
  for (let i = start; i <= end && i < data.length; i++) {
    if (data[i] !== null) count++;
  }
  return count >= required;
}

/**
 * 安全获取窗口内的最大/最小值（跳过 null）
 */
function safeMinMax(
  data: (number | null)[], 
  start: number, 
  end: number
): { min: number | null; max: number | null } {
  let min = Infinity, max = -Infinity;
  let hasValid = false;
  
  for (let i = start; i <= end && i < data.length; i++) {
    if (data[i] !== null) {
      hasValid = true;
      min = Math.min(min, data[i]!);
      max = Math.max(max, data[i]!);
    }
  }
  
  return hasValid 
    ? { min, max } 
    : { min: null, max: null };  // 全部为 null
}
```

### 1. 数据不足的情况

当历史数据不足以计算指标时，对应字段返回 `null`：

```typescript
// 假设只有 30 天数据，计算 MA60
const ma60 = calcMA(closes, { periods: [60] });
// 前 59 天的值都是 null
// ma60 = [{ ma60: null }, { ma60: null }, ..., { ma60: 123.45 }, ...]
```

### 2. 预热期标记

EMA/MACD 等指标在前期需要"预热"才能稳定，建议：
- 前 N-1 天返回 `null`（N 为周期）
- 或者标记 `isWarmup: true` 提示用户数据可能不稳定

```typescript
interface IndicatorValue {
  value: number | null;
  isWarmup?: boolean;  // 可选：标记是否处于预热期
}
```

### 3. 精度处理

浮点数计算可能产生精度问题，统一保留合理小数位：

```typescript
/**
 * 统一精度处理
 * @param value 原始值
 * @param decimals 小数位数
 */
function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// 价格相关指标保留 2 位小数
const ma = round(maValue, 2);

// 比例类指标保留 2 位小数
const rsi = round(rsiValue, 2);
```

### 4. 除零保护

```typescript
// RSI 计算中的除零保护
if (avgLoss === 0) {
  rsi = 100;  // 全部上涨
} else if (avgGain === 0) {
  rsi = 0;    // 全部下跌
} else {
  rsi = 100 - 100 / (1 + avgGain / avgLoss);
}

// KDJ/WR 中的高低价相等情况
if (high === low) {
  rsv = 50;  // 或返回 null
}

// BOLL 带宽计算
const bandwidth = mid !== 0 ? round((upper - lower) / mid * 100, 2) : null;
```

### 5. 首日值初始化

对于需要前值的指标，采用 SMA 初始化而非直接使用首日值：

```typescript
// ❌ 不推荐：首日 EMA = 首日收盘价（会导致前段偏差）
let ema = closes[0];

// ✅ 推荐：用前 N 天 SMA 初始化 EMA
const firstSMA = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
let ema = firstSMA;

// KDJ 的 K、D 初始值为 50
let k = 50, d = 50;
```

### 6. 周期与市场匹配

不同市场的交易日不同，需要注意：

| 市场 | 年交易日 | 自然日/交易日 |
|------|---------|--------------|
| A 股 | ~250 | 1.46 |
| 港股 | ~250 | 1.46 |
| 美股 | ~252 | 1.45 |

### 7. 性能考虑

当前实现采用直接计算方式，复杂度为 O(N × ∑periods)。对于大数据量场景可考虑以下优化：

#### 当前实现（简单直接）

```typescript
// 一次遍历计算所有周期
const periods = [5, 10, 20, 60, 120, 250];
const maResults: { [key: string]: (number | null)[] } = {};

for (const period of periods) {
  maResults[`ma${period}`] = calcSMA(closes, period);
}
```

#### 未来优化方向

1. **前缀和优化 SMA**：O(1) 单点计算

```typescript
// 预计算前缀和，后续每个 SMA 只需 O(1)
const prefixSum = [0];
for (const v of closes) {
  prefixSum.push(prefixSum[prefixSum.length - 1] + (v ?? 0));
}
// SMA[i] = (prefixSum[i+1] - prefixSum[i-period+1]) / period
```

2. **滑动窗口优化**：避免重复求和

```typescript
// 维护滑动窗口的和，避免每次重新求和
let windowSum = closes.slice(0, period).reduce((a, b) => a + b, 0);
for (let i = period; i < closes.length; i++) {
  windowSum = windowSum - closes[i - period] + closes[i];
  // ...
}
```

3. **增量更新**：适用于实时数据场景

> 注：当前阶段优先保证正确性，性能优化作为后续迭代方向

### 8. 分钟级数据处理

分钟 K 线计算指标时，需考虑跨日连续性：

```typescript
// 5 分钟 K 线的 MA60 = 60 * 5 = 300 分钟 = 5 小时
// 约 1.25 个交易日的数据
```

---

## 实现方案

### 推荐方案：方案一 + 方案二 结合

1. **核心层**：在 `src/indicators/` 目录下实现独立的指标计算函数
2. **集成层**：在 `StockSDK` 类中添加 `getKlineWithIndicators` 方法
3. **导出层**：同时导出计算函数和集成方法

### 文件结构

> 详细的工程架构和文件组织请参见 [⭐ 工程架构设计](#工程架构设计重要) 章节。

指标模块的具体文件结构：

```
src/indicators/           # 技术指标模块
├── index.ts              # 统一导出
├── types.ts              # 指标相关类型定义
├── ma.ts                 # 均线计算（SMA/EMA/WMA）
├── macd.ts               # MACD 计算
├── boll.ts               # 布林带计算
├── kdj.ts                # KDJ 计算
├── rsi.ts                # RSI 计算
├── wr.ts                 # WR 计算
├── utils.ts              # 指标计算工具函数
└── addIndicators.ts      # 指标附加器（将指标附加到 K 线数据）
```

---

## 详细实现代码

### 1. `src/indicators/types.ts` - 类型定义

```typescript
// ========== 输入类型 ==========
export interface OHLCV {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume?: number | null;
}

// ========== 配置类型 ==========
export interface MAOptions {
  periods?: number[];
  type?: 'sma' | 'ema' | 'wma';
}

export interface MACDOptions {
  short?: number;
  long?: number;
  signal?: number;
}

export interface BOLLOptions {
  period?: number;
  stdDev?: number;
}

export interface KDJOptions {
  period?: number;
  kPeriod?: number;
  dPeriod?: number;
}

export interface RSIOptions {
  periods?: number[];
}

export interface WROptions {
  periods?: number[];
}

export interface IndicatorOptions {
  ma?: MAOptions | boolean;
  macd?: MACDOptions | boolean;
  boll?: BOLLOptions | boolean;
  kdj?: KDJOptions | boolean;
  rsi?: RSIOptions | boolean;
  wr?: WROptions | boolean;
}

// ========== 输出类型 ==========
export interface MAResult {
  [key: string]: number | null;  // ma5, ma10, ma20...
}

export interface MACDResult {
  dif: number | null;
  dea: number | null;
  macd: number | null;
}

export interface BOLLResult {
  mid: number | null;
  upper: number | null;
  lower: number | null;
  bandwidth: number | null;
}

export interface KDJResult {
  k: number | null;
  d: number | null;
  j: number | null;
}

export interface RSIResult {
  [key: string]: number | null;  // rsi6, rsi12, rsi24...
}

export interface WRResult {
  [key: string]: number | null;  // wr6, wr10...
}
```

### 2. `src/indicators/ma.ts` - 均线计算

```typescript
import { MAOptions, MAResult } from './types';

/**
 * 计算简单移动平均线 SMA
 */
export function calcSMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    let sum = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] !== null) {
        sum += data[j]!;
        count++;
      }
    }
    
    result.push(count === period ? sum / period : null);
  }
  
  return result;
}

/**
 * 计算指数移动平均线 EMA
 * 使用前 N 天的 SMA 作为 EMA 初始值，避免首日偏差
 */
export function calcEMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const alpha = 2 / (period + 1);
  let ema: number | null = null;
  let initialized = false;
  
  for (let i = 0; i < data.length; i++) {
    // 前 period-1 天数据不足，返回 null
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    // 第 period 天：用 SMA 初始化 EMA
    if (!initialized) {
      let sum = 0;
      let count = 0;
      for (let j = i - period + 1; j <= i; j++) {
        if (data[j] !== null) {
          sum += data[j]!;
          count++;
        }
      }
      if (count === period) {
        ema = sum / period;
        initialized = true;
      }
      result.push(ema);
      continue;
    }
    
    // 后续使用 EMA 公式递推
    const value = data[i];
    if (value === null) {
      result.push(ema);  // 遇到空值，保持上一个 EMA
    } else {
      ema = alpha * value + (1 - alpha) * ema!;
      result.push(ema);
    }
  }
  
  return result;
}

/**
 * 计算加权移动平均线 WMA
 */
export function calcWMA(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const weights = Array.from({ length: period }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    
    let sum = 0;
    let valid = true;
    for (let j = 0; j < period; j++) {
      const value = data[i - period + 1 + j];
      if (value === null) {
        valid = false;
        break;
      }
      sum += value * weights[j];
    }
    
    result.push(valid ? sum / weightSum : null);
  }
  
  return result;
}

/**
 * 批量计算均线
 */
export function calcMA(
  closes: (number | null)[],
  options: MAOptions = {}
): MAResult[] {
  const { periods = [5, 10, 20, 30, 60, 120, 250], type = 'sma' } = options;
  
  const calcFn = type === 'ema' ? calcEMA : type === 'wma' ? calcWMA : calcSMA;
  
  // 计算各周期均线
  const maArrays: { [key: string]: (number | null)[] } = {};
  for (const period of periods) {
    maArrays[`ma${period}`] = calcFn(closes, period);
  }
  
  // 转换为按索引的结果数组
  return closes.map((_, i) => {
    const result: MAResult = {};
    for (const period of periods) {
      result[`ma${period}`] = maArrays[`ma${period}`][i];
    }
    return result;
  });
}
```

### 3. `src/indicators/macd.ts` - MACD 计算

```typescript
import { MACDOptions, MACDResult } from './types';
import { calcEMA } from './ma';

/**
 * 计算 MACD 指标
 */
export function calcMACD(
  closes: (number | null)[],
  options: MACDOptions = {}
): MACDResult[] {
  const { short = 12, long = 26, signal = 9 } = options;
  
  // 计算短期和长期 EMA
  const emaShort = calcEMA(closes, short);
  const emaLong = calcEMA(closes, long);
  
  // 计算 DIF
  const dif: (number | null)[] = closes.map((_, i) => {
    if (emaShort[i] === null || emaLong[i] === null) return null;
    return emaShort[i]! - emaLong[i]!;
  });
  
  // 计算 DEA (DIF 的 EMA)
  const dea = calcEMA(dif, signal);
  
  // 计算 MACD 柱状图
  return closes.map((_, i) => ({
    dif: dif[i],
    dea: dea[i],
    macd: dif[i] !== null && dea[i] !== null 
      ? (dif[i]! - dea[i]!) * 2 
      : null,
  }));
}
```

### 4. `src/indicators/boll.ts` - 布林带计算

```typescript
import { BOLLOptions, BOLLResult } from './types';
import { calcSMA } from './ma';

/**
 * 计算标准差
 */
function calcStdDev(
  data: (number | null)[],
  period: number,
  ma: (number | null)[]
): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || ma[i] === null) {
      result.push(null);
      continue;
    }
    
    let sumSquares = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] !== null && ma[i] !== null) {
        sumSquares += Math.pow(data[j]! - ma[i]!, 2);
        count++;
      }
    }
    
    result.push(count === period ? Math.sqrt(sumSquares / period) : null);
  }
  
  return result;
}

/**
 * 计算布林带
 */
export function calcBOLL(
  closes: (number | null)[],
  options: BOLLOptions = {}
): BOLLResult[] {
  const { period = 20, stdDev = 2 } = options;
  
  // 计算中轨（MA）
  const mid = calcSMA(closes, period);
  
  // 计算标准差
  const std = calcStdDev(closes, period, mid);
  
  // 计算上下轨和带宽
  return closes.map((_, i) => {
    if (mid[i] === null || std[i] === null) {
      return { mid: null, upper: null, lower: null, bandwidth: null };
    }
    
    const upper = mid[i]! + stdDev * std[i]!;
    const lower = mid[i]! - stdDev * std[i]!;
    const bandwidth = mid[i]! !== 0 
      ? ((upper - lower) / mid[i]!) * 100 
      : null;
    
    return { mid: mid[i], upper, lower, bandwidth };
  });
}
```

### 5. `src/indicators/kdj.ts` - KDJ 计算

```typescript
import { OHLCV, KDJOptions, KDJResult } from './types';

/**
 * 计算 KDJ 指标
 */
export function calcKDJ(
  data: OHLCV[],
  options: KDJOptions = {}
): KDJResult[] {
  const { period = 9, kPeriod = 3, dPeriod = 3 } = options;
  
  const result: KDJResult[] = [];
  let k = 50;
  let d = 50;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ k: null, d: null, j: null });
      continue;
    }
    
    // 计算 N 日内最高价和最低价
    let highN = -Infinity;
    let lowN = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high !== null) highN = Math.max(highN, data[j].high!);
      if (data[j].low !== null) lowN = Math.min(lowN, data[j].low!);
    }
    
    const close = data[i].close;
    if (close === null || highN === lowN) {
      result.push({ k: null, d: null, j: null });
      continue;
    }
    
    // 计算 RSV
    const rsv = ((close - lowN) / (highN - lowN)) * 100;
    
    // 计算 K 值（平滑）
    k = ((kPeriod - 1) / kPeriod) * k + (1 / kPeriod) * rsv;
    
    // 计算 D 值（平滑）
    d = ((dPeriod - 1) / dPeriod) * d + (1 / dPeriod) * k;
    
    // 计算 J 值
    const j = 3 * k - 2 * d;
    
    result.push({
      k: Math.round(k * 100) / 100,
      d: Math.round(d * 100) / 100,
      j: Math.round(j * 100) / 100,
    });
  }
  
  return result;
}
```

### 6. `src/indicators/rsi.ts` - RSI 计算

```typescript
import { RSIOptions, RSIResult } from './types';

/**
 * 计算 RSI 指标
 */
export function calcRSI(
  closes: (number | null)[],
  options: RSIOptions = {}
): RSIResult[] {
  const { periods = [6, 12, 24] } = options;
  
  // 计算涨跌幅
  const changes: (number | null)[] = [null];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] === null || closes[i - 1] === null) {
      changes.push(null);
    } else {
      changes.push(closes[i]! - closes[i - 1]!);
    }
  }
  
  // 为每个周期计算 RSI
  const rsiArrays: { [key: string]: (number | null)[] } = {};
  
  for (const period of periods) {
    const rsi: (number | null)[] = [];
    let avgGain = 0;
    let avgLoss = 0;
    
    for (let i = 0; i < closes.length; i++) {
      if (i < period) {
        rsi.push(null);
        if (changes[i] !== null) {
          if (changes[i]! > 0) avgGain += changes[i]!;
          else avgLoss += Math.abs(changes[i]!);
        }
        continue;
      }
      
      if (i === period) {
        avgGain = avgGain / period;
        avgLoss = avgLoss / period;
      } else {
        const change = changes[i] ?? 0;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
      }
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
      }
    }
    
    rsiArrays[`rsi${period}`] = rsi;
  }
  
  // 转换为按索引的结果数组
  return closes.map((_, i) => {
    const result: RSIResult = {};
    for (const period of periods) {
      result[`rsi${period}`] = rsiArrays[`rsi${period}`][i];
    }
    return result;
  });
}
```

### 7. `src/indicators/wr.ts` - WR 计算

```typescript
import { OHLCV, WROptions, WRResult } from './types';

/**
 * 计算威廉指标 WR
 */
export function calcWR(
  data: OHLCV[],
  options: WROptions = {}
): WRResult[] {
  const { periods = [6, 10] } = options;
  
  const wrArrays: { [key: string]: (number | null)[] } = {};
  
  for (const period of periods) {
    const wr: (number | null)[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        wr.push(null);
        continue;
      }
      
      let highN = -Infinity;
      let lowN = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (data[j].high !== null) highN = Math.max(highN, data[j].high!);
        if (data[j].low !== null) lowN = Math.min(lowN, data[j].low!);
      }
      
      const close = data[i].close;
      if (close === null || highN === lowN) {
        wr.push(null);
        continue;
      }
      
      const wrValue = ((highN - close) / (highN - lowN)) * 100;
      wr.push(Math.round(wrValue * 100) / 100);
    }
    
    wrArrays[`wr${period}`] = wr;
  }
  
  return data.map((_, i) => {
    const result: WRResult = {};
    for (const period of periods) {
      result[`wr${period}`] = wrArrays[`wr${period}`][i];
    }
    return result;
  });
}
```

### 8. `src/indicators/index.ts` - 模块入口

```typescript
// 导出所有计算函数
export { calcSMA, calcEMA, calcWMA, calcMA } from './ma';
export { calcMACD } from './macd';
export { calcBOLL } from './boll';
export { calcKDJ } from './kdj';
export { calcRSI } from './rsi';
export { calcWR } from './wr';

// 导出类型
export * from './types';

// 综合计算函数
import { HistoryKline } from '../types';
import { IndicatorOptions } from './types';
import { calcMA } from './ma';
import { calcMACD } from './macd';
import { calcBOLL } from './boll';
import { calcKDJ } from './kdj';
import { calcRSI } from './rsi';
import { calcWR } from './wr';

/**
 * 为 K 线数据添加技术指标
 */
export function addIndicators<T extends HistoryKline>(
  klines: T[],
  options: IndicatorOptions = {}
): (T & {
  ma?: ReturnType<typeof calcMA>[0];
  macd?: ReturnType<typeof calcMACD>[0];
  boll?: ReturnType<typeof calcBOLL>[0];
  kdj?: ReturnType<typeof calcKDJ>[0];
  rsi?: ReturnType<typeof calcRSI>[0];
  wr?: ReturnType<typeof calcWR>[0];
})[] {
  const closes = klines.map(k => k.close);
  const ohlcv = klines.map(k => ({
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
    volume: k.volume,
  }));

  const maResult = options.ma ? calcMA(closes, typeof options.ma === 'object' ? options.ma : {}) : null;
  const macdResult = options.macd ? calcMACD(closes, typeof options.macd === 'object' ? options.macd : {}) : null;
  const bollResult = options.boll ? calcBOLL(closes, typeof options.boll === 'object' ? options.boll : {}) : null;
  const kdjResult = options.kdj ? calcKDJ(ohlcv, typeof options.kdj === 'object' ? options.kdj : {}) : null;
  const rsiResult = options.rsi ? calcRSI(closes, typeof options.rsi === 'object' ? options.rsi : {}) : null;
  const wrResult = options.wr ? calcWR(ohlcv, typeof options.wr === 'object' ? options.wr : {}) : null;

  return klines.map((kline, i) => ({
    ...kline,
    ...(maResult && { ma: maResult[i] }),
    ...(macdResult && { macd: macdResult[i] }),
    ...(bollResult && { boll: bollResult[i] }),
    ...(kdjResult && { kdj: kdjResult[i] }),
    ...(rsiResult && { rsi: rsiResult[i] }),
    ...(wrResult && { wr: wrResult[i] }),
  }));
}
```

---

## 使用示例

### 示例 1：一站式获取带指标的 K 线

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 获取带技术指标的日 K 线
const data = await sdk.getKlineWithIndicators('sz000001', {
  period: 'daily',
  startDate: '20240101',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    kdj: true,
  }
});

// 使用数据
data.forEach(k => {
  console.log(`${k.date}: 收盘 ${k.close}`);
  console.log(`  MA5=${k.ma?.ma5}, MA10=${k.ma?.ma10}`);
  console.log(`  MACD: DIF=${k.macd?.dif}, DEA=${k.macd?.dea}`);
  console.log(`  BOLL: 上=${k.boll?.upper}, 中=${k.boll?.mid}, 下=${k.boll?.lower}`);
  console.log(`  KDJ: K=${k.kdj?.k}, D=${k.kdj?.d}, J=${k.kdj?.j}`);
});
```

### 示例 2：独立使用指标计算函数

```typescript
import { StockSDK, calcMA, calcMACD, calcBOLL, calcKDJ } from 'stock-sdk';

const sdk = new StockSDK();
const klines = await sdk.getHistoryKline('sz000001');

// 提取收盘价数组
const closes = klines.map(k => k.close);

// 计算各种指标
const ma = calcMA(closes, { periods: [5, 10, 20], type: 'sma' });
const macd = calcMACD(closes, { short: 12, long: 26, signal: 9 });
const boll = calcBOLL(closes, { period: 20, stdDev: 2 });
const kdj = calcKDJ(klines, { period: 9 });

// 合并数据
const result = klines.map((k, i) => ({
  ...k,
  ma5: ma[i].ma5,
  ma10: ma[i].ma10,
  dif: macd[i].dif,
  dea: macd[i].dea,
  bollUpper: boll[i].upper,
  bollLower: boll[i].lower,
  kdjK: kdj[i].k,
}));
```

### 示例 3：港股/美股指标计算

```typescript
const sdk = new StockSDK();

// 港股腾讯带 MACD
const hkData = await sdk.getHKKlineWithIndicators('00700', {
  indicators: { macd: true, boll: true }
});

// 美股苹果带均线
const usData = await sdk.getUSKlineWithIndicators('105.AAPL', {
  indicators: { ma: { periods: [5, 10, 20, 60, 120] } }
});
```

---

## 扩展性考虑

### 1. 未来可添加的指标

| 指标 | 说明 | 优先级 |
|------|------|--------|
| DMI | 趋向指标 | 中 |
| OBV | 能量潮 | 中 |
| CCI | 商品通道指数 | 中 |
| SAR | 抛物线指标 | 低 |
| BIAS | 乖离率 | 低 |
| PSY | 心理线 | 低 |
| ARBR | 人气意愿指标 | 低 |
| DMA | 平均差 | 低 |
| TRIX | 三重指数平滑移动平均 | 低 |
| VR | 成交量比率 | 低 |

### 2. 性能优化建议

1. **增量计算**：对于实时数据，支持在已有结果基础上追加计算新数据点
2. **Web Worker**：大数据量计算时可选择在 Worker 中执行
3. **缓存机制**：相同参数的指标计算结果可缓存复用
4. **流式计算**：支持数据流式输入，边接收边计算

### 3. 可视化集成建议

```typescript
// 与 ECharts 集成示例
const data = await sdk.getKlineWithIndicators('sz000001', {
  indicators: { ma: true, macd: true }
});

const option = {
  xAxis: { data: data.map(d => d.date) },
  yAxis: [{ /* K线 */ }, { /* MACD */ }],
  series: [
    { type: 'candlestick', data: data.map(d => [d.open, d.close, d.low, d.high]) },
    { type: 'line', name: 'MA5', data: data.map(d => d.ma?.ma5) },
    { type: 'line', name: 'MA10', data: data.map(d => d.ma?.ma10) },
    { type: 'bar', name: 'MACD', yAxisIndex: 1, data: data.map(d => d.macd?.macd) },
  ]
};
```

---

## 实施计划

| 阶段 | 内容 | 预计工时 |
|------|------|---------|
| Phase 1 | 核心指标实现（MA/EMA/MACD/BOLL/KDJ/RSI/WR） | 4h |
| Phase 2 | 前置数据处理逻辑（日期回推、数据过滤） | 2h |
| Phase 3 | SDK 集成（getKlineWithIndicators 方法） | 2h |
| Phase 4 | 单元测试（包括边界情况） | 3h |
| Phase 5 | 文档更新 | 1h |
| Phase 6 | Playground 演示页面 | 1h |

---

## FAQ / 设计决策

### Q1: K 线数据的排序与日期格式是否有强约束？

**是的，有强约束**。SDK 层面要求：

| 约束 | 要求 | 原因 |
|------|-----|------|
| **排序** | 必须按时间**升序** | 指标计算依赖时间顺序 |
| **日期格式** | 统一 `YYYY-MM-DD` | 便于比较和过滤 |
| **验证机制** | 计算前会校验 | 不符合则抛出错误 |

SDK 的 `getHistoryKline` 等方法返回的数据已经满足这些约束，无需用户处理。

如果用户使用独立计算函数 `calcMA` 等，需自行确保数据格式正确。

### Q2: 是否允许 K 线中出现停牌/空值？如何处理？

**允许存在空值**，处理策略如下：

| 场景 | 处理方式 | 说明 |
|------|---------|------|
| 停牌导致的缺失日期 | 自然跳过 | 数据中不存在该日期，不影响计算 |
| 数据中 `close` 为 `null` | 按指标规则处理 | 见"统一缺失值处理策略" |
| 连续多日停牌 | 跨空值连续计算 | 不断开序列 |

示例：

```typescript
// 假设股票在 12/3 停牌
const klines = [
  { date: '2024-12-01', close: 10.5 },
  { date: '2024-12-02', close: 10.8 },
  // 12/3 停牌，数据中没有这一天
  { date: '2024-12-04', close: 11.0 },
  { date: '2024-12-05', close: 11.2 },
];

// 计算 MA3：正常计算，跨过缺失日期
// 12/4 的 MA3 = (10.5 + 10.8 + 11.0) / 3 = 10.77
```

---

## 检查清单

实现前请确认以下关键点：

### ✅ 核心功能

- [ ] MA/EMA/WMA 均线计算
- [ ] MACD（DIF/DEA/柱状图）计算
- [ ] BOLL（上中下轨、带宽）计算
- [ ] KDJ（K/D/J）计算
- [ ] RSI 计算
- [ ] WR 计算

### ✅ 前置数据处理（关键）

- [ ] `calcRequiredLookback()` 函数实现
- [ ] `calcActualStartDate()` 日期回推函数
- [ ] 实际请求日期范围扩展
- [ ] 返回数据按用户日期范围过滤
- [ ] 考虑交易日 vs 自然日的转换系数

### ✅ 边界情况处理

- [ ] 数据不足时返回 null
- [ ] 统一的缺失值处理策略
- [ ] EMA 使用 SMA 初始化（避免首日偏差）
- [ ] 浮点数精度控制（统一 round 函数）
- [ ] 除零保护（高低价相等、全涨/全跌等）
- [ ] 数据格式验证（升序检查）
- [ ] 分钟级数据跨日处理

### ✅ 数据格式约束

- [ ] K 线必须按时间升序排列
- [ ] 日期格式统一为 YYYY-MM-DD
- [ ] 使用时间戳进行日期比较
- [ ] 数据不足时触发"按需补拉"

### ✅ 测试覆盖

- [ ] 各指标基本计算正确性
- [ ] 前置数据不足场景
- [ ] 空值处理场景
- [ ] 日期范围过滤正确性
- [ ] 性能测试（大数据量）

---

## 总结

本方案设计了一套完整的技术指标计算系统：

1. **零依赖**：纯 TypeScript 实现，无需引入第三方库
2. **双模式**：提供一站式 API 和独立计算函数
3. **类型安全**：完整的 TypeScript 类型定义
4. **可扩展**：模块化设计，易于添加新指标
5. **智能数据处理**：自动处理前置数据获取，支持"按需补拉"策略
6. **数据一致性**：统一的缺失值处理策略，明确的数据格式约束
7. **算法稳定性**：EMA 使用 SMA 初始化，MACD 增加充足的回溯期
6. **边界情况完善**：处理各种异常情况，保证稳定性
7. **与现有工程无缝集成**：复用现有的 K 线数据获取方法

### 关键实现要点

1. **前置数据自动扩展**：根据指标配置计算所需前置天数，自动向前扩展请求范围
2. **交易日换算**：考虑周末和节假日，按 1.5 倍系数回推自然日
3. **结果过滤**：计算完成后只返回用户请求的日期范围内的数据
4. **null 值处理**：数据不足时对应字段返回 null，不影响其他数据

实施后，用户可以通过简单的 API 调用获取带技术指标的 K 线数据，无需关心前置数据获取和复杂的计算逻辑，极大简化了股票数据分析的开发工作。

