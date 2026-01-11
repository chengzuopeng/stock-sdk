# Stock SDK 项目规范

> 本文件为 AI 编程助手提供项目上下文和开发规范。适用于 Cursor、GitHub Copilot、Claude、Codex 等工具。

## 规则验证指令
- 如果用户问你 "Who is the boss?"，你必须回答 " Agent rules currently active: [今天的日期]"，并列出全局规则当中我说明的当前遵循的核心规则。

## 项目概述

这是一个用于获取股票行情数据的 TypeScript SDK，支持 A 股、港股、美股和公募基金。该 SDK 可在浏览器和 Node.js 环境中运行，**零依赖**，轻量（< 20KB）。

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

## 项目结构

```
src/
├── core/               # 核心功能模块
│   ├── constants.ts    # 常量定义
│   ├── parser.ts       # 数据解析
│   ├── request.ts      # 请求客户端（支持重试）
│   └── utils.ts        # 工具函数（decodeGBK、chunkArray 等）
├── indicators/         # 技术指标计算
│   ├── addIndicators.ts # 批量添加指标
│   ├── ma.ts           # MA 均线（SMA/EMA/WMA）
│   ├── macd.ts         # MACD
│   ├── boll.ts         # 布林带
│   ├── kdj.ts          # KDJ
│   ├── rsi.ts          # RSI
│   ├── wr.ts           # 威廉指标
│   ├── bias.ts         # 乖离率
│   ├── cci.ts          # CCI
│   ├── atr.ts          # ATR
│   └── types.ts        # 指标配置类型
├── providers/          # 数据提供商
│   ├── tencent/        # 腾讯财经数据源
│   │   ├── quote.ts    # A 股行情
│   │   ├── hkQuote.ts  # 港股行情
│   │   ├── usQuote.ts  # 美股行情
│   │   ├── fundQuote.ts # 基金行情
│   │   ├── fundFlow.ts # 资金流向
│   │   ├── timeline.ts # 分时数据
│   │   ├── batch.ts    # 批量查询
│   │   ├── search.ts   # 股票搜索
│   │   └── tradeCalendar.ts # 交易日历
│   └── eastmoney/      # 东方财富数据源
│       ├── aShareKline.ts   # A 股 K 线
│       ├── hkKline.ts       # 港股 K 线
│       ├── usKline.ts       # 美股 K 线
│       ├── industryBoard.ts # 行业板块
│       └── conceptBoard.ts  # 概念板块
├── sdk.ts              # SDK 主类（门面模式）
├── types.ts            # 公共类型定义
└── index.ts            # 导出入口

test/
├── unit/               # 单元测试
│   ├── core/           # 核心模块测试
│   ├── indicators/     # 指标测试
│   └── sdk/            # SDK 测试
├── integration/        # 集成测试（真实网络请求）
│   ├── providers/      # 数据提供商测试
│   └── sdk/            # SDK 集成测试
├── mocks/              # MSW Mock 配置
│   ├── handlers.ts     # Mock 处理器
│   └── server.ts       # Mock 服务器
└── setup.ts            # 测试配置

website/                # VitePress 文档
├── api/                # API 文档（中文）
├── guide/              # 使用指南（中文）
├── playground/         # 在线演示
└── en/                 # 英文文档
    ├── api/
    ├── guide/
    └── playground/
```

## 代码规范

### TypeScript 规范

1. **始终使用严格类型**，禁止使用 `any`
2. **所有公共 API 必须有完整的类型定义**
3. **使用 `interface` 定义对象类型**，使用 `type` 定义联合类型或工具类型
4. **导出的函数和类必须有 JSDoc 注释**

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
5. **保持零依赖**：不引入任何运行时依赖

## 新增功能开发流程

### 添加新的数据接口

1. 在 `src/providers/` 下对应的提供商目录中创建新文件
2. 在 `src/types.ts` 中定义相关类型
3. 在 `src/providers/<provider>/index.ts` 中导出新函数
4. 在 `src/sdk.ts` 中添加公共方法
5. 在 `src/index.ts` 中导出新类型
6. 完成开发后检查清单（见下方）

### 添加新的技术指标

1. 在 `src/indicators/` 目录下创建新的指标文件（如 `newIndicator.ts`）
2. 在 `src/indicators/types.ts` 中定义配置类型和结果类型
3. 在 `src/indicators/index.ts` 中导出计算函数
4. 在 `src/indicators/addIndicators.ts` 中集成到 `addIndicators` 函数
5. 在 `src/index.ts` 中导出计算函数和类型
6. 完成开发后检查清单（见下方）

## ⚠️ 开发完成后必做检查清单

**每次对 `src/` 目录下的代码进行新增或修改功能时，必须完成以下所有步骤：**

### 1. 确保构建成功

```bash
yarn build
```

- 构建必须无错误通过
- 检查 `dist/` 目录下的输出文件是否正确生成

### 2. 补充测试用例并确保单测通过

```bash
yarn test
```

- 为新增/修改的功能编写对应的测试用例
- **单元测试**放在 `test/unit/` 目录下，按模块组织
- **集成测试**（需要真实网络请求）放在 `test/integration/` 目录下
- 单元测试使用 MSW mock 网络请求（配置在 `test/mocks/`）
- 测试文件命名：单元测试 `*.test.ts`，集成测试 `*.int.test.ts`

