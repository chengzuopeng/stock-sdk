# 安装

`stock-sdk` 零运行时依赖，可在**浏览器与 Node.js 18+** 双端使用，同时提供 ESM 与 CJS 产物。

## 安装包

::: code-group

```bash [npm]
npm install stock-sdk
```

```bash [yarn]
yarn add stock-sdk
```

```bash [pnpm]
pnpm add stock-sdk
```

:::

> 要求 Node.js >= 18。`stock-sdk` 没有任何运行时依赖，`npm install` 不会拉取第三方包。

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

> 每个 subpath 都在 `package.json` 的 `exports` 中声明，import / require / types 三件套齐全。

## CLI

主包自带命令行工具，无需额外安装即可在终端取数：

```bash
# 一次性运行
npx stock-sdk quote sh600519

# 或全局安装后使用 stock-sdk 命令
npm install -g stock-sdk
stock-sdk kline 600519 --period day
```

CLI 默认输出 JSON（管道友好），详见 [CLI 命令总览](/cli/)。

## MCP

启动内置 MCP server，供 Cursor / Claude / Codex 等 AI 工具接入：

```bash
stock-sdk mcp
```

MCP 协议为零依赖手写的最小实现（`stdio + tools`），开箱即用。各 AI 客户端的接入配置见 [MCP 安装配置](/mcp/installation)。

> CLI 与 MCP 走独立入口，`import { StockSDK } from 'stock-sdk'` 时它们的代码**一字节都不会进用户 bundle**，主包始终保持零依赖。

## 下一步

- [快速开始](/guide/getting-started)：10 行命名空间 demo。
- [符号与代码规则](/guide/symbols)：`string` 与 `SymbolRef` 的写法约定。
