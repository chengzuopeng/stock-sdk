# stock-node-sdk

[![license](https://img.shields.io/badge/license-ISC-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://stock-sdk.linkdiary.cn/mcp/)

**[English](./README_EN.md)** | 中文

面向 **Node.js 18.17+** 的多源高可用财经数据 SDK —— 统一输入输出 Schema、能力驱动多源自动容错，与 [`stock-sdk`](https://www.npmjs.com/package/stock-sdk)（浏览器 + Node.js 零依赖版）共享核心层并保持 **100% 严格超集 API 对齐**。

📖 **完整文档**：[Node 增强版指南](https://stock-sdk.linkdiary.cn/guide/node-sdk) ｜ [Node 专属 API](https://stock-sdk.linkdiary.cn/api/node-extensions) ｜ [GitHub Monorepo](https://github.com/chengzuopeng/stock-sdk)

> 需要浏览器端直连、零依赖、轻量体积？请使用同仓兄弟包 [`stock-sdk`](https://www.npmjs.com/package/stock-sdk)。

## 核心特性

- **屏蔽数据源差异，统一输出 Schema**：默认零配置无需指定数据源，所有候选源均归一化为严格 TypeScript 类型输出（统一手/万元/亿元单位、时区与 UTC 毫秒时间戳）。
- **能力驱动多源容错（`SourceRouter`）**：
  - 按 `supports(input)` 筛选数据源，逐条校验返回数据的 `requiredFields`，缺字段时继续切源。
  - 严格复权模式会跳过口径不兼容的源，并校验腾讯返回的复权序列。路由接受单次调用的 `signal`。
  - 源级健康度追踪与软限流自适应冷却（`SourceHealthTracker`）；
  - `sdk.withMeta()` 基于 `AsyncLocalStorage` 并发安全溯源，不污染原业务数组/对象返回结构；
  - `sdk.registerAdapter()` 支持热插拔自定义或付费数据源。
- **Node 专属传输层与持久化存储**：
  - 完整 `GET`/`POST`、按域名自动注入 `Referer`/`Origin`/`User-Agent`、GBK HTML 表格解析；
  - 内置 `CookieJar` + `SessionManager`（并发去重预热与 401/403 自动刷新重放）；
  - 基于 `undici.ProxyAgent` 的代理池轮换与失败节点冷却（`ProxyPool`）；
  - 内置 `FileCacheStore` 仅清理可识别的缓存条目。财务和公司治理接口的缓存按生效的锁源策略区分。
- **覆盖更全的金融数据域**：完整继承 `stock-sdk` 全部 94 个方法（A/HK/US 行情、K 线、板块、资金流、期货、期权、基金、技术指标、信号、选股回测），并新增 11 个 Node 专属方法：
  - **`financial`**：`indicators` / `income` / `balance` / `cashflow` / `forecast` / `express`
  - **`news`**：`flash`（7×24 快讯）/ `announcements`（上市公司公告与 PDF 原文）
  - **`corporate`**：`topHolders`（十大流通股东）/ `holderCount`（股东户数）
  - **`bond`**：`convertibleList`（可转债条款列表）
- **增强版 CLI 与 MCP Server**：`stock-node-sdk` CLI（105 命令 + `--source` / `--proxy` / `--cache-dir`）与 `stock-node-sdk mcp`（104 工具）。

## 多源支持矩阵

| 能力 | 默认源优先级 | 路由约束说明 |
|---|---|---|
| `quotes.cn` / `quotes.cnSimple` | 腾讯 → 新浪 (`hq.sinajs.cn`) → 东财 (`push2`) | 三源统一单位与时间戳，支持 `requiredFields` |
| `quotes.hk` | 腾讯 → 东财 → 新浪 → **CNBC** *(海外)* | 国内 3 源 + 海外跨区容错（`overseas: false` 可关） |
| `quotes.us` | 腾讯 → 新浪 → 东财 → **CNBC** → **Nasdaq** *(海外)* | 国内 3 源 + 海外双源跨区容错 |
| `batch.cn` / `batch.hk` / `batch.us` | 腾讯分批 → 东财 `clist` 全市场分页 | 支持 `market` 过滤与 `onProgress` |
| `kline.cn`（日/周/月） | 东财 → 腾讯 → 新浪 | 默认严格模式：`qfq`/`hfq` 自动跳过新浪；`chips.cn` 强制 `turnoverRate` |
| `kline.hk` / `kline.us` | 东财 → 腾讯 → **CNBC** / **Nasdaq** *(海外)* | 日 K 支持海外跨区兜底 |
| `reference.dividendDetail` | A 股（东财→新浪 HTML）/ 港股（东财）/ 美股（东财→**Nasdaq**） | 自动识别 A/HK/US 三市场 |
| `financial.*` | A/HK/US 东财数据中心；美股三大表备源 **Nasdaq** *(海外)* | 三市场统一 Schema |
| `news.flash` | 东财 7×24 → 新浪 7×24 | `page > 1` 自动直走支持翻页的新浪 |
| `news.announcements` | A 股（东财/巨潮）/ 港股（**港交所披露易**）/ 美股（**SEC EDGAR**） | 按标的自动路由官方披露源 |
| `corporate.*` / `bond.*` | 东方财富数据中心 | 支持通过 `registerAdapter()` 追加备源 |

## 安装

```bash
pnpm add stock-node-sdk@beta
# 或 npm install stock-node-sdk@beta
```

## 快速上手

```ts
import { StockNodeSDK, FileCacheStore } from 'stock-node-sdk';

const sdk = new StockNodeSDK({
  timeout: 15_000,
  // 可选：启用本地磁盘持久化缓存（财务/股东/可转债自动落盘）
  cache: { store: new FileCacheStore({ dir: './.stock-cache' }) },
  // 可选：海外数据源（CNBC / Nasdaq / SEC）默认开启；大陆无代理直连环境可设为 false 一键关闭
  // overseas: false,
  // 可选：配置代理或代理池轮换
  // proxy: ['http://127.0.0.1:7890'],
});

// 1. 多源自动容错（腾讯 → 新浪 → 东财），可选 withMeta 并发安全溯源
const { data: quotes, trace } = await sdk.withMeta(() =>
  sdk.quotes.cn(['600519', '000001'])
);
console.log(quotes[0].price, '命中源:', trace?.selectedProvider);

// 2. Node 专属：财务指标、7×24 快讯、巨潮/东财双源公告
const indicators = await sdk.financial.indicators('600519', { pageSize: 4 });
const flashes = await sdk.news.flash({ pageSize: 10 });
const announcements = await sdk.news.announcements({ symbol: '600519', keyword: '分红' });

// 3. 脚本或服务退出时关闭代理连接池
await sdk.close();
```

## Subpath 按需导出

```ts
import { SourceRouter, SourceHealthTracker } from 'stock-node-sdk/router';
import { calcMACD, addIndicators } from 'stock-node-sdk/indicators';
import { normalizeSymbol } from 'stock-node-sdk/symbols';
import { calcSignals } from 'stock-node-sdk/signals';
import { screen, backtest } from 'stock-node-sdk/screener';
import { MemoryCacheStore, cacheThrough } from 'stock-node-sdk/cache';
import { SdkError, getSdkErrorCode } from 'stock-node-sdk/errors';
import { startMcpServer, NODE_MCP_TOOLS } from 'stock-node-sdk/mcp';
```

## CLI 与 MCP Server

```bash
# CLI（105 条命令，额外支持 --source / --proxy / --cache-dir）
npx stock-node-sdk@beta quotes cn 600519 --source sina --pretty
npx stock-node-sdk@beta financial indicators 600519 --pageSize 4 --cache-dir ./.stock-cache --pretty
npx stock-node-sdk@beta news flash --pageSize 10
npx stock-node-sdk@beta news announcements --symbol 600519 --keyword 分红

# MCP Server（104 个全量工具，默认多源容错）
npx stock-node-sdk@beta mcp --cache-dir ./.stock-cache
```

在 Cursor / Claude Desktop / Codex / Gemini 中配置 `mcpServers`：

```json
{
  "mcpServers": {
    "stock-node-sdk": {
      "command": "npx",
      "args": ["-y", "stock-node-sdk@beta", "mcp"],
      "env": { "STOCK_SDK_MCP_TOOLS": "full" }
    }
  }
}
```

## License

[ISC](./LICENSE)
