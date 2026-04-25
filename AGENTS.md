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
- 资金流向、盘口大单、交易日历、股票搜索
- 分红数据
- 期货数据
- 期权数据
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
│   ├── request.ts           # 请求客户端与 provider policy
│   ├── cache.ts             # 缓存
│   ├── rateLimiter.ts       # 限流
│   ├── circuitBreaker.ts    # 熔断
│   ├── jsonp.ts             # JSONP 请求
│   ├── userAgentPool.ts     # UA 池
│   └── utils.ts             # decodeGBK、chunkArray、asyncPool 等
├── indicators/              # 技术指标
│   ├── addIndicators.ts
│   ├── ma.ts / macd.ts / boll.ts / kdj.ts / rsi.ts / wr.ts
│   ├── bias.ts / cci.ts / atr.ts / obv.ts / roc.ts / dmi.ts
│   ├── sar.ts / kc.ts
│   ├── types.ts
│   └── index.ts
├── providers/               # 数据源适配层
│   ├── index.ts             # 聚合导出 tencent / eastmoney / sina
│   ├── tencent/             # 行情、批量、搜索、交易日历、资金流
│   ├── eastmoney/           # K 线、板块、分红、期货、部分期权
│   └── sina/                # ETF / 股指 / 商品期权
├── sdk.ts                   # StockSDK 门面类
├── types.ts                 # 公共类型定义
├── utils.ts                 # 对外暴露的工具封装
└── index.ts                 # 统一导出入口

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
| 函数名 | camelCase | `getFullQuotes` |
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

### 添加新的数据接口

1. 确认应落在哪个 provider 下：`tencent`、`eastmoney` 或 `sina`
2. 在对应 provider 目录中新建或扩展模块
3. 在 `src/types.ts` 中补充公共类型，必要时在 provider 内定义内部类型
4. 在 `src/providers/index.ts` 或 provider 的 `index.ts` 中补充导出
5. 在 `src/sdk.ts` 中添加门面方法
6. 在 `src/index.ts` 中导出相关方法、类型或配置类型
7. 根据变更补充测试、README 与 website 文档
8. 完成后执行下方检查清单

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
- `src/core/cache.ts`
- `src/core/rateLimiter.ts`
- `src/core/circuitBreaker.ts`
- `src/core/jsonp.ts`

这类修改通常会影响多个 provider，必须补充测试，并优先检查旧配置是否仍然兼容。

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

如果新增能力适合演示，需要更新：

- `website/playground/index.md`
- `website/en/playground/index.md`

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
| `getFullQuotes(codes)` | A 股 / 指数全量行情 |
| `getSimpleQuotes(codes)` | A 股 / 指数简要行情 |
| `getHKQuotes(codes)` | 港股行情 |
| `getUSQuotes(codes)` | 美股行情 |
| `getFundQuotes(codes)` | 公募基金行情 |

### K 线与分时

| 方法 | 说明 |
|------|------|
| `getHistoryKline(symbol, options)` | A 股历史 K 线 |
| `getMinuteKline(symbol, options)` | A 股分钟 K 线 / 分时 |
| `getHKHistoryKline(symbol, options)` | 港股历史 K 线 |
| `getUSHistoryKline(symbol, options)` | 美股历史 K 线 |
| `getTodayTimeline(code)` | A 股当日分时走势 |

### 技术指标

| 方法 | 说明 |
|------|------|
| `getKlineWithIndicators(symbol, options)` | 获取带技术指标的 K 线数据 |
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
| `getIndustryList()` | 行业板块列表 |
| `getIndustrySpot(symbol)` | 行业板块实时行情 |
| `getIndustryConstituents(symbol)` | 行业板块成分股 |
| `getIndustryKline(symbol, options)` | 行业板块历史 K 线 |
| `getIndustryMinuteKline(symbol, options)` | 行业板块分钟行情 |
| `getConceptList()` | 概念板块列表 |
| `getConceptSpot(symbol)` | 概念板块实时行情 |
| `getConceptConstituents(symbol)` | 概念板块成分股 |
| `getConceptKline(symbol, options)` | 概念板块历史 K 线 |
| `getConceptMinuteKline(symbol, options)` | 概念板块分钟行情 |

### 批量与代码列表

| 方法 | 说明 |
|------|------|
| `getAShareCodeList(options)` | 获取 A 股代码列表 |
| `getUSCodeList(options)` | 获取美股代码列表 |
| `getHKCodeList()` | 获取港股代码列表 |
| `getFundCodeList()` | 获取基金代码列表 |
| `getAllAShareQuotes(options)` | 获取全市场 A 股行情 |
| `getAllHKShareQuotes(options)` | 获取全市场港股行情 |
| `getAllUSShareQuotes(options)` | 获取全市场美股行情 |
| `getAllQuotesByCodes(codes, options)` | 按代码列表批量获取 A 股行情 |
| `batchRaw(params)` | 批量原始查询 |

### 其他股票数据

| 方法 | 说明 |
|------|------|
| `getFundFlow(codes)` | 资金流向 |
| `getPanelLargeOrder(codes)` | 盘口大单占比 |
| `getTradingCalendar()` | A 股交易日历 |
| `search(keyword)` | 股票搜索 |
| `getDividendDetail(symbol)` | 分红派送详情 |

### 期货数据

| 方法 | 说明 |
|------|------|
| `getFuturesKline(symbol, options)` | 国内期货历史 K 线 |
| `getGlobalFuturesSpot(options)` | 全球期货实时行情 |
| `getGlobalFuturesKline(symbol, options)` | 全球期货历史 K 线 |
| `getFuturesInventorySymbols()` | 期货库存品种列表 |
| `getFuturesInventory(symbol, options)` | 期货库存数据 |
| `getComexInventory(symbol, options)` | COMEX 黄金 / 白银库存 |

### 期权数据

| 方法 | 说明 |
|------|------|
| `getIndexOptionSpot(product, contract)` | 中金所股指期权 T 型报价 |
| `getIndexOptionKline(symbol)` | 中金所股指期权日 K 线 |
| `getCFFEXOptionQuotes(options)` | 中金所全部期权实时行情 |
| `getETFOptionMonths(cate)` | ETF 期权到期月份 |
| `getETFOptionExpireDay(cate, month)` | ETF 期权到期日与剩余天数 |
| `getETFOptionMinute(code)` | ETF 期权当日分钟行情 |
| `getETFOptionDailyKline(code)` | ETF 期权日 K 线 |
| `getETFOption5DayMinute(code)` | ETF 期权 5 日分钟行情 |
| `getCommodityOptionSpot(variety, contract)` | 商品期权 T 型报价 |
| `getCommodityOptionKline(symbol)` | 商品期权日 K 线 |
| `getOptionLHB(symbol, date)` | 期权龙虎榜 |

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
7. **文档同步**：新增对外能力时，README、website 中文、website 英文需同步更新。
