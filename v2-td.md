# stock-sdk v2.0.0 技术方案（Technical Design）

> 状态：草案 v0.1 · 分支：`feature-v2` · 起始版本：`1.10.1` → 目标：`2.0.0`
> 范围：在**现有三源数据能力之上**完成一次架构级升级（明确不接入新数据源、不做实时订阅）。

---

## 目录

- [1. 背景与目标](#1-背景与目标)
- [2. 设计原则与约束](#2-设计原则与约束)
- [3. 已确认的设计决策](#3-已确认的设计决策)
- [4. 总体架构](#4-总体架构)
- [5. A1 — 统一符号模型](#5-a1--统一符号模型)
- [6. A2 — 统一数据契约](#6-a2--统一数据契约)
- [7. A3 — 命名空间化 + subpath 导出](#7-a3--命名空间化--subpath-导出)
- [8. A4 — 请求层 v2 + 错误统一](#8-a4--请求层-v2--错误统一)
- [9. A5 — 清债](#9-a5--清债)
- [10. B1 — 指标信号层](#10-b1--指标信号层)
- [11. B2 — 选股器 + 回测](#11-b2--选股器--回测)
- [12. B3 — 统一缓存层](#12-b3--统一缓存层)
- [13. 分阶段实施路线](#13-分阶段实施路线)
- [14. 验证策略](#14-验证策略)
- [15. 文档同步](#15-文档同步)
- [16. 破坏性变更与迁移指南](#16-破坏性变更与迁移指南)
- [17. 风险与缓解](#17-风险与缓解)
- [18. 文档站版本化（v1 文档留存）](#18-文档站版本化v1-文档留存)

---

## 1. 背景与目标

`stock-sdk` 当前为 `v1.10.1`，经历 18 个版本的「持续加数据接口」式增长。三层架构（**provider 取数 → service 编排 → 门面薄委托**）保持干净，但伴随能力膨胀，积累了若干**结构性技术债**：

| 债务 | 现状证据 |
|---|---|
| 符号格式不统一 | A股 `sh600519`、港股 `00700`/`hk00700`、美股分钟K线要 `105.AAPL`；符号处理散落 **15+ 处**，无统一 `normalizeSymbol` |
| 返回契约不统一 | ~85 个类型；**8 个**带 `raw: string[]`（泄漏实现）；**13 个** `timestamp` 用 `NaN` 表达无效；**20+** 日期类缺 `tz`；单位混乱（`amount` 万/元混用、`volume` 手/股混用、`FullQuote` 有 `volume`+`volume2` 重复字段）；命名漂移（`marketCap` vs `totalMarketCap`、`mainNet` vs `mainNetInflow`） |
| 门面扁平巨胖 | **105 个**方法平铺在 `sdk.getXxx()`；`import StockSDK` 即拉入全部 service，tree-shaking 不友好 |
| 请求层不可组合 | `fetch` 硬编码，无法注入自定义 `fetch` / 外部 `AbortSignal`；多处仍抛裸 `Error`/`RangeError`/`DOMException` |
| 历史包袱 | **16 处** `@deprecated` + `getAShareCodeList(boolean)` 等旧签名长期未清 |

**目标**：把 v2.0.0 做成「**架构跃迁**」而非「再加接口」。在不扩展数据源、不引入实时订阅的前提下，完成**地基重构**（符号 / 契约 / API 表面 / 请求层 / 清债）+ **上层增值**（信号 / 选股回测 / 缓存），产出一个统一、干净、可 tree-shake、对程序友好的 SDK。

**非目标（本次明确不做）**：接入新数据源 / 可插拔 provider 框架；WebSocket / SSE / 智能轮询等实时订阅能力；React/Vue 框架封装；CLI。

---

## 2. 设计原则与约束

1. **零运行时依赖**：`package.json` 当前无任何 `dependencies`，v2 维持。所有新能力（符号解析、信号、回测、缓存）均为手写纯逻辑。
2. **浏览器 + Node 双端**：所有代码双端可用；涉及 `<script>` 注入的源继续复用 `core/jsVars.ts` + `core/scriptMutex.ts`。
3. **完整 TypeScript 类型**：禁止新增 `any`；公共 API 必须有 JSDoc。
4. **单轨硬切**：v2 允许破坏性变更，**不提供** `compat` 兼容入口、**不保留**旧类型别名。靠迁移指南 + CHANGELOG 承接。
5. **分层边界不破**：provider 只取数解析、service 编排、门面/命名空间只做薄委托。

---

## 3. 已确认的设计决策

| # | 决策 | 说明 |
|---|---|---|
| D1 | **百分比统一百分数**（`5.2` 而非 `0.052`） | 腾讯 `changePercent: safeNumber(f[32])` 现状即百分数，本项主要是对齐个别小数口径字段（如部分 `ratio`） |
| D2 | **`raw` 字段彻底移除** | 逃生舱改为 provider 层 `getXxxRaw()` 调试函数，不进数据对象 |
| D3 | **符号入参 `string` 一等公民 + `SymbolRef` 可选** | 核心投入在 `normalizeSymbol()` 容错解析；`SymbolRef` 是「带提示的 string」 |
| D4 | **增值层 B1/B2/B3 随 2.0 一起发** | 既有里子（干净 API）又有面子（信号/选股/回测） |
| D5 | **不提供 compat 兼容入口** | 单轨硬切 |
| D6 | **单位统一最小单位 + 原生币种** | `volume`→**股**；`amount`/`price`/市值→**该标的计价货币的主单位**（由 `currency` 决定：A股=人民币元 / 港股=港元 / 美股=美元），**不跨币种折算** |

> ⚠️ **D6 实施状态（本期暂缓，TODO）**：单位换算（`volume`→股、`amount`→主单位等 ×100 / ×10000 折算）**本期未实现**——各 provider 仍输出数据源原始口径（如腾讯 A 股 `volume`=手、`amount`=万元）。原因：正确的换算倍率必须用**真实数据**逐源逐字段核对，纯单测（mock 数据自证）无法验证换算是否正确，盲改有引入错误数值、跨源口径不一致的风险。**TODO**：留到能跑集成测试（真实数据）的阶段统一校准后再落地；在此之前，下方数据契约里 `volume` / `amount` 的单位注释表示「**目标口径**」，实际运行值以各源原始口径为准。

---

## 4. 总体架构

| 层 | 方向 | 性质 |
|---|---|---|
| **地基（Breaking）** | A1 统一符号模型 / A2 统一数据契约 / A3 命名空间化+subpath 导出 / A4 请求层 v2+错误统一 / A5 清债 | 重构 |
| **增值（New）** | B1 指标信号层 / B2 选股器+回测 / B3 统一缓存层 | 纯新增 |

### 依赖图

```
A5(清债-错误收编) ──┐  先行地基
A4(请求层 v2)      ──┤→ A1(符号) → A2(契约) → A3(命名空间+subpath) ─┐
                    │                                              ├→ B3(缓存) → B2(选股+回测)
B1(指标信号层) ─────┴───── 可与 A3 并行(纯计算不依赖门面) ─────────┴→ v2.0.0 发布
```

### 目标目录结构（新增/调整部分）

```text
src/
├── symbols/                 # 【新增 A1】统一符号模型(纯函数,零依赖,不发请求)
│   ├── types.ts             #   Market / AssetType / SymbolRef / NormalizedSymbol
│   ├── infer.ts             #   纯码推断(收编原 getMarketCode)
│   ├── normalize.ts         #   normalizeSymbol 主入口(容错解析)
│   ├── adapters.ts          #   toTencentSymbol / toEastmoneySecid / ...
│   ├── futures.ts           #   期货品种表 + getFuturesMarketCode/extractVariety
│   └── index.ts
├── types/
│   └── base.ts              # 【新增 A2】BaseRecord / TimedRecord / BaseQuote
├── sdk/
│   └── namespaces/          # 【新增 A3】命名空间薄包装类
│       ├── quotesNs.ts / klineNs.ts / boardNs.ts / optionsNs.ts ...
│       └── index.ts
├── signals/                 # 【新增 B1】指标信号层(金叉/死叉/超买超卖)
│   ├── types.ts / cross.ts / threshold.ts / index.ts
├── screener/                # 【新增 B2】选股器 + 回测
│   ├── screener.ts / backtest.ts / index.ts
├── cache/                   # 【新增 B3】统一缓存层入口(基于 core/cache)
│   └── index.ts
└── (core / providers / indicators 原结构保留,内部改造)
```

---

## 5. A1 — 统一符号模型

### 5.1 问题

同一只标的，在不同方法里写法不同，且推断逻辑散落：

- 核心推断：`src/core/utils.ts` 的 `getMarketCode()`（按 `sh/sz/bj` 前缀或首字推断，北交所靠 `startsWith('92')`）。
- 三套目标格式：
  - **腾讯**：`sh600519` / `hk00700` / `usAAPL`（`getSimpleQuotes` 额外加 `s_`，`batch` 里去前缀）。
  - **东财 secid**：A股 `${marketCode}.${code}`（`1.600519` / `0.000001`）、港股 `116.${code.padStart(5,'0')}`、美股直接 `105.AAPL`、板块 `90.${code}`、期货走 `FUTURES_EXCHANGE_MAP` + `getFuturesMarketCode()`。
  - **范本**：`src/providers/eastmoney/historyKlineFactory.ts` 的 `createHistoryKlineProvider()` 已用「provider 传 `normalizeSymbol` 回调返回 `{secid, fallbackCode}`」的模式 —— v2 把它推广到所有 provider。

### 5.2 核心类型（`src/symbols/types.ts`）

```ts
export type Market = 'CN' | 'HK' | 'US' | 'GLOBAL'; // GLOBAL = 海外期货/商品(COMEX/NYMEX/CBOT/LME 等)
export type AssetType = 'stock' | 'index' | 'fund' | 'bond' | 'futures' | 'option' | 'board';

/** 用户入参：裸 string，或「带提示的 string」 */
export interface SymbolRef {
  code: string;
  market?: Market;
  assetType?: AssetType;
  exchange?: string;
}

/** SDK 内部唯一表示，所有 provider 适配器只认它 */
export interface NormalizedSymbol {
  market: Market;
  assetType: AssetType;
  exchange: string;          // 强判别字段:股票 'SSE'|'SZSE'|'BSE'|'HKEX'|'NASDAQ'|'NYSE';
                             // 国内期货 'SHFE'|'DCE'|'CZCE'|'INE'|'CFFEX'|'GFEX';海外期货 'COMEX'|'NYMEX'|'CBOT'|'LME' 等
  code: string;              // 纯代码,无前缀(如 '600519' / '00700' / 'AAPL' / 'IF2412')
  variety?: string;          // 期货品种(如 'IF' / 'rb')
  input: string;             // 原始入参,便于报错与调试
}

export type SymbolInput = string | SymbolRef;
```

> **`market` 与 `exchange` 的关系**：`market` 表示交易区域/体系（`CN`/`HK`/`US`/`GLOBAL`），`exchange` 才是**强判别字段**。全球期货（COMEX/NYMEX/CBOT/LME 等，对应 `getGlobalFuturesSpot`/`getGlobalFuturesKline`）归 `market: 'GLOBAL'`，靠 `exchange` 区分交易所；国内期货归 `market: 'CN'` + `exchange: 'SHFE'|'DCE'|...`。

### 5.3 `normalizeSymbol` 解析策略（`src/symbols/normalize.ts`）

```ts
export function normalizeSymbol(input: SymbolInput, hint?: Partial<SymbolRef>): NormalizedSymbol;
```

**关键设计**：`SymbolRef.code` 也走 `normalizeSymbol`，即 `SymbolRef` 只是「带提示的 string」，与裸 string 共用同一套推断，**杜绝双实现漂移**。`hint` 与 `SymbolRef` 字段冲突时，**显式入参优先**。

**解析优先级链（命中即停）**：

| 顺序 | 规则 | 示例 |
|---|---|---|
| 1 | 显式 `SymbolRef` / `hint` 字段 | `{code:'600519', assetType:'index'}` |
| 2 | 点分后缀 | `600519.SH` / `00700.HK` |
| 3 | 字母前缀 | `sh600519` / `hk00700` / `usAAPL` |
| 4 | 东财 secid 直传 | `1.600519` / `116.00700` / `105.AAPL` / `90.BK0475` |
| 5 | 期货格式 | `rb2510` / `RBM`(主连) / `CFFEX.IF2412` |
| 6 | 纯码推断（见 5.4） | `600519` / `00700` / `AAPL` |
| 7 | 失败 | `throw new InvalidSymbolError(...)`（已存在于 `core/errors.ts`） |

### 5.4 纯码歧义规则

| 形态 | 默认推断 | 备注 |
|---|---|---|
| 6 位纯数字 | CN stock | 首位收编现 `getMarketCode`：`6/5/9*`→SSE，`0/3` →SZSE，`4/8/920*`→BSE |
| 5 位纯数字 | HK stock | |
| 纯字母 | US stock；命中期货品种表则 futures | |

**已知歧义（必须 hint）**：
- 基金开放式代码段与股票代码段重叠 → 纯 code 无法区分，必须 `hint.assetType='fund'` 或 `SymbolRef`。
- 6 位想当 index（如 `000001` 指数 vs 平安银行）→ 需 `hint.assetType='index'`。
- 5 位想当 A股 B股而非港股 → 需 `hint.market='CN'`。

> 这些歧义需在 `website/guide/` 新增「符号与代码规则」页明确列出。

### 5.5 provider 适配层（`src/symbols/adapters.ts`）

纯函数，签名统一 `(ns: NormalizedSymbol) => string`，marketCode 映射表（`0/1/116/105/90`）集中一处：

```ts
export function toTencentSymbol(ns: NormalizedSymbol): string;     // → 'sh600519' / 'hk00700' / 'usAAPL'
export function toEastmoneySecid(ns: NormalizedSymbol): string;    // → '1.600519' / '116.00700' / '105.AAPL'
export function toEastmoneyPureCode(ns: NormalizedSymbol): string; // → '600519'
export function toFuturesSecid(ns: NormalizedSymbol): string;      // 走 futures.ts 品种/交易所映射
```

### 5.6 收编计划（15+ 散落点）

每个 provider 内部第一行 `const ns = normalizeSymbol(symbol)` + 调对应 `toXxx(ns)`，替换掉所有 `.replace(/^(sh|sz|bj)/)`、`.padStart(5,'0')`、`.split('.')`、手拼 secid。代表性文件：

- `providers/eastmoney/{aShareKline, hkKline, usKline, fundFlow, dragonTiger, dividend, northbound, futuresKline, boardCommon}.ts`
- `providers/tencent/{quote, hkQuote, usQuote, batch}.ts`

**老函数去向**：
- 删除 `src/core/utils.ts` 的 `getMarketCode`（及 `core/index.ts` 的导出），逻辑迁入 `symbols/infer.ts`。
- 期货 `getFuturesMarketCode` / `extractVariety` 迁入 `symbols/futures.ts`。
- `batch.ts` 的 `matchMarket` 改调 `infer`，消除第二套 `startsWith` 判断。
- `getPeriodCode` / `getAdjustCode` 等与符号无关，保留在 `utils.ts`。

### 5.7 对外导出

`normalizeSymbol` / `SymbolRef` / `Market` / `AssetType` / `NormalizedSymbol` 经主入口 `.` 与 `stock-sdk/symbols` subpath 双导出。

---

## 6. A2 — 统一数据契约

### 6.1 统一基础字段（`src/types/base.ts`）

```ts
import type { Market, AssetType } from '../symbols/types';
import type { MarketTz } from '../core/time';
import type { ProviderName } from '../core/providerPolicy';

export interface BaseRecord {
  symbol: string;       // 规范化后的标准符号(如 'CN:stock:600519' 或与 NormalizedSymbol 对齐)
  code: string;         // 纯代码
  name?: string;
  market: Market;
  assetType: AssetType;
  exchange: string;
  source: ProviderName; // 'tencent' | 'eastmoney' | 'sina'
}

export interface TimedRecord {
  time?: string;            // 原始时间字符串(市场时区),保留
  timestamp: number | null; // UTC ms;无法解析为 null(替代旧 NaN)
  tz: MarketTz;
}

export interface BaseQuote extends BaseRecord, TimedRecord {
  currency: string;     // ISO: 'CNY' | 'HKD' | 'USD' —— 决定下方金额/价格的计价单位
  price: number;        // 计价货币主单位(A股=元 / 港股=港元 / 美股=美元)
  prevClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number; // 百分数
  volume: number;        // 目标口径:股(TODO 本期未换算,实际为各源原始口径,如腾讯 A股=手)
  amount: number;        // 目标口径:计价货币主单位(TODO 同上,实际如腾讯 A股=万元)
}
```

### 6.2 行情类型收敛为可辨识联合（discriminated union by `assetType`）

**决策**：用 union，而非「单接口 + 大量可选字段」。理由：基金 `nav/accNav` 量纲与股票本质不同；五档 `bid/ask`、`lotSize`、`limitUp` 各市场有无不同；塞进一个接口会产生 30+ 个全可选字段、类型失去约束。union 让 `switch(q.assetType)` 天然收窄，DX 最佳，并与现有 `HKHistoryKline | USHistoryKline` 风格一致。

```ts
export interface StockQuote extends BaseQuote {
  assetType: 'stock';
  market: 'CN';
  bid: { price: number; volume: number }[];   // 五档
  ask: { price: number; volume: number }[];
  turnoverRate: number | null;
  pe: number | null;
  pb: number | null;
  limitUp: number | null;
  limitDown: number | null;
  // ... 原 FullQuote 的 A股专有字段
}

export interface HKStockQuote extends BaseQuote {
  assetType: 'stock';
  market: 'HK';
  lotSize: number | null;
}

export interface USStockQuote extends BaseQuote {
  assetType: 'stock';
  market: 'US';
  pe: number | null;
  pb: number | null;
}

export interface FundQuote extends BaseRecord, TimedRecord {
  assetType: 'fund';
  nav: number;       // 单位净值
  accNav: number;    // 累计净值
  change: number;
  changePercent: number;
}

export type Quote = StockQuote | HKStockQuote | USStockQuote | FundQuote;
```

`SimpleQuote` 降级为 `Pick<StockQuote, ...>` 派生，消除 `marketCap` 命名漂移。

> 注：上面的 union 结构是设计示意；落地时 A股/港股/美股是否再细分 `market` 判别字段，按 `switch` 收窄体验最终定。

### 6.3 其余返回统一

- K线/分时：抽 `BaseKline extends TimedRecord`，A/HK/US 套用 + 各自扩展（`currency`/`lotSize`）。
- 资金流：合并 `mainNet`（`FundFlow`）与 `mainNetInflow`（`StockFundFlowDaily`）两套命名为统一 `mainNetInflow`。
- 龙虎榜/大宗/北向/margin/options/板块：凡有日期的 `extends TimedRecord`、补 `tz`、删 `tradeDate` 等别名。

### 6.4 单位与口径约定（D6）

| 维度 | v2 统一口径 | 换算（parser 层） |
|---|---|---|
| `volume` 成交量 | **股** | A股 quote 原「手」→ `×100`；K线/分时同样口径化为股 |
| `amount` 成交额 | **计价货币主单位** | `FullQuote.amount` 原「万」→ `×10000`；港股/美股原值即港元/美元，仅去倍率 |
| `price` / 市值 | **计价货币主单位** | 市值原「亿」→ `×1e8`（或显式 `marketCapUnit`，落地再定） |
| 百分比 | **百分数**（`5.2`） | 腾讯现状即百分数；个别小数口径字段 `×100` |
| `currency` | **ISO**（`CNY/HKD/USD`），决定上方金额/价格的单位 | 全 quote 必填 |

> **关于「元」的澄清**：v2 **不接 FX 数据源、不做跨币种折算**。「统一为主单位」指各市场用**自身计价货币的主单位**——A股=人民币元（CNY）、港股=港元（HKD）、美股=美元（USD），由 `currency` 标明；金额只去掉「万/亿」倍率，币种不变。若未来需人民币统一口径，另设 `amountCny` / `marketCapCny` 派生字段并明确依赖外部汇率源（本期不提供）。

> ⚠️ **最高风险项**：`volume` 手→股 `×100` 是最高频字段，连锁影响 OBV 等依赖成交量的指标与全部 K线/quote 数值。需专项回归（见 §14）。`src/providers/tencent/timeline.ts:113` 已有 `isVolumeInLots ? rawVolume * 100 : rawVolume` 逻辑，可作为换算参考点。

### 6.5 `timestamp` `NaN` → `null`

改造 `src/core/time.ts`：`TimeMeta.timestamp` 改 `number | null`，新增内部 `nullableEpoch(local, tz)` helper；所有 parser 统一走它，**禁止手写 `NaN`**。复用现有 `buildTimeMeta` / `MarketTz` / `parseMarketTime`。

### 6.6 `raw` 移除 + 逃生舱（D2）

8 处 `raw: string[]`（`FullQuote`/`SimpleQuote`/`FundFlow`/`PanelLargeOrder`/`HKQuote`/`USQuote`/`FundQuote`/`FundDividend`）全部删除。逃生舱**不进数据对象**，改为 provider 层 `getXxxRaw()` 调试函数（已有 `batchRaw` 先例），保持契约纯净。

### 6.7 命名统一对照（代表）

| v1 | v2 |
|---|---|
| `marketCap`（SimpleQuote） / `totalMarketCap` / `circulatingMarketCap` | 统一 `totalMarketCap` / `circulatingMarketCap` |
| `mainNet`（FundFlow） vs `mainNetInflow`（fundFlow.ts） | 统一 `mainNetInflow` |
| `FullQuote.volume` + `volume2`（重复） | 单一 `volume` |
| `tradeDate`（deprecated） | `date` + `TimedRecord` |

---

## 7. A3 — 命名空间化 + subpath 导出

### 7.1 完整命名空间映射表

> 13 个 service / 105 个方法 → 命名空间。`QuoteService(20)` 拆 4 块、`DataService(5)` 拆 2 块、`IndicatorService(1)` 并入 `kline`。

| v2 调用 | v1 方法 | 来源 service |
|---|---|---|
| **`sdk.quotes`** | | QuoteService |
| `quotes.cn(codes)` | `getFullQuotes` | |
| `quotes.cnSimple(codes)` | `getSimpleQuotes` | |
| `quotes.hk(codes)` | `getHKQuotes` | |
| `quotes.us(codes)` | `getUSQuotes` | |
| `quotes.fund(codes)` | `getFundQuotes` | |
| `quotes.fundFlow(codes)` | `getFundFlow`（简版） | |
| `quotes.largeOrder(codes)` | `getPanelLargeOrder` | |
| `quotes.timeline(code)` | `getTodayTimeline` | |
| **`sdk.codes`** | | QuoteService |
| `codes.cn(opts)` / `codes.us(opts)` / `codes.hk()` / `codes.fund()` | `getAShareCodeList` / `getUSCodeList` / `getHKCodeList` / `getFundCodeList` | |
| **`sdk.batch`** | | QuoteService |
| `batch.cn(opts)` / `batch.hk(opts)` / `batch.us(opts)` | `getAllAShareQuotes` / `getAllHKShareQuotes` / `getAllUSShareQuotes` | |
| `batch.byCodes(codes, opts)` / `batch.raw(params)` | `getAllQuotesByCodes` / `batchRaw` | |
| **`sdk.kline`** | | KlineService + IndicatorService |
| `kline.cn` / `kline.cnMinute` / `kline.hk` / `kline.hkMinute` / `kline.us` / `kline.usMinute` | `getHistoryKline` / `getMinuteKline` / `getHKHistoryKline` / `getHKMinuteKline` / `getUSHistoryKline` / `getUSMinuteKline` | |
| `kline.withIndicators(symbol, opts)` | `getKlineWithIndicators` | |
| **`sdk.board.industry`** / **`sdk.board.concept`** | | BoardService |
| `.list()` / `.spot(s)` / `.constituents(s)` / `.kline(s,o)` / `.minuteKline(s,o)` | `getIndustry*` / `getConcept*` | |
| **`sdk.options`** | | OptionsService |
| `options.index.spot` / `options.index.kline` | `getIndexOptionSpot` / `getIndexOptionKline` | |
| `options.etf.months` / `.expireDay` / `.minute` / `.dailyKline` / `.fiveDayMinute` | `getETFOptionMonths` / `getETFOptionExpireDay` / `getETFOptionMinute` / `getETFOptionDailyKline` / `getETFOption5DayMinute` | |
| `options.commodity.spot` / `options.commodity.kline` | `getCommodityOptionSpot` / `getCommodityOptionKline` | |
| `options.cffex.quotes` | `getCFFEXOptionQuotes` | |
| `options.lhb(symbol, date)` | `getOptionLHB` | |
| **`sdk.futures`** | | FuturesService |
| `futures.kline` / `futures.globalSpot` / `futures.globalKline` / `futures.inventorySymbols` / `futures.inventory` / `futures.comexInventory` | `getFuturesKline` / `getGlobalFuturesSpot` / `getGlobalFuturesKline` / `getFuturesInventorySymbols` / `getFuturesInventory` / `getComexInventory` | |
| **`sdk.fundFlow`** | | FundFlowService |
| `fundFlow.individual` / `.market` / `.rank` / `.sectorRank` / `.sectorHistory` | `getIndividualFundFlow` / `getMarketFundFlow` / `getFundFlowRank` / `getSectorFundFlowRank` / `getSectorFundFlowHistory` | |
| **`sdk.northbound`** | | NorthboundService |
| `northbound.minute` / `.summary` / `.holdingRank` / `.history` / `.individual` | `getNorthbound*` | |
| **`sdk.marketEvent`** | | MarketEventService |
| `marketEvent.ztPool` / `.stockChanges` / `.boardChanges` | `getZTPool` / `getStockChanges` / `getBoardChanges` | |
| **`sdk.dragonTiger`** | | DragonTigerService |
| `dragonTiger.detail` / `.stockStats` / `.institution` / `.branchRank` / `.seatDetail` | `getDragonTiger*` | |
| **`sdk.blockTrade`** | | DataService |
| `blockTrade.marketStat` / `.detail` / `.dailyStat` | `getBlockTrade*` | |
| **`sdk.margin`** | | DataService |
| `margin.accountInfo` / `.targetList` | `getMarginAccountInfo` / `getMarginTargetList` | |
| **`sdk.fund`** | | FundService |
| `fund.dividendList` / `.navHistory` / `.estimate` / `.rankHistory` | `getFundDividendList` / `getFundNavHistory` / `getFundEstimate` / `getFundRankHistory` | |
| **`sdk.calendar`** | | TradingCalendarService |
| `calendar.isTradingDay` / `.nextTradingDay` / `.prevTradingDay` / `.marketStatus` | 同名 | |
| **`sdk.reference`** | | QuoteService |
| `reference.dividendDetail(symbol)` / `reference.tradingCalendar()` | `getDividendDetail` / `getTradingCalendar` | |
| **`sdk.search(keyword)`**（顶层保留） | `search` | QuoteService |

> 注：`quotes.fundFlow`（简版，腾讯）与 `sdk.fundFlow.*`（深度，东财）来源不同，文档需明确区分。

### 7.2 实现方式

- StockSDK 构造时一次性创建**只读属性**（不用 getter，避免每次访问重建包装对象、破坏 `===`）：

```ts
export class StockSDK {
  readonly quotes: QuotesNamespace;
  readonly kline: KlineNamespace;
  readonly options: OptionsNamespace; // 内部再持 etf/index/commodity/cffex 子命名空间
  // ...
  constructor(options: RequestClientOptions = {}) {
    this.client = new RequestClient(options);
    const quoteSvc = new QuoteService(this.client);
    this.quotes = new QuotesNamespace(quoteSvc);
    this.codes  = new CodesNamespace(quoteSvc);
    // ...
  }
  search(keyword: string) { return this.quoteService.search(keyword); }
}
```

- 命名空间类是**薄包装**（构造注入 service，方法体 `return this.svc.oldMethod(...)`，只重命名、不搬业务）。落点 `src/sdk/namespaces/*`。
- **二级命名空间克制**：仅 `board.{industry,concept}`、`options.{index,etf,commodity,cffex}`；其余命名空间方法数 ≤8，一级平铺。

### 7.3 subpath / 函数式导出

**`tsup.config.ts`** 改命名多入口 + 开 `splitting`（core 公共块去重）：

```ts
export default defineConfig({
  entry: {
    index:      'src/index.ts',
    indicators: 'src/indicators/index.ts',
    symbols:    'src/symbols/index.ts',
    signals:    'src/signals/index.ts',
    screener:   'src/screener/index.ts',
    cache:      'src/cache/index.ts',
    errors:     'src/errors/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  target: 'es2020',
  clean: true,
});
```

**`package.json` exports**（每条 import/require/types 三件套）：

```jsonc
"exports": {
  ".":            { "import": {"types":"./dist/index.d.ts","default":"./dist/index.js"},
                    "require":{"types":"./dist/index.d.cts","default":"./dist/index.cjs"} },
  "./indicators": { /* 同结构,指向 dist/indicators.* */ },
  "./symbols":    { /* ... */ },
  "./signals":    { /* ... */ },
  "./screener":   { /* ... */ },
  "./cache":      { /* ... */ },
  "./errors":     { /* ... */ },
  "./package.json": "./package.json"
}
```

- 保留传统 `main` / `module` / `types` 兜底；`"sideEffects": false` 维持。
- 主入口 `.` 仍全量 `export *`。子入口必须落 exports map，否则 Node ESM 对未声明 subpath 直接报错。
- 收益：只用「指标 / symbols / 信号」的纯计算用户，bundle 不再拖入 `RequestClient` 与所有 provider。

---

## 8. A4 — 请求层 v2 + 错误统一

### 8.1 请求层可组合化（`src/core/request.ts`）

`RequestClientOptions` 与 `GetOptions` 各加 `fetchImpl?: typeof fetch`、`signal?: AbortSignal`；client 级加 `hooks?: RequestHooks`。优先级 `GetOptions > RequestClientOptions > 全局 fetch`。

```ts
interface GetOptions {
  responseType?: 'text' | 'json' | 'arraybuffer';
  provider?: ProviderName;
  fetchImpl?: typeof fetch;   // 单次覆盖(代理/mock/日志)
  signal?: AbortSignal;       // 单次外部取消信号
}
```

`performRequest` 中硬编码的 `fetch(...)`（约 L262）换成解析出的实现；`jsonp.ts` / `jsVars.ts` 的裸 `fetch` 同样接受注入，保持双端一致。

### 8.2 timeout 与外部 signal 组合（降级）

内部 timeout `AbortController` 保留（约 L245），新增 `combineSignals(internalTimeout, options.signal, clientSignal)`：

```ts
function combineSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const list = signals.filter(Boolean) as AbortSignal[];
  if (list.length === 1) return list[0];
  if (typeof (AbortSignal as any).any === 'function') return (AbortSignal as any).any(list);
  // fallback:Node 18.0~18.16 无 AbortSignal.any
  const ctrl = new AbortController();
  for (const s of list) {
    if (s.aborted) { ctrl.abort(s.reason); break; }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true });
  }
  return ctrl.signal;
}
```

> SDK 声明 `node>=18.0.0`，而 `AbortSignal.any` 仅 18.17+/20.3+ 落地，**必须带 fallback**。abort reason 区分：timeout 用带标记的 reason → `TIMEOUT`；外部取消 → 新 code `ABORTED`。

### 8.3 请求生命周期 hooks

```ts
interface RequestLifecycleContext {
  provider: ProviderName; url: string; timeout: number;
  attempt: number; responseType: GetOptions['responseType'];
}
interface RequestHooks {
  onRequest?(ctx: RequestLifecycleContext): void;
  onResponse?(ctx: RequestLifecycleContext, meta: { status: number; durationMs: number }): void;
  onError?(ctx: RequestLifecycleContext, error: SdkError): void;
  onRetry?(ctx: RequestLifecycleContext, error: SdkError, delay: number): void;
  trace?(event: 'request'|'response'|'error'|'retry'|'fallback', ctx: RequestLifecycleContext): void;
}
```

- hooks 仅 client 级（不进 `GetOptions`，避免过胖）；全程 `try/catch` 包裹，回调抛错不影响主流程。
- `onRetry` 兼容并复用现有 `providerPolicy.RetryOptions.onRetry`（超集）。
- host fallback 切换（`get()` 的 continue 处）经 `trace('fallback', ...)` 上报。
- **不破坏 providerPolicies**：`ProviderRequestPolicy` / `ResolvedProviderPolicy` 结构不动，hooks/fetchImpl/signal 是 client 级、与 provider 策略正交，新参数皆 optional。

### 8.4 错误统一收编

复用 `src/core/errors.ts` 已有骨架：`SdkError`（带 `code`）、10 个 code（`NETWORK_ERROR`/`TIMEOUT`/`HTTP_ERROR`/`RATE_LIMITED`/`CIRCUIT_OPEN`/`UPSTREAM_EMPTY`/`PARSE_ERROR`/`INVALID_SYMBOL`/`INVALID_ARGUMENT`/`NOT_FOUND`）、子类 `HttpError`/`UpstreamEmptyError`/`NotFoundError`/`InvalidArgumentError`/`InvalidSymbolError`、`normalizeRequestError()`/`getSdkErrorCode()`/`attachErrorMetadata()`。

**新增 2 个 code**：
- `ABORTED` — 外部 signal 主动取消（区别于内部超时 `TIMEOUT`）。
- `UPSTREAM_ERROR` — 上游返回结构化错误（`code!=0`/`msg`），区别于空数据 `UPSTREAM_EMPTY`。

**裸错误点收编清单**：

| 文件 | 现状 | 收编为 |
|---|---|---|
| `core/utils.ts`（4 处） | `RangeError` | `InvalidArgumentError` |
| `core/jsonp.ts`（括号/解析） | `Error` | `PARSE_ERROR` |
| `core/jsonp.ts` / `jsVars.ts`（`!resp.ok`） | `Error` | `HttpError` |
| `core/jsonp.ts` / `jsVars.ts`（超时 `DOMException`） | 透传 | `TIMEOUT` |
| `providers/tencent/timeline.ts`（`Error(json.msg)`） | `Error` | `UPSTREAM_ERROR` |
| `providers/eastmoney/{dragonTiger,fundFlow,futuresKline,futuresGlobal,futuresInventory,northbound,topicData}.ts` | `RangeError` | `InvalidArgumentError` |
| `providers/sina/optionCommodity.ts` | `RangeError` | `InvalidArgumentError` |
| `sdk/tradingCalendarService.ts`（3 处，JSDoc `@throws` 同步改） | `RangeError` | `InvalidArgumentError` / `NOT_FOUND` |
| `providers/tencent/search.ts`（浏览器 JSONP `script.onerror`，**不经 RequestClient**） | `Error('Network error...')` | `NETWORK_ERROR` |
| `providers/eastmoney/fund.ts`（fundgz JSONP 超时/`onerror`，**不经 RequestClient**） | `Error('fundgz JSONP timed out...')` | `TIMEOUT` / `NETWORK_ERROR` |

**三条防线保证对外只抛 `SdkError`**：① 所有 throw 点收编；② `normalizeRequestError` 仍是 `RequestClient.get` 出口唯一归一化器（保留对裸 `TypeError`/`DOMException` 的识别，防御第三方 `fetchImpl` 抛裸错）；③ **非 `RequestClient.get` 路径单独收编** —— 浏览器端独立 JSONP / `<script>` 注入（`search.ts` 的 smartbox、`fund.ts` 的 fundgz）不走 `RequestClient`，出口防线兜不住，必须在各自 Promise `reject` 处直接抛 SdkError 子类，**列入阶段 0**。新增 `test/unit/contract/error-surface.test.ts` 作回归护栏。

---

## 9. A5 — 清债

### 9.1 删除全部 16 处 `@deprecated`

| 文件 | 处数 | 内容 |
|---|---|---|
| `types/options.ts` | 8 | `OptionLHBItem` 旧字段（`tradeDate`/`volume`/`volumeChange`/金额/持仓别名等） |
| `types/futures.ts` | 3 | `ComexInventory.inventory`→`storageTon`、`change` 恒 null、旧 name |
| `types/kline.ts` | 1 | `HKUSHistoryKline` 别名（并解除 `indicators/registry.ts` 对它的 import，改用 `BaseKline`） |
| `types/board.ts` | 1 | `avgPrice`→`price` |
| `src/utils.ts` | 1 | 整个 deprecated re-export 文件，删除 |
| `core/constants.ts` | 2 | `A_SHARE_LIST_URL` / `EM_DATA_TOKEN` 内部常量别名 |

### 9.2 删除旧签名

- `getAShareCodeList(boolean)` / `getUSCodeList(boolean)` 的 `| boolean` 重载（`providers/tencent/batch.ts`），只留 options 对象签名。

> 错误收编部分作为「阶段 0」先行（因「对外只抛 SdkError」是后续前提）；类型/签名清债随 A1/A2 一并落地。

---

## 10. B1 — 指标信号层

### 10.1 基础

现有 14 个指标返回**结构化对象**（`MAResult` / `MACDResult{dif,dea,macd}` / `KDJResult{k,d,j}` / `RSIResult` / `BOLLResult{mid,upper,lower,bandwidth}` / `SARResult{sar,trend,...}` 等），由 `src/indicators/registry.ts` 的 `INDICATOR_REGISTRY` 统一描述，`addIndicators` 把它们贴到 K线生成 `KlineWithIndicators<T>`。信号层在此之上做「事件识别」，**纯计算，零网络**。

### 10.2 设计（`src/signals/`）

```ts
export type SignalType =
  | 'ma_golden_cross' | 'ma_death_cross'
  | 'macd_golden_cross' | 'macd_death_cross'
  | 'kdj_golden_cross' | 'kdj_death_cross' | 'kdj_overbought' | 'kdj_oversold'
  | 'rsi_overbought' | 'rsi_oversold'
  | 'boll_break_upper' | 'boll_break_lower'
  | 'sar_reversal_up' | 'sar_reversal_down';

export interface Signal {
  type: SignalType;
  at: number;            // 对应 K线 timestamp(恒非空,见下方一致性约定)
  index: number;         // K线下标
  detail?: Record<string, number>; // 如 { fast: 5, slow: 20 }
}

export interface SignalOptions {
  ma?: { fast: number; slow: number };
  macd?: boolean;
  kdj?: { overbought?: number; oversold?: number };
  rsi?: { period?: number; overbought?: number; oversold?: number };
  boll?: boolean;
  sar?: boolean;
}

export function calcSignals(klines: KlineWithIndicators[], options: SignalOptions): Signal[];
```

- 金叉/死叉：比较相邻两根 K线的指标值（如 `prev.ma5 <= prev.ma20 && cur.ma5 > cur.ma20`）。
- 超买/超卖：阈值判断（KDJ `k>80/k<20`、RSI `>70/<30`，可配置）。
- BOLL 突破：需 `close` 与上下轨比对。
- SAR 反转：`SARResult.trend` 前后值变化（已有 `trend` 字段）。
- `KlineWithIndicators` 增可选 `signals?: Signal[]`（默认 `undefined`，不破坏现有结构）。
- **timestamp 一致性约定**：A2 将 K线 `timestamp` 改为 `number | null`，但 `Signal.at` 恒为 `number` —— `calcSignals` **跳过 `timestamp` 为 `null` 的 K线**（无有效时间锚点不产信号），保证信号与时间轴类型一致。
- 经 `stock-sdk/signals`（独立）与 `stock-sdk/indicators` 双导出。免集成测试。

---

## 11. B2 — 选股器 + 回测

### 11.1 选股器（`src/screener/screener.ts`）

组合现有「全市场行情 `batch.*` + 板块 + 资金流 + 龙虎榜」，纯本地筛选：

```ts
const result = await sdk.screener()
  .universe('cn')                              // 数据源:全市场 A 股
  .where(q => q.pe != null && q.pe < 20)
  .where(q => q.changePercent > 3)
  .inBoard('半导体')                            // 可选:限定板块
  .rankBy('amount', 'desc')                    // 排序
  .top(20);
```

- 链式 builder，最终 `.top(n)` / `.toArray()` 触发拉数（内部走 `batch.*` 与缓存层）。
- 筛选维度依赖 A2 统一后的 `Quote` 字段（`pe`/`changePercent`/`amount` 等）。

### 11.2 回测（`src/screener/backtest.ts`）

```ts
const report = backtest({
  kline,                                  // 已含指标的 K线序列
  strategy: maCross({ fast: 5, slow: 20 }), // 内置策略或自定义 (bar, ctx) => 'buy'|'sell'|'hold'
  initialCapital: 100_000,
  fee: 0.0003,
});
// report: { equityCurve, totalReturn, winRate, maxDrawdown, trades }
```

- 基于 K线 + 指标（B1 信号可作为策略输入）；纯本地、可复现。
- 经 `stock-sdk/screener` 导出。

---

## 12. B3 — 统一缓存层

### 12.1 现状

`src/core/cache.ts` 的 `MemoryCache` 已具备 **TTL / LRU / `getOrFetch` / `getSharedCache`**，但仅用于 3 处（交易日历 12h、代码列表 6h、板块名称映射）。

### 12.2 设计

把缓存提升为**可注入的统一接口**，`StockSDK` 构造时可配置：

```ts
new StockSDK({
  cache: {
    enabled: true,
    store?: CacheStore,           // 默认 MemoryCache;可注入 localStorage/IndexedDB/文件/Redis 适配器
    policies?: {
      tradingCalendar: { ttl: 12 * 3600_000 },
      codeList:        { ttl: 6 * 3600_000 },
      boardList:       { ttl: 24 * 3600_000 },
      dividend:        { ttl: 7 * 86400_000 },
      // ...
    },
  },
});

type MaybePromise<T> = T | Promise<T>;

interface CacheStore {
  get(key: string): MaybePromise<unknown | undefined>;
  set(key: string, value: unknown, ttl?: number): MaybePromise<void>;
  delete(key: string): MaybePromise<void>;
  clear(): MaybePromise<void>;
}
```

> `CacheStore` 用 `MaybePromise` 而非纯同步签名：内置 `MemoryCache` 同步实现（直接返回值），注入的 IndexedDB / 文件 / Redis 等**异步存储**返回 `Promise`；缓存读取处内部统一 `await`，对两类实现透明。

### 12.3 下沉范围（按 TTL 分级）

| 接口 | 建议 TTL |
|---|---|
| 交易日历 / 代码列表 / 板块列表（现有） | 6–24h |
| 分红明细 `reference.dividendDetail` | 7d |
| 板块成分股 `board.*.constituents` | 1d |
| 期货库存品种 `futures.inventorySymbols` | 7d |
| 基金净值历史 `fund.navHistory` | 1d |
| 基金估值 `fund.estimate` / 涨停池 `marketEvent.ztPool` | 5m |

- 经 `stock-sdk/cache` 暴露低层 API；保留 `getSharedCache()` 作为低层兼容。
- 命中率统计可选（`getOrFetch` 内记 hit/miss + `.getStats()`）。

---

## 13. 分阶段实施路线

| 阶段 | 内容 | 依赖 | 验证 |
|---|---|---|---|
| **0** | A5 错误收编（裸 throw → SdkError，含新增 `UPSTREAM_ERROR`），使「对外只抛 SdkError」成立 | — | typecheck + test（同步改 RangeError 断言）+ integration |
| **1** | A4 请求层 v2（先 `fetchImpl`/`signal` 便于后续 mock，再 hooks，加 `ABORTED`） | 0 | typecheck + test + integration |
| **2** | A1 符号内核（叶子可独测）→ A2 契约（`time.ts` 改造 → `base.ts` → 重写 quotes+parser+各 types）+ A5 剩余清债 | 1 | typecheck + test + **integration + volume 专项回归** |
| **3** | A3 命名空间化（删 105 旧方法、单轨硬切）+ tsup 多入口 / exports map | 2 | typecheck + **build 验多入口产物/d.ts** + test（改命名空间调用）+ docs |
| **4** | B1 指标信号层（可与阶段 3 并行） | 2 | typecheck + test |
| **5** | B3 缓存层 | 1 | typecheck + test + integration |
| **6** | B2 选股 + 回测 | 3/4/5 | typecheck + test + integration |
| **7** | 收口：版本 1.10.1→2.0.0、CHANGELOG 破坏性变更、全量回归 + 文档 | 全部 | `test:integration:full` + `docs:check` + `build:docs` |

**并行/延后**：B1 可与 A3 并行（不依赖门面）；B3 在 A4 后；B2 最后（依赖最多）。

---

## 14. 验证策略

```bash
yarn typecheck                 # 每个阶段必跑
yarn build                     # 阶段 3 重点:验证多入口产物 + 各 subpath d.ts 正确
yarn test                      # 单测;A1 新增 src/symbols 穷举用例为地基正确性锚
yarn test:integration          # A4/A2/B3/B2 必跑(真实网络)
yarn test:integration:full     # 阶段 7 全量回归
yarn docs:check                # 文档一致性
```

**专项回归（必做）**：
- **volume 单位**：所有 `volume`（quote/K线/分时）×100 换算成股后，断言 OBV 指标、`batch.cn`、`quotes.timeline`（已有 `isVolumeInLots` 逻辑）数值正确。
- **符号解析**：`src/symbols` 穷举 `sh600519` / `600519.SH` / `600519` / `00700` / `hk00700` / `AAPL` / `105.AAPL` / `rb2510` / `CFFEX.IF2412` + 已知歧义路径。
- **错误面**：`error-surface.test.ts` 断言所有失败路径 `instanceof SdkError`。
- **timestamp**：grep 确认无手写 `NaN`，JSON 序列化稳定。

---

## 15. 文档同步

AGENTS.md 强制（每个改 `src` 的 PR）：
- `README.md` + `README_EN.md`
- `website/api/` + `website/en/api/`
- `website/guide/` + `website/en/guide/`（**新增 v1→v2 迁移指南** + **符号与代码规则**页）
- Playground（`website/.vitepress/theme/components/playground/methods/*.ts` + `categories.ts`）
- `yarn docs:check` 必过

> **阶段 3 是破坏性重命名重灾区**：README/website/Playground 每个示例都要从 `sdk.getXxx()` 改成命名空间调用，工作量集中，须在该 PR 内一次同步到位。MCP 文档（`website/mcp/`）与 `stock-sdk-mcp` 包的方法映射也需相应更新。

---

## 16. 破坏性变更与迁移指南

写入 `website/changelog.md` 与新增迁移指南页：

1. 所有方法从 `sdk.getXxx()` 迁移到命名空间 `sdk.<ns>.<method>()`（无兼容别名）。完整映射见 §7.1。
2. 行情类型重构为 `Quote` 可辨识联合；`FullQuote` / `HKUSHistoryKline` 等旧类型名移除。
3. 所有返回值移除 `raw` 字段（改用 provider 层 `getXxxRaw()`）。
4. `volume`→股、`amount`/`price`/市值→**各自计价货币主单位**（A股=元 / 港股=港元 / 美股=美元，不跨币种折算；**数值口径变化**，回测/展示需重新校准）；`timestamp` 无效值由 `NaN` 改 `null`。
5. 全部 `@deprecated` 字段与 `boolean` 旧签名删除。
6. 对外错误统一为 `SdkError`（不再透出裸 `TypeError`/`DOMException`），新增 `ABORTED` / `UPSTREAM_ERROR` code。
7. Node baseline 维持 `>=18`（`AbortSignal.any` 带降级）；新增 subpath 导出 `stock-sdk/{indicators,symbols,signals,screener,cache,errors}`。

**迁移示例（before → after）**：

```ts
// v1
import { StockSDK } from 'stock-sdk';
const sdk = new StockSDK();
const q = await sdk.getFullQuotes(['sh600519']);
const k = await sdk.getETFOptionDailyKline('10004336');

// v2
import { StockSDK } from 'stock-sdk';
const sdk = new StockSDK();
const q = await sdk.quotes.cn(['sh600519']);          // 或 '600519' / {code:'600519'}
const k = await sdk.options.etf.dailyKline('10004336');
```

---

## 17. 风险与缓解

| 风险 | 级别 | 缓解 |
|---|---|---|
| `volume` 手→股 ×100 误改连锁错全链路（OBV 等） | 高 | 集中在 parser 层换算 + volume 专项回归 + 指标快照对比 |
| 纯码歧义误判（基金/指数/B股） | 中 | 强制 hint + 已知歧义清单 + `normalizeSymbol` 穷举测试 |
| `timestamp` NaN→null 全链路一致性 | 中 | 统一走 `nullableEpoch`，grep 卡死手写 NaN |
| `AbortSignal.any` 在 Node 18.0–18.16 缺失 | 中 | `combineSignals` 运行时探测 + 手写 fallback |
| 命名空间重命名导致文档/Playground/MCP 大面积失效 | 中 | 阶段 3 集中一次性同步,`docs:check` 兜底 |
| union 类型令调用方编译报错 | 低（已允许破坏） | 迁移指南给 `switch(q.assetType)` 范式 |
| `AssetType` 与现有 `SearchResultType` 形成两套资产枚举 | 低 | 二者合一,复用 `common.ts` 的 `normalizeSearchType` |

---

## 18. 文档站版本化（v1 文档留存）

> 目标：升级 v2.0.0 后，使用 v1 的用户仍能访问完整的 v1 文档。**决策：方案 A — 同域子目录 `/v1/` + git tag 锁定构建。**

### 18.1 前提

- VitePress **无内置多版本机制**（不同于 Docusaurus 的 versioning）。
- 当前为单站点、单 `dist`、中英双语（`/` + `/en/`），`website/` 一旦改为 v2，v1 内容即被覆盖。
- 因此**第一步是用 git tag 冻结 v1 文档**：复用既有发版 tag `v1.10.1`，构建 v1 时 checkout 该 tag，内容永不漂移、实质冻结。

### 18.2 URL 结构

- v2 → `stock-sdk.linkdiary.cn/`（根）；v1 → `stock-sdk.linkdiary.cn/v1/`。
- 各自带中英双语：v1 为 `/v1/` + `/v1/en/`。
- v1 子目录 `base` 取值随部署形态：自定义域名 `/v1/`、github.io `/stock-sdk/v1/`。

### 18.3 部署改造（`docs.yml` 双构建合并）

现有 workflow 已 `fetch-depth: 0`（含 tags），在 `Build` 步骤前后扩展为：

```bash
# 1) 用 worktree 取 v1.10.1 的文档源,避免污染工作区
git worktree add /tmp/v1 v1.10.1
( cd /tmp/v1 && yarn install --frozen-lockfile \
  && DOCS_BASE=/stock-sdk/v1/ npx vitepress build website )   # v1 → base=/stock-sdk/v1/
# 2) 构建 v2(主分支)
yarn build:pages                                              # v2 → base=/stock-sdk/
# 3) 合并:把 v1 产物放进 v2 dist 的 /v1/ 子目录
cp -r /tmp/v1/website/.vitepress/dist website/.vitepress/dist/v1
# 4) upload-pages-artifact(path: website/.vitepress/dist)
```

> 注：当前 `build:pages` 脚本把 `DOCS_BASE=/stock-sdk/` **内联**写死，v1 构建需绕过（直接 `DOCS_BASE=... npx vitepress build website`，或把脚本改为读外部 `DOCS_BASE`）。`docs:meta`（`generate-doc-meta.js`）在 v1 构建里也要先跑一次。

### 18.4 版本切换器（nav dropdown）

`themeConfig.nav` 加一项（中英各一份），v1 站点的 nav 也加一项指回 v2 根：

```ts
{ text: 'v2.x (latest)', items: [
  { text: 'v2.x (latest)', link: '/' },
  { text: 'v1.x',          link: '/v1/' },
]}
```

### 18.5 v1 提示 banner

v1 顶部展示「你正在查看 v1（旧版），最新为 v2 →」。两种实现：
- ① **升级前**在 v1 的 `Layout.vue`/首屏加好 banner 再打 tag（最简，banner 随 tag 冻结）——推荐；
- ② workflow 构建完 v1 后用脚本往产物 HTML 注入（不改 tag，适合事后补 banner）。

### 18.6 SEO

给 v1 页面注入 `<meta name="robots" content="noindex">`（或 sitemap 只收 v2），避免 v1 旧页在搜索里盖过 v2。

### 18.7 天然正确项

- **版本号**：`HeroMeta` 从 `package.json` 读 → v1 构建显示 `1.10.1`、v2 显示 `2.0.0`，无需手改。
- **changelog**：连续的更新日志留在 v2 主站（v1→v2 都看得到）；v1 站的 changelog 自然停在 1.10.x。

### 18.8 待确认

- `stock-sdk.linkdiary.cn` 是「GitHub Pages 自定义域名」还是「独立托管反代到 Pages」？决定 v1 子目录 `base` 取值（`/v1/` vs `/stock-sdk/v1/`）与最终合并位置。仓库内未见 `CNAME` 文件，倾向是在 Pages 设置里配置的自定义域名。

---

> 本文档为 v2.0.0 实施前的技术方案，落地细节（具体接口字段、union 判别维度、单位换算的边界 case）以各阶段 PR 实现与评审为准。
