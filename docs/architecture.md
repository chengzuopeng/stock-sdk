# Stock SDK 工程架构优化方案

本文档设计 Stock SDK 的工程架构优化方案，解决当前单文件过大的问题，并为未来功能扩展提供可持续的架构支撑。

---

## 目录

- [现状分析](#现状分析)
- [设计目标](#设计目标)
- [架构设计](#架构设计)
- [目录结构](#目录结构)
- [核心模块设计](#核心模块设计)
- [渐进式迁移策略](#渐进式迁移策略)
- [代码示例](#代码示例)
- [扩展性分析](#扩展性分析)
- [实施计划](#实施计划)

---

## 现状分析

### 当前项目结构

```
stock-sdk/
├── src/
│   ├── index.ts          # 入口，导出
│   ├── sdk.ts            # SDK 主类（1198 行，持续增长）
│   ├── types.ts          # 类型定义
│   ├── utils.ts          # 工具函数
│   └── indicators/       # 技术指标（已模块化 ✅）
│       ├── index.ts
│       ├── types.ts
│       ├── ma.ts
│       ├── macd.ts
│       ├── boll.ts
│       ├── kdj.ts
│       ├── rsi.ts
│       ├── wr.ts
│       ├── bias.ts
│       ├── cci.ts
│       ├── atr.ts
│       └── addIndicators.ts
├── playground/           # 调试页面
├── dist/                 # 构建产物
└── ...
```

### 核心问题

| 问题 | 描述 | 影响 |
|------|------|------|
| **单文件过大** | `sdk.ts` 已达 1198 行，包含所有业务逻辑 | 难以维护、阅读困难 |
| **职责混杂** | HTTP 请求、数据解析、业务逻辑混在一起 | 难以测试、复用性差 |
| **数据源耦合** | 腾讯、东财等数据源代码混在一起 | 难以扩展新数据源 |
| **测试膨胀** | 单个测试文件超过 1000 行 | 测试难以定位 |

### 代码分布分析

当前 `sdk.ts` 中的代码大致分布：

| 功能模块 | 行数（估算） | 数据源 |
|----------|------------|--------|
| HTTP 请求封装 | ~50 行 | 通用 |
| 行情解析（FullQuote/SimpleQuote） | ~200 行 | 腾讯 |
| 资金流向（FundFlow/LargeOrder） | ~150 行 | 腾讯 |
| 港美股行情 | ~100 行 | 腾讯 |
| 基金行情 | ~50 行 | 腾讯 |
| A 股 K 线 | ~200 行 | 东财 |
| 港股 K 线 | ~100 行 | 东财 |
| 美股 K 线 | ~100 行 | 东财 |
| 分时数据 | ~100 行 | 腾讯 |
| 技术指标集成 | ~150 行 | 本地计算 |
| **总计** | **~1200 行** | |

---

## 设计目标

1. **单一职责**：每个模块只负责一个功能领域
2. **高内聚低耦合**：模块内部高度相关，模块间依赖最小化
3. **易于扩展**：新增数据源、指标、市场时无需修改现有代码
4. **易于测试**：每个模块可独立测试
5. **平滑迁移**：渐进式重构，不影响现有功能
6. **类型安全**：充分利用 TypeScript 类型系统
7. **零破坏性变更**：对外 API 保持完全兼容

---

## 架构设计

### 分层架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Application Layer                              │
│                    (用户代码 / Playground / Demo)                         │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              SDK Facade                                  │
│                         StockSDK (src/sdk.ts)                           │
│                                                                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │ A股行情方法  │  │ K线数据方法 │  │ 技术指标方法 │  │  扩展方法   │   │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│   Providers Layer │   │  Indicators Layer │   │    Core Layer     │
│   (数据源适配器)   │   │    (指标计算)     │   │   (基础设施)       │
├───────────────────┤   ├───────────────────┤   ├───────────────────┤
│ ┌───────────────┐ │   │ ┌───────────────┐ │   │ ┌───────────────┐ │
│ │   tencent/    │ │   │ │    ma.ts      │ │   │ │  request.ts   │ │
│ │   - quote.ts  │ │   │ ├───────────────┤ │   │ ├───────────────┤ │
│ │   - flow.ts   │ │   │ │   macd.ts     │ │   │ │  parser.ts    │ │
│ │   - timeline  │ │   │ ├───────────────┤ │   │ ├───────────────┤ │
│ └───────────────┘ │   │ │   boll.ts     │ │   │ │  utils.ts     │ │
│ ┌───────────────┐ │   │ ├───────────────┤ │   │ ├───────────────┤ │
│ │  eastmoney/   │ │   │ │   kdj.ts      │ │   │ │  constants.ts │ │
│ │ - aShareKline │ │   │ ├───────────────┤ │   │ └───────────────┘ │
│ │ - hkKline.ts  │ │   │ │    ...        │ │   │                   │
│ │ - usKline.ts  │ │   │ └───────────────┘ │   │                   │
│ └───────────────┘ │   │                   │   │                   │
└───────────────────┘   └───────────────────┘   └───────────────────┘
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              Types Layer                                 │
│                         (类型定义，纯声明)                                │
│                                                                          │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│   │  common.ts  │  │  quote.ts   │  │  kline.ts   │  │ indicator.ts│   │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 设计模式

| 模式 | 应用场景 | 说明 |
|------|---------|------|
| **门面模式 (Facade)** | `StockSDK` 类 | 统一对外接口，隐藏内部复杂性 |
| **适配器模式 (Adapter)** | `providers/` | 不同数据源适配为统一接口 |
| **策略模式 (Strategy)** | 指标计算、市场识别 | 可替换的算法实现 |
| **工厂模式 (Factory)** | 请求客户端创建 | 统一创建请求实例 |
| **依赖注入 (DI)** | Provider 函数 | 注入 RequestClient |

---

## 目录结构

### 目标结构

```
stock-sdk/
├── src/
│   ├── index.ts                  # 统一导出入口
│   ├── sdk.ts                    # SDK 门面类（~150 行）
│   │
│   ├── types/                    # 类型定义（按领域分组）
│   │   ├── index.ts              # 类型统一导出
│   │   ├── common.ts             # 通用类型（SDKOptions、MarketType）
│   │   ├── quote.ts              # 行情类型（FullQuote、SimpleQuote）
│   │   ├── kline.ts              # K 线类型（HistoryKline、MinuteKline）
│   │   ├── flow.ts               # 资金流向类型
│   │   └── indicator.ts          # 指标类型（从 indicators/types.ts 迁移）
│   │
│   ├── core/                     # 核心基础设施
│   │   ├── index.ts              # 导出
│   │   ├── request.ts            # HTTP 请求客户端封装
│   │   ├── parser.ts             # 响应解析器（腾讯格式）
│   │   ├── utils.ts              # 工具函数
│   │   └── constants.ts          # 常量定义（URL、默认值）
│   │
│   ├── providers/                # 数据源适配器（按数据源分组）
│   │   ├── index.ts              # 统一导出
│   │   │
│   │   ├── tencent/              # 腾讯财经数据源
│   │   │   ├── index.ts          # 腾讯模块导出
│   │   │   ├── constants.ts      # 腾讯 API 常量
│   │   │   ├── quote.ts          # 行情：getFullQuotes, getSimpleQuotes
│   │   │   ├── hkQuote.ts        # 港股行情
│   │   │   ├── usQuote.ts        # 美股行情
│   │   │   ├── fundQuote.ts      # 基金行情
│   │   │   ├── fundFlow.ts       # 资金流向：getFundFlow
│   │   │   ├── largeOrder.ts     # 大单：getPanelLargeOrder
│   │   │   └── timeline.ts       # 分时：getTodayTimeline
│   │   │
│   │   └── eastmoney/            # 东方财富数据源
│   │       ├── index.ts          # 东财模块导出
│   │       ├── constants.ts      # 东财 API 常量
│   │       ├── aShareKline.ts    # A股K线：getHistoryKline, getMinuteKline
│   │       ├── hkKline.ts        # 港股K线：getHKHistoryKline
│   │       └── usKline.ts        # 美股K线：getUSHistoryKline
│   │
│   ├── indicators/               # 技术指标（已模块化 ✅）
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── ma.ts
│   │   ├── macd.ts
│   │   ├── boll.ts
│   │   ├── kdj.ts
│   │   ├── rsi.ts
│   │   ├── wr.ts
│   │   ├── bias.ts
│   │   ├── cci.ts
│   │   ├── atr.ts
│   │   └── addIndicators.ts
│   │
│   └── __tests__/                # 测试文件（镜像源码结构）
│       ├── sdk.test.ts           # SDK 集成测试
│       ├── core/
│       │   ├── request.test.ts
│       │   ├── parser.test.ts
│       │   └── utils.test.ts
│       ├── providers/
│       │   ├── tencent/
│       │   │   ├── quote.test.ts
│       │   │   ├── fundFlow.test.ts
│       │   │   └── timeline.test.ts
│       │   └── eastmoney/
│       │       ├── aShareKline.test.ts
│       │       ├── hkKline.test.ts
│       │       └── usKline.test.ts
│       └── indicators/
│           ├── ma.test.ts
│           ├── macd.test.ts
│           └── ...
│
├── playground/                   # 调试页面
├── dist/                         # 构建产物
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

### 模块职责说明

| 模块 | 职责 | 依赖关系 | 示例内容 |
|------|------|---------|----------|
| `types/` | 纯类型定义，零运行时代码 | 无依赖 | `HistoryKline`, `FullQuote` |
| `core/` | 基础设施，与业务无关 | 仅依赖 types | HTTP 请求、响应解析、工具函数 |
| `providers/` | 数据源适配，封装第三方 API | 依赖 core + types | 腾讯行情、东财 K 线 |
| `indicators/` | 技术指标计算，纯函数 | 仅依赖 types | `calcMA()`, `calcMACD()` |
| `sdk.ts` | 门面类，组合各模块 | 依赖所有模块 | `new StockSDK()` |
| `index.ts` | 导出入口 | 依赖 sdk + types | 公开 API |

---

## 核心模块设计

### 1. Core 层：请求客户端

```typescript
// src/core/request.ts
import { decodeGBK, parseResponse } from './parser';

export interface RequestClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class RequestClient {
  private timeout: number;

  constructor(options: RequestClientOptions = {}) {
    this.timeout = options.timeout ?? 30000;
  }

  /**
   * 发送 GET 请求
   */
  async get<T = string>(url: string, options: {
    responseType?: 'text' | 'json' | 'arraybuffer';
  } = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const resp = await fetch(url, { signal: controller.signal });

      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      switch (options.responseType) {
        case 'json':
          return await resp.json();
        case 'arraybuffer':
          return await resp.arrayBuffer() as T;
        default:
          return await resp.text() as T;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 腾讯财经专用请求（GBK 解码）
   */
  async getTencentQuote(baseUrl: string, params: string): Promise<{ key: string; fields: string[] }[]> {
    const url = `${baseUrl}/?q=${encodeURIComponent(params)}`;
    const buffer = await this.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    const text = decodeGBK(buffer);
    return parseResponse(text);
  }
}
```

### 2. Provider 层：数据源适配

```typescript
// src/providers/tencent/quote.ts
import { RequestClient } from '../../core/request';
import { FullQuote, SimpleQuote } from '../../types';
import { TENCENT_BASE_URL } from './constants';
import { parseFullQuote, parseSimpleQuote } from './parsers';

/**
 * 获取 A 股全量行情
 */
export async function getFullQuotes(
  client: RequestClient,
  codes: string[]
): Promise<FullQuote[]> {
  if (codes.length === 0) return [];

  const params = codes.join(',');
  const data = await client.getTencentQuote(TENCENT_BASE_URL, params);

  return data
    .map(item => parseFullQuote(item))
    .filter((q): q is FullQuote => q !== null);
}

/**
 * 获取简要行情
 */
export async function getSimpleQuotes(
  client: RequestClient,
  codes: string[]
): Promise<SimpleQuote[]> {
  if (codes.length === 0) return [];

  const prefixedCodes = codes.map(c => `s_${c}`);
  const params = prefixedCodes.join(',');
  const data = await client.getTencentQuote(TENCENT_BASE_URL, params);

  return data
    .map(item => parseSimpleQuote(item))
    .filter((q): q is SimpleQuote => q !== null);
}
```

```typescript
// src/providers/eastmoney/aShareKline.ts
import { RequestClient } from '../../core/request';
import { HistoryKline, MinuteKline } from '../../types';
import { EM_KLINE_URL, EM_TRENDS_URL } from './constants';
import { parseHistoryKline, parseMinuteKline, getMarketCode, getPeriodCode } from './utils';

export interface HistoryKlineOptions {
  period?: 'daily' | 'weekly' | 'monthly';
  adjust?: '' | 'qfq' | 'hfq';
  startDate?: string;
  endDate?: string;
}

/**
 * 获取 A 股历史 K 线
 */
export async function getHistoryKline(
  client: RequestClient,
  symbol: string,
  options: HistoryKlineOptions = {}
): Promise<HistoryKline[]> {
  const { period = 'daily', adjust = 'hfq', startDate, endDate } = options;

  // 处理代码格式
  const pureCode = symbol.replace(/^(sh|sz|bj)/, '');
  const marketCode = getMarketCode(symbol);
  const secid = `${marketCode}.${pureCode}`;

  // 构建请求参数
  const params = new URLSearchParams({
    secid,
    fields1: 'f1,f2,f3,f4,f5,f6',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    klt: getPeriodCode(period),
    fqt: adjust === 'hfq' ? '2' : adjust === 'qfq' ? '1' : '0',
    ...(startDate && { beg: startDate }),
    ...(endDate && { end: endDate }),
  });

  const url = `${EM_KLINE_URL}?${params.toString()}`;
  const json = await client.get<any>(url, { responseType: 'json' });

  return parseHistoryKline(json, pureCode);
}
```

### 3. SDK 门面类

```typescript
// src/sdk.ts（重构后约 150-200 行）
import { RequestClient, RequestClientOptions } from './core/request';
import * as tencent from './providers/tencent';
import * as eastmoney from './providers/eastmoney';
import { addIndicators, IndicatorOptions } from './indicators';
import {
  FullQuote,
  SimpleQuote,
  HistoryKline,
  HKUSHistoryKline,
  MarketType,
} from './types';

export interface GetAllAShareQuotesOptions {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}

export class StockSDK {
  private client: RequestClient;

  constructor(options: RequestClientOptions = {}) {
    this.client = new RequestClient(options);
  }

  // ==================== 行情 ====================

  getFullQuotes(codes: string[]): Promise<FullQuote[]> {
    return tencent.getFullQuotes(this.client, codes);
  }

  getSimpleQuotes(codes: string[]): Promise<SimpleQuote[]> {
    return tencent.getSimpleQuotes(this.client, codes);
  }

  getHKQuotes(codes: string[]) {
    return tencent.getHKQuotes(this.client, codes);
  }

  getUSQuotes(codes: string[]) {
    return tencent.getUSQuotes(this.client, codes);
  }

  getFundQuotes(codes: string[]) {
    return tencent.getFundQuotes(this.client, codes);
  }

  // ==================== 资金流向 ====================

  getFundFlow(codes: string[]) {
    return tencent.getFundFlow(this.client, codes);
  }

  getPanelLargeOrder(codes: string[]) {
    return tencent.getPanelLargeOrder(this.client, codes);
  }

  // ==================== K 线 ====================

  getHistoryKline(symbol: string, options?: eastmoney.HistoryKlineOptions) {
    return eastmoney.getHistoryKline(this.client, symbol, options);
  }

  getMinuteKline(symbol: string, options?: eastmoney.MinuteKlineOptions) {
    return eastmoney.getMinuteKline(this.client, symbol, options);
  }

  getHKHistoryKline(symbol: string, options?: eastmoney.HKKlineOptions) {
    return eastmoney.getHKHistoryKline(this.client, symbol, options);
  }

  getUSHistoryKline(symbol: string, options?: eastmoney.USKlineOptions) {
    return eastmoney.getUSHistoryKline(this.client, symbol, options);
  }

  // ==================== 分时 ====================

  getTodayTimeline(code: string) {
    return tencent.getTodayTimeline(this.client, code);
  }

  // ==================== 批量 ====================

  async getAShareCodeList(includeExchange = true): Promise<string[]> {
    return tencent.getAShareCodeList(this.client, includeExchange);
  }

  async getAllAShareQuotes(options: GetAllAShareQuotesOptions = {}) {
    const codes = await this.getAShareCodeList();
    return this.getAllQuotesByCodes(codes, options);
  }

  async getAllQuotesByCodes(codes: string[], options: GetAllAShareQuotesOptions = {}) {
    return tencent.getAllQuotesByCodes(this.client, codes, options);
  }

  // ==================== 技术指标 ====================

  async getKlineWithIndicators(
    symbol: string,
    options: {
      market?: MarketType;
      period?: 'daily' | 'weekly' | 'monthly';
      adjust?: '' | 'qfq' | 'hfq';
      startDate?: string;
      endDate?: string;
      indicators?: IndicatorOptions;
    } = {}
  ): Promise<KlineWithIndicators[]> {
    // 市场识别 & K 线获取 & 指标计算 逻辑
    // ... 详见 indicator.md 中的完整实现
  }

  // ==================== 内部方法 ====================

  private detectMarket(symbol: string): MarketType {
    // ...
  }

  private async fetchKlineByMarket(symbol: string, market: MarketType, options: any) {
    // ...
  }
}

export default StockSDK;
```

### 4. 导出策略

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
  calcSMA,
  calcEMA,
  calcWMA,
  calcMACD,
  calcBOLL,
  calcKDJ,
  calcRSI,
  calcWR,
  calcBIAS,
  calcCCI,
  calcATR,
  addIndicators,
} from './indicators';

// 导出指标类型
export type {
  IndicatorOptions,
  MAOptions,
  MACDOptions,
  BOLLOptions,
  KDJOptions,
  RSIOptions,
  WROptions,
  BIASOptions,
  CCIOptions,
  ATROptions,
  KlineWithIndicators,
} from './indicators';
```

---

## 渐进式迁移策略

为避免一次性大规模重构带来的风险，采用分阶段迁移：

### Phase 1：基础设施抽取（低风险）

**目标**：抽取 `core/` 模块

**步骤**：
1. 创建 `src/core/` 目录
2. 将 `request` 相关代码抽取到 `core/request.ts`
3. 将 `decodeGBK`、`parseResponse` 移到 `core/parser.ts`
4. 将 `chunkArray`、`asyncPool` 移到 `core/utils.ts`
5. 将常量定义移到 `core/constants.ts`
6. `sdk.ts` 改为 import from `./core`
7. 运行测试确认无回归

**预计影响**：
- `sdk.ts` 减少约 100 行
- 新增 `core/` 约 150 行

### Phase 2：类型拆分（低风险）

**目标**：拆分 `types/` 模块

**步骤**：
1. 创建 `src/types/` 目录
2. 按领域拆分类型：`common.ts`、`quote.ts`、`kline.ts`、`flow.ts`
3. 创建 `types/index.ts` 统一导出
4. 更新所有 import 路径
5. 删除原 `src/types.ts`

**预计影响**：
- 类型更清晰，易于查找
- import 语句可能需要更新

### Phase 3：Provider 拆分（中等风险）

**目标**：按数据源拆分 `providers/`

**步骤**（每次只迁移一个 Provider 函数）：

1. **腾讯行情**（首先迁移，作为模板）
   - 创建 `src/providers/tencent/quote.ts`
   - 将 `getFullQuotes`、`getSimpleQuotes` 迁移
   - `sdk.ts` 改为调用 provider 函数
   - 测试验证

2. **腾讯资金流向**
   - 创建 `src/providers/tencent/fundFlow.ts`
   - 迁移 `getFundFlow`、`getPanelLargeOrder`

3. **腾讯港美股/基金**
   - 创建对应文件，迁移方法

4. **腾讯分时**
   - 创建 `src/providers/tencent/timeline.ts`
   - 迁移 `getTodayTimeline`

5. **东财 A 股 K 线**
   - 创建 `src/providers/eastmoney/aShareKline.ts`
   - 迁移 `getHistoryKline`、`getMinuteKline`

6. **东财港股/美股 K 线**
   - 创建对应文件，迁移方法

**预计影响**：
- `sdk.ts` 显著减少（每迁移一个方法减少 50-100 行）
- 最终 `sdk.ts` 约 150-200 行

### Phase 4：测试拆分（低风险）

**目标**：按模块拆分测试文件

**步骤**：
1. 创建 `src/__tests__/` 目录结构
2. 逐步迁移测试用例到对应模块
3. 保留 `sdk.test.ts` 作为集成测试
4. 删除原 `index.test.ts`

### 迁移风险矩阵

| 阶段 | 风险 | 回滚难度 | 测试覆盖要求 |
|------|------|---------|-------------|
| Phase 1 | 低 | 简单 | 现有测试通过 |
| Phase 2 | 低 | 简单 | 类型检查通过 |
| Phase 3 | 中 | 中等 | 每步测试验证 |
| Phase 4 | 低 | 简单 | 覆盖率不下降 |

---

## 代码规模预估

### 重构前后对比

| 模块 | 重构前 | 重构后 | 变化 |
|------|--------|--------|------|
| `sdk.ts` | 1198 行 | ~150 行 | -87% |
| `core/` | - | ~200 行 | +200 行 |
| `types/` | 150 行 | ~250 行 | +100 行 |
| `providers/tencent/` | - | ~400 行 | +400 行 |
| `providers/eastmoney/` | - | ~350 行 | +350 行 |
| `indicators/` | 400 行 | 400 行 | 不变 |
| **总计** | ~1750 行 | ~1750 行 | ≈0 |

> **说明**：总代码量基本不变，但模块化后每个文件更小、职责更清晰。

### 单文件最大行数约束

| 类型 | 建议最大行数 | 原因 |
|------|-------------|------|
| SDK 门面类 | 200 行 | 只做组合，不含业务逻辑 |
| Provider 文件 | 300 行 | 单一数据源的单一功能 |
| 指标计算文件 | 200 行 | 单一指标 |
| 类型定义文件 | 150 行 | 按领域分组 |
| 工具函数文件 | 150 行 | 通用工具 |

---

## 扩展性分析

### 支持的扩展场景

| 场景 | 如何扩展 | 影响范围 |
|------|---------|---------|
| 新增数据源（如新浪财经） | 在 `providers/` 下新增 `sina/` 目录 | 仅新增文件 |
| 新增指标（如 DMI、OBV） | 在 `indicators/` 下新增对应文件 | 仅新增文件 |
| 新增市场（如期货、期权） | 在 `providers/` 或 `types/` 扩展 | 仅新增文件 |
| 支持 WebSocket 实时推送 | 在 `core/` 下新增 `websocket.ts` | 新增模块 |
| 支持数据缓存 | 在 `core/` 下新增 `cache.ts` | 新增模块 |
| 支持请求重试 | 在 `core/request.ts` 扩展 | 修改现有 |

### 新增数据源示例

假设要新增"新浪财经"数据源：

```
src/providers/
├── sina/                     # 新增
│   ├── index.ts
│   ├── constants.ts
│   ├── quote.ts              # 新浪行情
│   └── parser.ts             # 新浪响应解析
├── tencent/
└── eastmoney/
```

```typescript
// src/providers/sina/quote.ts
import { RequestClient } from '../../core/request';
import { FullQuote } from '../../types';

export async function getSinaQuotes(
  client: RequestClient,
  codes: string[]
): Promise<FullQuote[]> {
  // 新浪财经 API 调用逻辑
}
```

```typescript
// src/sdk.ts - 新增方法
import * as sina from './providers/sina';

export class StockSDK {
  // ... 现有方法

  getSinaQuotes(codes: string[]) {
    return sina.getSinaQuotes(this.client, codes);
  }
}
```

---

## 实施计划

| 阶段 | 内容 | 预计工时 | 优先级 |
|------|------|---------|--------|
| Phase 1 | 抽取 `core/` 模块 | 2h | 高 |
| Phase 2 | 拆分 `types/` 模块 | 1h | 高 |
| Phase 3-1 | 迁移腾讯行情 | 2h | 高 |
| Phase 3-2 | 迁移腾讯资金流向 | 1h | 中 |
| Phase 3-3 | 迁移腾讯港美股/基金 | 1h | 中 |
| Phase 3-4 | 迁移腾讯分时 | 1h | 中 |
| Phase 3-5 | 迁移东财 A 股 K 线 | 2h | 中 |
| Phase 3-6 | 迁移东财港股/美股 K 线 | 1h | 中 |
| Phase 4 | 拆分测试文件 | 2h | 低 |
| **总计** | | **13h** | |

---

## 检查清单

### 迁移完成标准

- [ ] `sdk.ts` 行数 < 200
- [ ] 每个模块文件 < 300 行
- [ ] 所有测试通过
- [ ] 覆盖率不下降
- [ ] 对外 API 完全兼容
- [ ] TypeScript 编译无错误
- [ ] 构建产物大小无明显增加
- [ ] README 文档无需更新（API 兼容）

### 代码质量要求

- [ ] 每个模块有明确的单一职责
- [ ] Provider 函数接收 `RequestClient` 作为第一个参数
- [ ] 类型定义与实现分离
- [ ] 常量集中管理
- [ ] 工具函数纯函数化
- [ ] 错误处理统一

---

## 总结

本方案采用**分层 + 模块化**架构，通过以下手段解决当前问题：

1. **门面模式**：`StockSDK` 类作为统一入口，隐藏内部复杂性
2. **Provider 模式**：按数据源分组，便于扩展新数据源
3. **分层架构**：Core → Providers → SDK，职责清晰
4. **渐进式迁移**：低风险分阶段重构，每步可验证

**核心收益**：

| 指标 | 重构前 | 重构后 |
|------|--------|--------|
| `sdk.ts` 行数 | 1198 行 | ~150 行 |
| 单文件最大行数 | 1198 行 | ~300 行 |
| 模块数 | 4 个 | 15+ 个 |
| 新增数据源难度 | 高（修改大文件） | 低（新增文件） |
| 测试定位难度 | 高 | 低 |

这套架构可以支撑 SDK 功能扩展到 5000+ 行代码规模，同时保持良好的可维护性。

