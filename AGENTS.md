# Stock SDK 项目规范

> 本文件为 AI 编程助手提供项目上下文和开发规范。适用于 Cursor、GitHub Copilot、Claude、Codex 等工具。

## 规则验证指令
- 如果用户问你 "Who is the boss?"，你必须回答 " Agent rules currently active: [今天的日期]"，并列出全局规则当中我说明的当前遵循的核心规则。

## 项目概述

这是一个面向 **浏览器** 和 **Node.js** 的 TypeScript 股票行情 SDK，核心目标是让前端和 Node.js 开发者无需额外后端服务，也能直接获取和处理财经数据。

当前项目能力范围包括：

- A 股 / 港股 / 美股 / 公募基金实时行情
- A 股 / 港股 / 美股历史 K 线、分钟 K 线、当日分时
- 行业板块、概念板块数据
- 资金流向（个股 / 大盘 / 排名 / 板块深度）、盘口大单
- 沪深港通 / 北向资金（分时 / 汇总 / 持股排行 / 历史）
- 涨停跌停股池（含连板数）、盘口异动、板块异动
- 龙虎榜（详情 / 个股统计 / 机构 / 营业部 / 席位明细）
- 大宗交易、融资融券
- 公募基金扩展（分红 / 历史净值 / 实时估值 / 同类排名）
- 交易日历、市场开休市状态、股票搜索、分红数据
- 期货数据、期权数据
- 技术指标计算
- MCP 文档与 AI 集成支持

项目坚持以下原则：

- **零运行时依赖**
- **浏览器和 Node.js 双端兼容**
- **完整 TypeScript 类型**
- **公共 API 尽量稳定，兼顾向后兼容**

**官方文档**: https://stock-sdk.linkdiary.cn/

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript 5.x |
| 运行环境 | Node.js 18+ / 浏览器 |
| 构建工具 | tsup |
| 测试框架 | Vitest 4.x |
| Mock 工具 | MSW (Mock Service Worker) |
| 文档工具 | VitePress |
| 包管理器 | Yarn 1.x |

## 当前项目结构

```text
src/
├── core/                    # 核心基础设施
│   ├── constants.ts         # 常量定义
│   ├── parser.ts            # 响应解析
│   ├── request.ts           # 请求客户端 RequestClient
│   ├── providerPolicy.ts    # provider 级请求策略(超时/重试/限流/熔断/headers)
│   ├── cache.ts             # 缓存
│   ├── rateLimiter.ts       # 限流
│   ├── circuitBreaker.ts    # 熔断
│   ├── fallback.ts          # 多源 / 降级回退
│   ├── errors.ts            # 统一错误类型
│   ├── jsonp.ts             # JSONP 请求(动态 callback)
│   ├── jsVars.ts            # 浏览器 <script> 注入 + Node 抓取 JS 变量(双端)
│   ├── scriptMutex.ts       # <script> 注入并发互斥
│   ├── time.ts              # 市场时区时间解析 / 格式化
│   ├── userAgentPool.ts     # UA 池
│   └── utils.ts             # decodeGBK、chunkArray、asyncPool 等
├── indicators/              # 技术指标(独立计算函数)
│   ├── ma/macd/boll/kdj/rsi/wr/bias/cci/atr/obv/roc/dmi/sar/kc.ts
│   ├── addIndicators.ts     # 批量聚合
│   ├── types.ts
│   └── index.ts
├── providers/               # 数据源适配层(只负责"取数 + 解析")
│   ├── index.ts             # 聚合导出 tencent / eastmoney / sina
│   ├── tencent/             # 行情、批量、搜索、交易日历、资金流
│   ├── eastmoney/           # K线、板块、分红、期货/期权、基金扩展、龙虎榜、大宗、融资、北向、涨停异动
│   └── sina/                # ETF / 股指 / 商品期权
├── sdk/                     # 服务层:按领域拆分的 Service 类(构造注入 RequestClient)
│   ├── baseService.ts       # service 基类
│   ├── quoteService.ts      # 实时行情
│   ├── klineService.ts      # K 线 / 分时(A / HK / US)
│   ├── boardService.ts      # 行业 / 概念板块
│   ├── indicatorService.ts  # 带指标 K 线(组合 kline + quote)
│   ├── futuresService.ts    # 期货
│   ├── optionsService.ts    # 期权
│   ├── fundFlowService.ts   # 资金流向(深度)
│   ├── northboundService.ts # 沪深港通 / 北向
│   ├── marketEventService.ts# 涨停 / 盘口异动
│   ├── dragonTigerService.ts# 龙虎榜
│   ├── fundService.ts       # 公募基金扩展(分红/净值/估值/排名)
│   ├── tradingCalendarService.ts # 交易日历 / 市场状态
│   ├── dataService.ts       # 代码列表/批量/搜索/分红/大宗/融资融券
│   └── index.ts             # 导出全部 service
├── types/                   # 公共类型(按领域模块化)
│   ├── quotes.ts / kline.ts / board.ts / fund.ts / fundFlow.ts
│   ├── northbound.ts / dragonTiger.ts / marketEvent.ts / blockTrade.ts
│   ├── margin.ts / futures.ts / options.ts / common.ts
│   └── index.ts
├── sdk.ts                   # StockSDK 门面类:持有各 Service 实例,薄委托统一对外
├── utils.ts                 # 对外暴露的工具封装
└── index.ts                 # 统一导出入口(StockSDK、各 Service、类型、工具)

test/
├── unit/                    # 单元测试
│   ├── core/
│   ├── indicators/
│   ├── sdk/
│   └── 若干根级 unit 测试文件
├── integration/             # 集成测试（真实网络请求）
│   ├── sdk/
│   └── 若干根级 integration 测试文件
├── mocks/                   # MSW Mock 配置
│   ├── handlers.ts
│   └── server.ts
└── setup.ts                 # Vitest 测试初始化

website/                     # VitePress 文档
├── api/                     # 中文 API 文档
├── guide/                   # 中文指南
├── mcp/                     # MCP 文档
├── playground/              # 在线示例
├── en/                      # 英文文档
│   ├── api/
│   ├── guide/
│   ├── mcp/
│   └── playground/
├── public/                  # 静态资源
└── .vitepress/              # VitePress 配置与主题
```

