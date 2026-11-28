# Node Enhanced SDK (`stock-node-sdk`) <Badge type="tip" text="Node 18.17+" /> <Badge type="warning" text="Beta" />

`stock-node-sdk` is the **Node.js server-side enhanced edition** built in the same monorepo. It shares the symbol model, types, indicators, signals, and screener/backtest core with `stock-sdk`, and exposes a **strict superset** of the v2 namespaced API.

Use `stock-sdk` when you want zero dependencies and direct browser execution; switch to `stock-node-sdk` for Node.js services, quantitative pipelines, data collection, or AI Agents / MCP that require **capability-aware multi-source failover**, **financial statements, 24/7 news flashes, official announcements, proxy pools, and disk caching**.

## Comparison

| Dimension | `stock-sdk` | `stock-node-sdk` |
|---|---|---|
| Runtime | Browser + Node.js 18+ | Node.js 18.17+ only |
| Runtime Dependencies | **Zero** | Minimal (`undici` for proxy pool) |
| Failover & Routing | A-share K-line fallback | **Capability-aware `SourceRouter`** (3-source CN/HK/US quotes, multi-source K-lines, dual-source news & announcements, adaptive health cooldown) |
| HTTP Transport | Browser-safe GET / JSONP / `<script>` | Full `GET`/`POST`, per-host `Referer`/`Origin`, `CookieJar`, `SessionManager`, `ProxyPool` |
| Persistent Cache | In-memory | In-memory + built-in **`FileCacheStore`** |
| Exclusive Domains | — | **`financial`**, **`news`**, **`corporate`**, **`bond`** |
| CLI / MCP | `stock-sdk` (94 commands / 93 tools) | `stock-node-sdk` (105 commands / 104 tools) |

## Installation & Quick Start

```bash
pnpm add stock-node-sdk@beta
# or npm install stock-node-sdk@beta
```

```ts
import { StockNodeSDK, FileCacheStore } from 'stock-node-sdk';

const sdk = new StockNodeSDK({
  timeout: 15_000,
  cache: {
    store: new FileCacheStore({ dir: './.stock-cache' }),
  },
  // Overseas sources (CNBC / Nasdaq / SEC EDGAR) are enabled by default;
  // set `overseas: false` for direct mainland China environments without proxies
  // overseas: false,
  // Optional proxy or rotating proxy pool
  // proxy: ['http://127.0.0.1:7890'],
});

// Unified output with automatic Tencent -> Sina -> Eastmoney failover
const quotes = await sdk.quotes.cn(['600519', '000001']);

// Node-exclusive domains
const indicators = await sdk.financial.indicators('600519', { pageSize: 4 });
const flashes = await sdk.news.flash({ pageSize: 10 });
const notices = await sdk.news.announcements({ symbol: '600519', keyword: '分红' });

await sdk.close();
```

## Routing Trace & Escape Hatches

```ts
// Concurrency-safe provenance via AsyncLocalStorage without altering return shapes
const { data, trace } = await sdk.withMeta(() => sdk.quotes.cn(['600519']));
console.log(trace?.selectedProvider, trace?.degraded, trace?.attempts);

// Lock a specific source or override source priority
const fromSina = await sdk.quotes.cn(['600519'], { source: 'sina' });
const klines = await sdk.kline.cn('600519', { adjust: 'qfq' }, { requiredFields: ['turnoverRate'] });

// Inspect per-(capability, provider) health and cooldown state
console.log(sdk.getSourceHealth());
```

> [!TIP] Strict Adjustment Protection & `overseas` Toggle
> - K-line routes in `StockNodeSDK` default to `strictCapabilities: true`. Adjusted A-share daily, weekly, and monthly requests skip Sina. A-share 5- to 60-minute requests use Tencent and Sina fallbacks only when `adjust: ''`. Tencent history must contain the requested adjustment series or the backward-adjusted series used to calculate forward-adjusted prices.
> - Tencent anchors forward-adjusted A-share history to the latest daily bar. In strict mode, CNBC and Nasdaq require an explicit `startDate` covered by their data. Nasdaq queries an extra week before the start to account for non-trading days and trims the result to the requested dates.
> - Overseas sources (`CNBC` / `Nasdaq` / `SEC EDGAR`) are **enabled by default** at lower priority than domestic feeds (zero overhead on healthy paths, cross-region failover when domestic sources fail). For direct mainland China networks without a proxy, disable them anytime via `new StockNodeSDK({ overseas: false })` or CLI `--overseas=false`.

