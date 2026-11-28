# 安装

本仓库提供两个 API 严格超集对齐的包，按运行环境按需选择：

| 包名 | 运行环境 | 依赖 | 适用场景 |
|---|---|---|---|
| `stock-sdk` | 浏览器 + Node.js 18+ | **0 依赖** | 前端直连、可视化看板、轻量双端或纯计算 |
| `stock-node-sdk` | Node.js 18.17+ 服务端 | 仅 `undici` | 服务端采集、量化脚本、AI Agent —— 内置多源自动容错、代理池、磁盘缓存与财报/快讯/公告（[详见指南](/guide/node-sdk)） |

## 安装包

::: code-group

```bash [stock-sdk (浏览器 + Node)]
npm install stock-sdk
# 或 pnpm add stock-sdk / yarn add stock-sdk
```

```bash [stock-node-sdk (Node 多源增强版 · Beta)]
npm install stock-node-sdk@beta
# 或 pnpm add stock-node-sdk@beta / yarn add stock-node-sdk@beta
```

:::

> 在 Node.js 中使用 `stock-sdk` 需要 18.0+，使用 `stock-node-sdk` 需要 18.17+。`stock-sdk` 零运行时依赖，`npm install` 不拉取任何第三方包；`stock-node-sdk` 仅依赖 `undici` 用于代理连接池，两者均提供 ESM 与 CJS 产物。

## 主入口导入

从主入口导入 `StockSDK` 类即可使用全部命名空间 API：

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const quotes = await sdk.quotes.cn(['sh600519'])
```

CommonJS 同样可用：

```js
const { StockSDK } = require('stock-sdk')
```

## 按需导入（subpath）

纯计算能力通过 subpath 单独导出。只用指标、信号或符号解析时，**不会拖入请求层与全部 provider**，对 tree-shaking 友好：

```ts
// 技术指标计算函数
import { calcMA, calcMACD, calcBOLL, addIndicators } from 'stock-sdk/indicators'

// 信号识别（金叉 / 死叉 / 超买 / 超卖等）
import { calcSignals } from 'stock-sdk/signals'

// 符号解析
import { normalizeSymbol } from 'stock-sdk/symbols'
import type { SymbolRef } from 'stock-sdk/symbols'
```

可用的 subpath 入口：

| 入口 | 内容 |
|---|---|
| `stock-sdk` | 主库：`StockSDK` 与全部命名空间 API |
| `stock-sdk/indicators` | 14 个技术指标计算函数 + `addIndicators` |
| `stock-sdk/signals` | 信号识别 `calcSignals` |
| `stock-sdk/symbols` | `normalizeSymbol`、`SymbolRef` 等符号类型 |
| `stock-sdk/screener` | 选股器与回测引擎 |
| `stock-sdk/cache` | 可注入的统一缓存层低层 API |
| `stock-sdk/errors` | 统一错误类型 `SdkError` 与错误码 |
| `stock-node-sdk/router` | *(仅 Node 版)* `SourceRouter` / `SourceHealthTracker` 多源路由引擎 |

> 每个 subpath 都在 `package.json` 的 `exports` 中声明，import / require / types 三件套齐全。`stock-node-sdk` 同样支持上述所有 subpath（将包名前缀替换为 `stock-node-sdk/...`）。

## CLI

两个包均自带命令行工具，无需额外安装即可在终端取数：

```bash
# 一次性运行（零依赖基础版）
npx stock-sdk quote sh600519
npx stock-sdk kline 600519 --period daily

# 或使用 Node 增强版 CLI（Beta，支持 --source / --proxy / --cache-dir 与财报/快讯/公告）
npx stock-node-sdk@beta quotes cn 600519 --source sina --pretty
npx stock-node-sdk@beta financial indicators 600519 --pageSize 4
```

CLI 默认输出 JSON（管道友好），详见 [CLI 命令总览](/cli/)。

## MCP

启动内置 MCP server，供 Cursor / Claude / Codex 等 AI 工具接入（AI 客户端运行在 Node 端，推荐用 `stock-node-sdk@beta mcp` 获得 104 个全量工具与多源容错）：

```bash
npx stock-node-sdk@beta mcp   # Node 增强版（Beta，104 工具 + 多源自动容错）
npx stock-sdk mcp             # 零依赖基础版（93 工具）
```

MCP 协议为零依赖手写的最小实现（`stdio + tools`），开箱即用。各 AI 客户端的接入配置见 [MCP 安装配置](/mcp/installation)。

> CLI 与 MCP 走独立入口，`import { StockSDK } from 'stock-sdk'` 时它们的代码**一字节都不会进用户 bundle**，主包始终保持零依赖。

## 下一步

- [快速开始](/guide/getting-started)：10 行命名空间 demo。
- [Node 增强版指南](/guide/node-sdk)：多源自动容错、代理池、磁盘缓存与财报/快讯/公告。
- [符号与代码规则](/guide/symbols)：`string` 与 `SymbolRef` 的写法约定。