## 代码规范

### TypeScript 规范

1. **始终使用严格类型**，禁止新增 `any`
2. **所有公共 API 必须有完整的类型定义**
3. **优先使用 `interface` 定义对象结构**，联合类型、工具类型使用 `type`
4. **导出的函数和类必须有 JSDoc 注释**
5. **新增类型优先复用现有类型体系**，避免重复定义近似类型

```typescript
/**
 * 获取 A 股实时行情
 * @param codes - 股票代码数组，如 ['sh600519', 'sz000858']
 * @returns 行情数据数组
 */
export async function getQuotes(codes: string[]): Promise<Quote[]> {
  // ...
}
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | camelCase | `aShareKline.ts` |
| 类名 | PascalCase | `StockSDK` |
| 函数名 | camelCase | `normalizeSymbol` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| 类型/接口 | PascalCase | `FullQuote` |

### 代码风格

1. **使用 ES Module 导入/导出**
2. **异步操作使用 async/await**
3. **避免使用 `export default`**（`sdk.ts` 例外，用于向后兼容）
4. **错误处理要明确**，提供有意义的错误信息
5. **保持零运行时依赖**：不引入任何运行时依赖
6. **优先复用现有 provider / core 能力**，不要重复实现请求、限流、重试、熔断逻辑

## 开发流程

本项目是 **provider 取数 → service 业务编排 → 门面统一暴露** 的三层结构，新增接口按此顺序：

1. **provider 层**：确认数据源（`tencent` / `eastmoney` / `sina`），在对应目录新建或扩展模块。provider 只负责"发请求 + 解析"，复用 `RequestClient`，不要绕过重试 / 限流 / 熔断；在 provider 的 `index.ts` 补导出。
2. **类型**：在 `src/types/` 下对应领域模块补充公共类型（行情进 `quotes.ts`、龙虎榜进 `dragonTiger.ts`…），并在 `src/types/index.ts` 导出。
3. **service 层**：在 `src/sdk/` 选对应领域的 `xxxService.ts` 添加方法（找不到归属再新建 service 并在 `src/sdk/index.ts` 导出）。service 通过构造注入的 `RequestClient` 调用 provider。
4. **门面**：在 `src/sdk.ts` 持有该 service 实例，并加一个**薄委托方法**（`return this.xxxService.foo(...)`）；**不要在门面里写业务逻辑**。
5. **导出**：在 `src/index.ts` 导出新增的对外方法 / 类型 / 配置类型。
6. 按下方清单补测试、README、website 中英文文档、Playground。
7. 完成后执行下方检查清单。

> 浏览器专用数据源（如基金扩展走天天基金 `<script>` 注入、无 CORS 头）：复用 `src/core/jsVars.ts` 的双端取数与 `src/core/scriptMutex.ts` 的注入互斥，**不要**自己写 `document.createElement('script')`。

### 添加新的技术指标

1. 在 `src/indicators/` 中新增指标实现文件
2. 在 `src/indicators/types.ts` 中定义配置类型和结果类型
3. 在 `src/indicators/index.ts` 中导出指标函数与类型
4. 如需支持聚合能力，在 `src/indicators/addIndicators.ts` 中集成
5. 在 `src/index.ts` 中导出计算函数和类型
6. 补充对应测试与文档
7. 完成后执行下方检查清单

### 修改请求治理能力

涉及以下模块时，需要特别关注兼容性和副作用：

- `src/core/request.ts`
- `src/core/providerPolicy.ts`
- `src/core/cache.ts`
- `src/core/rateLimiter.ts`
- `src/core/circuitBreaker.ts`
- `src/core/fallback.ts`
- `src/core/jsonp.ts`

这类修改通常会影响多个 provider 与全部 service，必须补充测试，并优先检查旧配置是否仍然兼容。

## ⚠️ 开发完成后必做检查清单

**每次对 `src/` 目录下的代码进行新增或修改功能时，必须完成以下步骤：**

### 1. 确保构建成功

```bash
yarn build
```

- 构建必须无错误通过
- 检查 `dist/` 目录下输出是否正常

### 2. 补充测试并确保通过

```bash
yarn test
```

- 为新增或修改功能编写对应测试
- 单元测试放在 `test/unit/`，允许按模块目录或根级文件组织
- 集成测试放在 `test/integration/`
- 单元测试使用 MSW mock 网络请求
- 测试文件命名：单元测试 `*.test.ts`，集成测试 `*.int.test.ts`

```bash
yarn test:integration
```

- 涉及真实接口行为、provider 适配、线上数据兼容性时，应运行集成测试

### 3. 更新 README 文档

- 更新 `README.md`
- 同步更新 `README_EN.md`
- 新增公共 API 时，README 中的特性或 API 列表应同步补充

### 4. 更新 website 文档

- 中文 API 文档更新到 `website/api/`
- 中文指南更新到 `website/guide/`
- MCP 相关内容更新到 `website/mcp/`
- 英文文档同步更新到 `website/en/` 对应目录
- 保持中英文文档内容一致

### 5. 检查文档元数据与一致性

如果修改了文档结构、导航或新增了文档页面，建议执行：

```bash
yarn docs:check
```

必要时执行：

```bash
yarn build:docs
```

### 6. 更新 Playground（如适用）

Playground 已组件化，且**从 `src/spec/methods.ts` 派生**（与 CLI / MCP 同源，是 spec 的第三个派生端），不再手写每个方法。新增方法演示：

1. 在 `src/spec/methods.ts` 增 / 改 `MethodSpec`（CLI / MCP / Playground 三端共用）；Playground 经 `website/.vitepress/theme/components/playground/derive.ts` 自动派生表单与示例，无需手写方法文件。
2. 需要微调展示时改同目录 `overrides.ts`（`EXCLUDED_IDS` 排除、`MARKET_OVERRIDES` 市场归类、`PLACEHOLDER_OVERRIDES` 占位）。
3. 分类在同目录 `categories.ts` 注册（含图标 / 颜色）；类型见 `types.ts`（`MarketKey` / `PlaygroundMethod` / `FormField`）。

中英文 Playground 共用同一套组件，无需维护两份方法列表。

## 检查清单总结

```text
□ yarn build 成功
□ yarn test 通过
□ yarn test:integration 通过（如有相关修改）
□ README.md 已更新
□ README_EN.md 已更新
□ website/ 中文文档已更新
□ website/en/ 英文文档已更新
□ docs:check / build:docs 已验证（如有文档改动）
□ Playground 已更新（如适用）
```

## 常用命令

```bash
# 构建
yarn build