`requiredFields` checks the adapter's declared fields and every returned record. Missing fields, `null`, blank strings, and non-finite numbers trigger failover. Zero is valid.

Pass `{ signal: controller.signal }` to methods that accept route options to cancel a single call. Cancelled calls return an `ABORTED` error and built-in adapters stop their upstream requests.

Financial and corporate data are cached by the effective source policy, including instance-level `routing.forcedSource` and per-call `source`. `FileCacheStore.clear()` and `cleanup()` remove recognized cache entries only.

## Multi-Source Matrix

| Capability | Default Source Priority | Routing Constraints |
|---|---|---|
| `quotes.cn` / `quotes.cnSimple` | Tencent → Sina (`hq.sinajs.cn`) → Eastmoney (`push2`) | Unified units (lots / 10k CNY / 100M cap) & timestamps |
| `quotes.hk` | Tencent → Eastmoney → Sina → **CNBC** *(overseas)* | Domestic 3-source + overseas CNBC failover |
| `quotes.us` | Tencent → Sina → Eastmoney → **CNBC** → **Nasdaq** *(overseas)* | Domestic 3-source + overseas dual failover |
| `batch.cn` / `batch.hk` / `batch.us` | Tencent batch → Eastmoney `clist` pagination | Supports `market` filtering & `onProgress` callback |
| `kline.cn` | Eastmoney → Tencent → Sina | Strict mode skips Sina for `qfq`/`hfq`; `chips.cn` enforces `requiredFields: ['turnoverRate']` |
| `kline.hk` | Eastmoney → Tencent (`hkfqkline`) → **CNBC** *(overseas)* | CNBC's split-adjusted daily series serves `qfq` |
| `kline.us` | Eastmoney → Tencent (`usfqkline`) → **CNBC** → **Nasdaq** *(overseas)* | Overseas split-adjusted daily series serve `qfq`. Nasdaq paginates by offset within a fixed date window. |
| `reference.dividendDetail` | **CN**: Eastmoney → Sina HTML<br>**HK**: Eastmoney (`RPT_HKF10`)<br>**US**: Eastmoney (`RPT_USF10`) → **Nasdaq** *(overseas)* | Auto-detects CN / HK / US symbols |
| `financial.indicators` / `income` / `balance` / `cashflow` | **CN/HK/US**: Eastmoney Datacenter<br>**US statements fallback**: **Nasdaq** *(overseas)* | Unified schemas across CN/HK/US (Nasdaq thousands USD auto-scaled ×1000) |
| `news.flash` | Eastmoney 7×24 → Sina 7×24 | `page > 1` routes directly to paginated Sina feed |
| `news.announcements` | **CN**: Eastmoney → CNINFO (`POST`)<br>**HK**: **HKEXnews**<br>**US**: **SEC EDGAR** *(overseas)* | Routes to official exchange disclosures by market |
| `corporate.*` / `bond.*` | Eastmoney Datacenter | Extensible via `registerAdapter()` |

## CLI & MCP

`stock-node-sdk` CLI includes all `stock-sdk` commands plus 11 Node-exclusive commands and three extra global flags: `--source`, `--proxy`, and `--cache-dir`:

```bash
# CLI (supports --source / --proxy / --cache-dir)
npx stock-node-sdk@beta quotes cn 600519 --source sina --pretty
npx stock-node-sdk@beta financial indicators 600519 --pageSize 4 --cache-dir ./.stock-cache --pretty
npx stock-node-sdk@beta news flash --pageSize 10

# MCP Server (104 tools, also accepts --source / --proxy / --cache-dir)
npx stock-node-sdk@beta mcp --cache-dir ./.stock-cache
```

See [Node Extensions API](/en/api/node-extensions) for full method signatures and TypeScript types.