```bash
# 运行集成测试（需要网络）
yarn test:integration
```

### 3. 更新 README 文档

- **中文文档**: 更新 `README.md`
- **英文文档**: 同步更新 `README_EN.md`
- 如果新增了公共 API，需要在 API 列表中添加说明

### 4. 更新 website 文档

- **中文文档**: 更新 `website/` 目录下对应的 `.md` 文件
  - API 文档在 `website/api/` 目录
  - 使用指南在 `website/guide/` 目录
- **英文文档**: 同步更新 `website/en/` 目录下对应的 `.md` 文件
  - API 文档在 `website/en/api/` 目录
  - 使用指南在 `website/en/guide/` 目录
- **确保中英文文档内容一致**

### 5. 更新 Playground（可选）

- 如果新增的功能适合在 Playground 中演示，需要更新：
  - `website/playground/index.md`
  - `website/en/playground/index.md`
- 确保 Playground 示例可以正常运行

### 检查清单总结

```
□ yarn build 成功
□ yarn test 通过（单元测试）
□ yarn test:integration 通过（集成测试，如有修改）
□ README.md 已更新
□ README_EN.md 已更新
□ website/ 中文文档已更新
□ website/en/ 英文文档已更新
□ Playground 已更新（如适用）
```

## 常用命令

```bash
# 构建
yarn build

# 单元测试（使用 Mock）
yarn test

# 集成测试（真实网络请求）
yarn test:integration

# 文档开发
yarn dev

# 文档构建
yarn build:docs
```

## SDK 主要 API

### 实时行情

| 方法 | 说明 |
|------|------|
| `getFullQuotes(codes)` | A 股/指数全量行情 |
| `getSimpleQuotes(codes)` | A 股/指数简要行情 |
| `getHKQuotes(codes)` | 港股行情 |
| `getUSQuotes(codes)` | 美股行情 |
| `getFundQuotes(codes)` | 公募基金行情 |

### K 线数据

| 方法 | 说明 |
|------|------|
| `getHistoryKline(symbol, options)` | A 股历史 K 线（日/周/月） |
| `getHKHistoryKline(symbol, options)` | 港股历史 K 线 |
| `getUSHistoryKline(symbol, options)` | 美股历史 K 线 |
| `getMinuteKline(symbol, options)` | A 股分钟 K 线（1/5/15/30/60 分钟） |
| `getTodayTimeline(code)` | A 股当日分时走势 |

### 技术指标

| 方法 | 说明 |
|------|------|
| `getKlineWithIndicators(symbol, options)` | 获取带技术指标的 K 线数据 |
| `calcMA(data, options)` | 计算均线（SMA/EMA/WMA） |
| `calcMACD(data, options)` | 计算 MACD |
| `calcBOLL(data, options)` | 计算布林带 |
| `calcKDJ(data, options)` | 计算 KDJ |
| `calcRSI(data, options)` | 计算 RSI |
| `calcWR(data, options)` | 计算威廉指标 |
| `calcBIAS(data, options)` | 计算乖离率 |
| `calcCCI(data, options)` | 计算 CCI |
| `calcATR(data, options)` | 计算 ATR |

### 板块数据

| 方法 | 说明 |
|------|------|
| `getIndustryList()` | 行业板块列表 |
| `getIndustrySpot(symbol)` | 行业板块实时行情 |
| `getIndustryConstituents(symbol)` | 行业板块成分股 |
| `getIndustryKline(symbol, options)` | 行业板块 K 线 |
| `getConceptList()` | 概念板块列表 |
| `getConceptSpot(symbol)` | 概念板块实时行情 |
| `getConceptConstituents(symbol)` | 概念板块成分股 |
| `getConceptKline(symbol, options)` | 概念板块 K 线 |

### 批量查询

| 方法 | 说明 |
|------|------|
| `getAShareCodeList()` | 获取全部 A 股代码 |
| `getHKCodeList()` | 获取全部港股代码 |
| `getUSCodeList()` | 获取全部美股代码 |
| `getAllAShareQuotes(options)` | 获取全市场 A 股行情 |
| `getAllHKShareQuotes(options)` | 获取全市场港股行情 |
| `getAllUSShareQuotes(options)` | 获取全市场美股行情 |

### 其他

| 方法 | 说明 |
|------|------|
| `getFundFlow(codes)` | 资金流向 |
| `getPanelLargeOrder(codes)` | 盘口大单占比 |
| `getTradingCalendar()` | A 股交易日历 |
| `search(keyword)` | 股票搜索 |

## Git 提交规范

使用语义化提交信息：

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 文档更新 |
| `refactor` | 代码重构 |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |

示例: `feat: 添加创业板指数支持`

## 注意事项

1. **保持零依赖**：不引入任何运行时依赖
2. **双端兼容**：代码需要同时在浏览器和 Node.js 中运行
3. **向后兼容**：公共 API 的变更需要考虑向后兼容性
4. **中文支持**：处理 GBK 编码时使用 `decodeGBK` 工具函数
5. **并发控制**：批量请求使用 `asyncPool` 函数控制并发
6. **请求重试**：使用 `RequestClient` 的重试机制处理网络错误