# 测试
yarn test
yarn test:unit
yarn test:integration

# 文档
yarn dev
yarn docs:meta
yarn docs:check
yarn build:docs
yarn build:pages
```

## SDK 主要 API

以下列表以当前 `StockSDK` 公共门面方法为准，供 AI 快速理解项目能力边界。

### 实时行情

| 方法 | 说明 |
|------|------|
| `quotes.cn(codes)` | A 股 / 指数全量行情 |
| `quotes.cnSimple(codes)` | A 股 / 指数简要行情 |
| `quotes.hk(codes)` | 港股行情 |
| `quotes.us(codes)` | 美股行情 |
| `quotes.fund(codes)` | 公募基金行情 |

### K 线与分时

| 方法 | 说明 |
|------|------|
| `kline.cn(symbol, options)` | A 股历史 K 线 |
| `kline.cnMinute(symbol, options)` | A 股分钟 K 线 / 分时 |
| `kline.hk(symbol, options)` | 港股历史 K 线 |
| `kline.hkMinute(symbol, options)` | 港股分钟 K 线 / 当日分时（v1.10.0+） |
| `kline.us(symbol, options)` | 美股历史 K 线 |
| `kline.usMinute(symbol, options)` | 美股分钟 K 线 / 当日分时（v1.10.0+） |
| `quotes.timeline(code)` | A 股当日分时走势 |

### 技术指标

| 方法 | 说明 |
|------|------|
| `kline.withIndicators(symbol, options)` | 获取带技术指标的 K 线数据 |
| `calcMA(data, options)` | 均线（SMA / EMA / WMA） |
| `calcMACD(data, options)` | MACD |
| `calcBOLL(data, options)` | 布林带 |
| `calcKDJ(data, options)` | KDJ |
| `calcRSI(data, options)` | RSI |
| `calcWR(data, options)` | WR |
| `calcBIAS(data, options)` | BIAS |
| `calcCCI(data, options)` | CCI |
| `calcATR(data, options)` | ATR |
| `calcOBV(data, options)` | OBV |
| `calcROC(data, options)` | ROC |
| `calcDMI(data, options)` | DMI |
| `calcSAR(data, options)` | SAR |
| `calcKC(data, options)` | KC |
| `addIndicators(data, options)` | 批量添加指标 |

### 板块数据

| 方法 | 说明 |
|------|------|
| `board.industry.list()` | 行业板块列表 |
| `board.industry.spot(symbol)` | 行业板块实时行情 |
| `board.industry.constituents(symbol)` | 行业板块成分股 |
| `board.industry.kline(symbol, options)` | 行业板块历史 K 线 |
| `board.industry.minuteKline(symbol, options)` | 行业板块分钟行情 |
| `board.concept.list()` | 概念板块列表 |
| `board.concept.spot(symbol)` | 概念板块实时行情 |
| `board.concept.constituents(symbol)` | 概念板块成分股 |
| `board.concept.kline(symbol, options)` | 概念板块历史 K 线 |
| `board.concept.minuteKline(symbol, options)` | 概念板块分钟行情 |

### 批量与代码列表

| 方法 | 说明 |
|------|------|
| `codes.cn(options)` | 获取 A 股代码列表 |
| `codes.us(options)` | 获取美股代码列表 |
| `codes.hk()` | 获取港股代码列表 |
| `codes.fund()` | 获取基金代码列表 |
| `batch.cn(options)` | 获取全市场 A 股行情 |
| `batch.hk(options)` | 获取全市场港股行情 |
| `batch.us(options)` | 获取全市场美股行情 |
| `batch.byCodes(codes, options)` | 按代码列表批量获取 A 股行情 |
| `batch.raw(params)` | 批量原始查询 |

### 其他股票数据

| 方法 | 说明 |
|------|------|
| `quotes.fundFlow(codes)` | 资金流向（简版） |
| `quotes.largeOrder(codes)` | 盘口大单占比 |
| `reference.tradingCalendar()` | A 股交易日历 |
| `calendar.marketStatus(market)` | 市场开 / 休市状态 |
| `search(keyword)` | 股票搜索 |
| `reference.dividendDetail(symbol)` | 分红派送详情 |

### 期货数据

| 方法 | 说明 |
|------|------|
| `futures.kline(symbol, options)` | 国内期货历史 K 线 |
| `futures.globalSpot(options)` | 全球期货实时行情 |
| `futures.globalKline(symbol, options)` | 全球期货历史 K 线 |
| `futures.inventorySymbols()` | 期货库存品种列表 |
| `futures.inventory(symbol, options)` | 期货库存数据 |
| `futures.comexInventory(symbol, options)` | COMEX 黄金 / 白银库存 |

### 期权数据

| 方法 | 说明 |
|------|------|
| `options.index.spot(product, contract)` | 中金所股指期权 T 型报价 |
| `options.index.kline(symbol)` | 中金所股指期权日 K 线 |
| `options.cffex.quotes(options)` | 中金所全部期权实时行情 |
| `options.etf.months(cate)` | ETF 期权到期月份 |
| `options.etf.expireDay(cate, month)` | ETF 期权到期日与剩余天数 |
| `options.etf.minute(code)` | ETF 期权当日分钟行情 |
| `options.etf.dailyKline(code)` | ETF 期权日 K 线 |
| `options.etf.fiveDayMinute(code)` | ETF 期权 5 日分钟行情 |
| `options.commodity.spot(variety, contract)` | 商品期权 T 型报价 |
| `options.commodity.kline(symbol)` | 商品期权日 K 线 |
| `options.lhb(symbol, date)` | 期权龙虎榜 |

### 资金流向（深度）

| 方法 | 说明 |
|------|------|
| `fundFlow.individual(symbol, options)` | 个股资金流历史（日 / 周 / 月） |
| `fundFlow.market()` | 大盘资金流（上证 + 深证） |
| `fundFlow.rank(options)` | 个股资金流排名（沪深北全市场） |
| `fundFlow.sectorRank(options)` | 板块资金流排名（行业 / 概念 / 地域） |
| `fundFlow.sectorHistory(symbol, options)` | 单个板块历史资金流 |

### 沪深港通 / 北向资金

| 方法 | 说明 |
|------|------|
| `northbound.minute(direction)` | 北向 / 南向资金分时 |
| `northbound.summary()` | 沪深港通资金流向汇总 |
| `northbound.holdingRank(options)` | 北向 / 沪股通 / 深股通持股排行 |
| `northbound.history(direction, options)` | 北向 / 南向按日历史 |
| `northbound.individual(symbol, options)` | 个股北向持仓历史 |

### 涨停 / 盘口异动

| 方法 | 说明 |
|------|------|
| `marketEvent.ztPool(type, date?)` | 涨停 / 跌停 / 强势等股池（含连板数） |
| `marketEvent.stockChanges(type)` | 盘口异动（22 种类型） |
| `marketEvent.boardChanges()` | 当日板块异动 |

### 龙虎榜

| 方法 | 说明 |
|------|------|
| `dragonTiger.detail(options)` | 龙虎榜详情（按日期范围） |
| `dragonTiger.stockStats(period)` | 个股上榜统计 |
| `dragonTiger.institution(options)` | 机构买卖统计 |
| `dragonTiger.branchRank(period)` | 营业部排行 |
| `dragonTiger.seatDetail(symbol, date)` | 个股某日上榜席位明细 |

### 大宗交易 / 融资融券

| 方法 | 说明 |
|------|------|
| `blockTrade.marketStat()` | 大宗交易市场每日总览 |
| `blockTrade.detail(options)` | 大宗交易明细（按日期范围） |
| `blockTrade.dailyStat(options)` | 大宗交易每日统计（按股票汇总） |
| `margin.accountInfo()` | 融资融券账户统计 |
| `margin.targetList(date?)` | 融资融券标的明细 |

### 公募基金扩展（v1.10.0+）

| 方法 | 说明 |
|------|------|
| `fund.dividendList(options)` | 基金 / ETF 分红明细 |
| `fund.navHistory(code)` | 基金历史净值（单位 + 累计） |
| `fund.estimate(code)` | 当日实时估值（T-1 净值 + 盘中估算） |
| `fund.rankHistory(code)` | 同类排名走势 |

> 完整方法签名与参数以 `src/sdk.ts` 门面、README 和 website API 文档为准；上表用于让 AI 快速把握能力边界，新增能力时请同步本表。

## Git 提交规范

使用语义化提交信息：

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档更新 |
| `refactor` | 代码重构 |
| `test` | 测试相关 |
| `chore` | 构建 / 工具相关 |

示例：`feat: 添加创业板指数支持`

## 注意事项

1. **保持零运行时依赖**：不要引入新的运行时依赖。
2. **双端兼容**：代码必须同时兼容浏览器和 Node.js。
3. **向后兼容**：公共 API 变更要谨慎，优先兼容旧调用方式。
4. **中文支持**：涉及 GBK 编码时优先使用既有 `decodeGBK` 能力。
5. **并发控制**：批量请求优先复用现有 `asyncPool` 与 provider 内并发控制逻辑。
6. **请求治理**：优先复用 `RequestClient` 及其 provider policy，不要在 provider 内随意绕过重试、限流、熔断。
7. **分层边界**：provider 只取数解析、service 编排业务、`sdk.ts` 门面只做薄委托；不要跨层（如在门面写业务、在 provider 调另一个 provider）。
8. **浏览器专用数据源**：无 CORS 头的源（如天天基金）走 `<script>` 注入，统一复用 `core/jsVars.ts` + `core/scriptMutex.ts`，保证双端可用与注入并发安全。
9. **文档同步**：新增对外能力时，README、website 中文、website 英文、Playground 需同步更新。
