# stock-node-sdk

[![license](https://img.shields.io/badge/license-ISC-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/protocol-MCP-blue)](https://stock-sdk.linkdiary.cn/en/mcp/)

English | **[中文](./README.md)**

Multi-source, high-availability financial market data SDK for **Node.js 18+** — unified TypeScript schemas, capability-aware automatic failover, and a **strict API superset** of [`stock-sdk`](https://www.npmjs.com/package/stock-sdk) built in the same monorepo.

📖 **Docs**: [Node Enhanced Guide](https://stock-sdk.linkdiary.cn/en/guide/node-sdk) ｜ [Node Extensions API](https://stock-sdk.linkdiary.cn/en/api/node-extensions) ｜ [GitHub Monorepo](https://github.com/chengzuopeng/stock-sdk)

> Need zero runtime dependencies for direct browser execution? Use our sibling package [`stock-sdk`](https://www.npmjs.com/package/stock-sdk).

## Highlights

- **Unified Input/Output Schemas**: Zero-config multi-source aggregation with strict TypeScript types across A-shares, HK, and US markets (unified lot / 10k CNY / 100M cap units, timezones, and UTC epoch timestamps).
- **Capability-Aware `SourceRouter`**:
  - Pre-filters adapters via `supports(input)` and `requiredFields` to prevent silent semantic drift (e.g., skipping unadjusted-only feeds for `qfq`/`hfq` requests);
  - Adaptive per-`(capability, provider)` health tracking and cooldown (`SourceHealthTracker`);
  - Concurrency-safe provenance via `sdk.withMeta()` (`AsyncLocalStorage`) without changing return shapes;
  - Extensible via `sdk.registerAdapter()` for custom/paid feeds.
- **Node-Native Transport & Persistent Storage**:
  - Full `GET`/`POST`, per-host `Referer`/`Origin`/`User-Agent`, zero-dep GBK HTML table parsing;
  - Built-in `CookieJar` + `SessionManager` (deduplicated warmup + 401/403 refresh replay);
  - `ProxyPool` powered by `undici.ProxyAgent` with round-robin rotation and failure cooldown;
  - Zero-dependency `FileCacheStore` for persistent disk caching.
- **Expanded Financial Data Domains**: Inherits all 94 dual-runtime methods from `stock-sdk` and adds 11 Node-exclusive methods:
  - **`financial`**: `indicators` / `income` / `balance` / `cashflow` / `forecast` / `express`
  - **`news`**: `flash` (24/7 market flashes) / `announcements` (corporate disclosures & PDF URLs)
  - **`corporate`**: `topHolders` / `holderCount`
  - **`bond`**: `convertibleList`
- **Enhanced CLI & MCP Server**: `stock-node-sdk` CLI (105 commands + `--source` / `--proxy` / `--cache-dir`) & `stock-node-sdk mcp` (104 tools).

## Multi-Source Matrix

| Capability | Default Source Priority | Routing Constraints |
|---|---|---|
| `quotes.cn` / `quotes.cnSimple` | Tencent → Sina (`hq.sinajs.cn`) → Eastmoney (`push2`) | 3-source failover with unified units & timestamps |
| `quotes.hk` | Tencent → Eastmoney → Sina → **CNBC** *(overseas)* | Domestic 3-source + overseas failover (`overseas: false` to disable) |
| `quotes.us` | Tencent → Sina → Eastmoney → **CNBC** → **Nasdaq** *(overseas)* | Domestic 3-source + overseas dual failover |
| `batch.cn` / `batch.hk` / `batch.us` | Tencent batch → Eastmoney `clist` pagination | Supports `market` filter & `onProgress` |
| `kline.cn` | Eastmoney → Tencent → Sina | Strict mode skips Sina for `qfq`/`hfq`; `chips.cn` requires `turnoverRate` |
| `kline.hk` / `kline.us` | Eastmoney → Tencent → **CNBC** / **Nasdaq** *(overseas)* | Daily K-line falls back to overseas feeds |
| `reference.dividendDetail` | CN (Eastmoney→Sina HTML) / HK (Eastmoney) / US (Eastmoney→**Nasdaq**) | Auto-detects CN / HK / US symbols |
| `financial.*` | CN/HK/US Eastmoney Datacenter; US statements fallback **Nasdaq** *(overseas)* | Unified schemas across CN/HK/US |
| `news.flash` | Eastmoney 7×24 → Sina 7×24 | `page > 1` routes directly to paginated Sina feed |
| `news.announcements` | CN (Eastmoney/CNINFO) / HK (**HKEXnews**) / US (**SEC EDGAR**) | Official exchange disclosures by market |
| `corporate.*` / `bond.*` | Eastmoney Datacenter | Extensible via `registerAdapter()` |

## Installation

```bash
pnpm add stock-node-sdk@beta
# or npm install stock-node-sdk@beta
```

## Quick Start

```ts
import { StockNodeSDK, FileCacheStore } from 'stock-node-sdk';

const sdk = new StockNodeSDK({
  timeout: 15_000,
  cache: { store: new FileCacheStore({ dir: './.stock-cache' }) },
  // Overseas sources (CNBC / Nasdaq / SEC) are enabled by default; set `false` for mainland China direct access
  // overseas: false,
  // Optional proxy or rotating proxy pool
  // proxy: ['http://127.0.0.1:7890'],
});

const { data: quotes, trace } = await sdk.withMeta(() =>
  sdk.quotes.cn(['600519', '000001'])
);
console.log(quotes[0].price, 'provider:', trace?.selectedProvider);

const indicators = await sdk.financial.indicators('600519', { pageSize: 4 });
const flashes = await sdk.news.flash({ pageSize: 10 });
const announcements = await sdk.news.announcements({ symbol: '600519', keyword: '分红' });

await sdk.close();
```

## Subpath Exports

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

## CLI & MCP Server

```bash
# CLI (105 commands, plus --source / --proxy / --cache-dir)
npx stock-node-sdk@beta quotes cn 600519 --source sina --pretty
npx stock-node-sdk@beta financial indicators 600519 --pageSize 4 --cache-dir ./.stock-cache --pretty
npx stock-node-sdk@beta news flash --pageSize 10

# MCP Server (104 tools with multi-source failover)
npx stock-node-sdk@beta mcp --cache-dir ./.stock-cache
```

Configure in Cursor / Claude Desktop / Codex / Gemini:

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
