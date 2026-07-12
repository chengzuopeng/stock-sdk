---
pageClass: changelog-page
---

# Changelog

This page records the release history of Stock SDK. v2.0.0 is an **architectural leap** — without adding data sources, it reworks the symbol model, data contract, API surface, request layer, and error system, and adds a CLI / MCP and subpath exports.

## v2.4.0

> Released: Unreleased

This release lands the Top-15 fixes from the 2026-07 whole-project review (R7-1 ~ R7-15): symbol contracts, data robustness, browser concurrency safety, cache governance, and pagination performance.

### Fixed

- **Bare prefixes no longer swallow real US tickers (R7-1)**: `'USB'` / `'HKD'` are no longer mis-stripped into `US/B` / `HK/0000D`.
- **"With or without prefix" now holds for quote codes (R7-2/R7-3)**: `quotes.*` normalize via `tryToTencentSymbols`; bare and prefixed (`hk00700` / `usBABA`) both work.
- **US K-lines accept bare tickers (R7-4)**: `kline.us('AAPL')` resolves the exchange prefix automatically (cached).
- **Search concurrency safety (R7-5)**: `sdk.search()` moved onto `core/jsVars`, fixing concurrent `v_hint` overwrites / hangs in the browser.
- **jsVars stale-global protection (R7-10)**: fixes cross-request fund-data attribution.
- **ATR recovers from dirty warm-up bars (R7-6)**: one null bar no longer leaves the whole ATR / KC series null forever.
- **SAR skips invalid leading bars (R7-7)**: a null first bar no longer seeds at price 0 (frozen trend).
- **Fund NAV / rank history dirty-row defense (R7-8)**: bad timestamps / missing fields are filtered per row instead of losing the whole result or emitting ghost rows.
- **Truncated Tencent quote rows no longer fabricate zeros (R7-9)**: truncated rows are dropped (were fabricated as 0); HK `currency` gains a check.
- **Datacenter symbol normalization covers all shapes (R7-12)**: `SH600519` / `600519.SH` / `1.600519` no longer silently return empty.
- **Cross-instance cache leakage (R7-11)**: code lists / calendar / board maps are now instance-scoped.
- **`evictLRU` empty-string key**: eviction no longer stalls once `''` is the LRU entry.

### Behavior changes (read before upgrading)

- **`FundNavPoint.nav`: `number` → `number | null`**; null-check before arithmetic.
- **Invalid US tickers: silent empty array → `NotFoundError`.**
- **Truncated Tencent quote rows: fabricated zeros → dropped rows.**
- **Garbage symbols in dividend / dragonTiger / northbound: silent empty array → `InvalidSymbolError`.**
- **`clearSharedCaches()` no longer covers instance-scoped caches** — use the new `sdk.clearCaches()`.
- **`getSharedCache` warns on non-equivalent options**; use `configureSharedCache()` for runtime reconfig.
- **Datacenter pagination is now concurrent (R7-14)**: 3-way waves by default; no RateLimiter by default — configure `rateLimit` if throttling matters.
- **All-uppercase prefix + letters no longer strips (R7-1)**: `'USAAPL'` → `US/USAAPL`; use `usAAPL` / `AAPL.US` / a `market` hint.

### Added

- **Hang Seng family & the three major US indices in `quotes` / `kline` (unified bare codes)**: adds `HSI` / `HSCEI` / `HSTECH` and `DJI` / `INX` / `IXIC`, one code on both ends (K-line previously needed a raw secid like `100.HSI`); `DJIA` and other real tickers are not hijacked, `HSTECH` is Tencent-`quotes`-only.
- `StockSDK.clearCaches()`: clears all of this instance's internal caches.
- `configureSharedCache(namespace, options)`: runtime reconfiguration of shared caches.
- `tryToTencentSymbols(codes, market)` (`stock-sdk/symbols`): batch fault-tolerant normalization to Tencent quote keys.
- `DatacenterQuery.concurrency`: wave size for datacenter pagination.
- **5 MCP tools for block trades / margin trading**: `get_block_trade_market_stat` / `_detail` / `_daily_stat` / `get_margin_account_info` / `_target_list`.
- **MCP Skills (Prompts) — 7 scenario analysis skills**: the server implements `prompts/list` + `prompts/get`; core 4 + full 3, scoped by `STOCK_SDK_MCP_PROMPTS`, read-only. See [AI Skills](/en/mcp/skills).
- **`get_kline_signals` + `sdk.kline.signals(symbol, options)`**: detects 14 technical signals (golden/death crosses, overbought/oversold, BOLL breakouts, SAR reversals); `maFast` / `maSlow` tunable.
- **Full spec ↔ SDK contract tests (R7-15)**: method paths and MCP options keys are mechanically pinned; a `prompts-contract` was added for skills.

::: tip Long-lived processes should reuse a singleton SDK
Since v2.4.0 instance-scoped caches are isolated per `StockSDK` instance (fixing cross-instance leakage). A "new StockSDK() per request" pattern makes every instance start cache-cold (the 6h code-list cache degrades to one fetch per request) — reuse a singleton in long-lived services.
:::

## v2.3.0

> Released: 2026-07-06

### Added

- **Chip distribution `sdk.chips.cn / hk / us`** ([#57](https://github.com/chengzuopeng/stock-sdk/issues/57), thanks [@hawx1993](https://github.com/hawx1993) for the request): computed **locally** from daily K-lines + turnover rate (a TypeScript port of Eastmoney's front-end CYQ algorithm, no new data source) — per-day profit ratio, average cost, 90 / 70 cost ranges with concentration, and an optional 150-bucket **chip-peak histogram** via `includeHistogram`. Unit tests assert per-day, per-field golden parity against the original Eastmoney JS.
  - Pure function `calcChipDistribution(klines, options)` is exported from `stock-sdk/indicators` for user-supplied K-lines; the `tail` option avoids O(N²) work in full-accumulation mode
  - Conventions: `range` defaults to `120` (matches the Eastmoney app); `{ range: 0, adjust: '' }` reproduces akshare's `stock_cyq_em` output — see the [chips docs](/en/api/chips)
  - CLI `stock-sdk chips cn 600519` and MCP tools `get_chip_distribution` (core toolset) / `get_hk_chip_distribution` / `get_us_chip_distribution` derive automatically
- **Per-stock intraday changes `marketEvent.individualChanges` / `individualChangesHistory`** ([#54](https://github.com/chengzuopeng/stock-sdk/issues/54), thanks [@hawx1993](https://github.com/hawx1993) for the request): a single A-share stock's all-type change-event stream for one trading day (time / type / trigger price / change%), plus an N-day (1~60, default 7) aggregation over the trading calendar — per-day `available` flags, `coverage` of the actually-retrievable range, and `stats` keyed by raw type code (with Chinese labels inline).
  - Data source is Eastmoney's per-stock push2ex endpoint (not covered by akshare); the server only retains roughly the last few weeks **with occasional per-date gaps** — always branch on the per-day `available`
  - For a full 30-day view, combine with daily proxies — see the new guide [30-Day Per-Stock Changes Panorama](/en/guide/stock-changes-panorama)
  - MCP tools `get_individual_stock_changes` / `get_individual_stock_changes_history` and the CLI commands derive automatically
- **`marketEvent.stockChanges` multi-type & all**: `type` widens to `StockChangeType | StockChangeType[] | 'all'`; `'all'` fetches all 22 types in one call and auto-paginates by the server-reported total (can exceed 10k rows on a trading day).

### Changed

- **`StockChangeItem` field extension**: adds `typeCode` (raw server type code); `changeType` widens from `StockChangeType` to `StockChangeType | 'unknown'` (new server-side codes no longer lose data). Consumers doing exhaustive switches over `changeType` need an `'unknown'` branch.

## v2.2.2

> Released: 2026-07-04

### Added

- **Indicator `decimals` option**: rounding indicators (ma / macd / boll / kdj / rsi / wr / bias / cci / atr) accept `decimals?: number` to control output precision (e.g. `calcMA(closes, { periods: [5], decimals: 2 })`), available through the SDK, `kline.withIndicators` and MCP.

### Changed

- **Default indicator precision goes from 2 to 3 decimals** (based on [#55](https://github.com/chengzuopeng/stock-sdk/pull/55), thanks [@Ahaochan](https://github.com/Ahaochan)): MA curves of low-priced instruments (e.g. a 3-CNY ETF) no longer look step-shaped. Note this is more than an extra digit: MACD / BOLL / BIAS consume internally rounded EMA/SMA intermediates, so some values differ from the old release at the **2nd** decimal even after re-rounding (roughly half of the MACD histogram values in measurement; golden/death crosses can shift by ±1 bar), and KC shifts with its internal EMA/ATR inputs; recalibrate backtests that snapshot indicator values. The 9 duplicated `round()` helpers are consolidated into one shared module.
- obv / roc / dmi / sar / kc keep emitting raw floats (no rounding), matching previous behavior.

## v2.2.1

> Released: 2026-07-03

### Added

- **Special Eastmoney index support** (reworked from [#51](https://github.com/chengzuopeng/stock-sdk/pull/51), thanks [@wubh2012](https://github.com/wubh2012)): CSI indices recognized by code shape (`93xxxx` / `H`+5 digits, e.g. `930955`, `H30533`, secid prefix `2.`, via `kline.cn`); named indices `HSHCI` (Hang Seng Healthcare Index, `124.`, via `kline.hk`) and `GDAXI` (German DAX, `100.`, via the `kline.us('100.GDAXI')` raw-secid passthrough). The secid forms (`2.930955`, etc.) are valid inputs and round-trip.

### Fixed

- CSI indices were previously inferred as "starts with 9 → Shanghai", building secids like `1.930955` that returned silently empty klines; shape-based recognition fixes the whole family (including future codes) at once.

### Changed

- Special-index code shapes are **syntax-certain** classifications: conflicting hints and prefix / suffix assertions (`sh930955`, `hkHSHCI`, etc.) throw `InvalidSymbolError` with guidance, while explicit assertions like `usGDAXI` and `1.930955` keep their original meaning. `marketOf('HSHCI')` becomes `'HK'`, `marketOf('GDAXI')` becomes `'GLOBAL'`.
- Unsupported paths fail fast uniformly (previously silent empty arrays or guaranteed-empty queries): `toTencentSymbol` / CLI `quote` / `fundFlow.individual` reject special indices, and auto-routing entries give a raw-secid hint for `GLOBAL` symbols. Known limitations: see the [symbols guide](/en/guide/symbols).

## v2.2.0

> Released: 2026-06-27

### Added

- **Theme fund API `sdk.fund.theme.*`**: browse funds by industry / concept theme, also derived to the CLI and MCP (`get_theme_list` / `get_theme_funds`).
  - `getThemeList(options?)` — full theme list (industry / concept, with daily change and 1W / 1M / 3M / 6M / 1Y / 3Y / 5Y stage returns, sortable and paginated)
  - `getThemeFunds(themeCode, options?)` — fund ranking within a theme (fund type, stage returns, latest NAV)

## v2.1.0

> Released: 2026-06-23

### Added

- **`sdk.fund.profile(code)`**: fetch a fund's deep profile in one request (the full set of Eastmoney pingzhongdata fields) — top-10 stock holdings, top-5 bond holdings, quarterly asset allocation, daily position estimates, fund managers (with star rating and ability scores), performance evaluation, holder structure, scale changes, purchase / redemption, stage returns (1 / 3 / 6-month, 1-year) and same-category peers. Shares the data source with `navHistory` / `rankHistory` (the same pingzhongdata file), and is also derived to the CLI (`fund profile`) and MCP (`get_fund_profile`).

### Fixed

- **Fund date alignment**: dates returned by `fund.navHistory` / `fund.rankHistory` / `fund.profile` were sliced from the UTC date and came out one day earlier than the actual trading day (pingzhongdata timestamps are Beijing midnight); now resolved in the Beijing timezone, verified against Tiantian Fund's authoritative NAV date (`jzrq`).
- **`fetchJsVars` single-quote support**: on Node, single-quoted JS literals (e.g. `swithSameType`) now get a fallback parse to match the browser `<script>`-injection path, so such fields are no longer dropped on Node.

## v2.0.0

> Released: 2026-06-18
>
> v2.0.0 is the first stable release of v2, rolling up all the work since the beta. For the detailed changes and breaking-change notes see the `v2.0.0-beta.1` entry below; upgrading from v1? Read the [v1 → v2 migration guide](/en/guide/migration-v1-to-v2) first.

### Since beta.1

- The docs site now owns the primary domain `stock-sdk.linkdiary.cn`; v1 docs are archived at [v1.stock-sdk.linkdiary.cn](https://v1.stock-sdk.linkdiary.cn)
- Wired up a dedicated Grafana Faro monitoring collect channel (app: `stock-sdk-docs-v2`) with sourcemap upload on production builds
- Homepage red theme + live-quote Hero + full Playground rebuild
- npm dist-tags: `latest` of `stock-sdk` now points to v2.0.0; the v1 stable line stays installable as `stock-sdk@legacy` (1.10.1)

## v2.0.0-beta.1

> This release rolls up the v2 stabilization work currently ahead of `origin/feature-v2`: the namespace-only API is now in place, request / time / symbol / provider correctness is tightened, CLI and MCP share one method-spec source, and the v2 docs site plus Playground are filled in.

### Breaking changes

- **v1 flat facade methods removed**: 80 compatibility methods such as `sdk.getXxx()` / `sdk.xxx()` are gone. The public SDK surface is now `sdk.<namespace>.<method>()`, plus the top-level `sdk.search(keyword)`.
- **CLI / MCP contracts derive from one shared spec**: commands and MCP tools are generated from `src/spec/methods.ts`, so enums, defaults and argument shapes are validated from the same source of truth.

### SDK correctness

- **Request cancellation and timeout classification hardened**: external `AbortSignal`, timeout, custom `fetchImpl`, failure accounting and circuit-breaker half-open handling now distinguish cancellation, timeout and upstream failures more reliably.
- **Time and date handling fixed**: `wallTimeToUTC` no longer drifts by one hour on DST transition days; date normalization and validation are shared across provider / SDK / CLI paths.
- **Symbol parsing consolidated**: `normalizeSymbol` now handles hint precedence, dotted secids, HK / US / BSE / futures ambiguities and rejects cross-market conflicts instead of silently fetching the wrong market.
- **Provider resilience improved**: upstream empty responses, pagination guards, direction validation, negative cache behavior, dividend typing and East Money secid edge cases now fail more predictably.
- **Indicators and K-line stability improved**: `kline.withIndicators` has a safer warmup / refetch strategy; recursive-indicator slicing drift is fixed; `addIndicators` accepts docs-friendly shorthands such as `{ ma: [5, 20] }` and `{ rsi: { period: 14 } }`.

### CLI and MCP

- **`stock-sdk call` fixed**: namespaced method `this` binding is preserved, and callable paths are constrained by a shared walker and whitelist.
- **MCP tools derive from the shared spec**: the tool surface is generated from the same method catalog, with `kline.withIndicators` kept as the hand-written adapter for nested indicator options.
- **MCP argument validation is stricter**: unknown fields, type mismatches and optional object params passed as `null` now return `INVALID_ARGUMENT` at the boundary instead of leaking into SDK calls as `UNKNOWN`.
- **stdio transport is quieter**: EPIPE / disconnect boundaries are handled more cleanly when MCP clients close the connection.

### Performance and internals

- **Indicator computation optimized**: SMA / BOLL / KDJ / signal-line style calculations use rolling implementations, with parity tests pinning value-level behavior.
- **Less unnecessary K-line work**: minute K-lines are clipped server-side where possible; `withIndicators` short-circuits avoidable double requests; indicator computation now happens after slicing.
- **Hot-path allocation reduced**: formatter keys, per-bar object rebuilds, quote double parsing and `sortBy` copies were trimmed.
- **Parallel implementations removed**: symbol / time / parsing helpers, path walkers, East Money minute-K factories and date helpers are consolidated.

### Docs site and Playground

- **v2 docs site upgraded**: added the red-market visual theme, live-quote Hero, navigation updates and UI polish.
- **Full Playground added**: `site-v2` now includes Playground components, method categories, code generation, runner logic, parameter overrides and bilingual pages.
- **CLI docs filled in**: new Chinese and English CLI commands pages cover commands, flags, output formats and common flows.
- **docs validation wired to v2**: `docs:meta` / `docs:check` / GitHub Pages builds now support `site-v2`, with forbidden tokens guarding against old broken examples.
- **Examples aligned with implementation**: fixed old K-line period examples, string-array indicator examples, instance-screener examples, per-call signal examples, `--simple` docs and related drift.

### Beta-stage notes

- Unified units remain the v2 target contract. In this beta, runtime values still follow each provider's raw convention until per-source calibration lands.
- Some legacy fields / type names may remain during beta to protect migration. New code should target the namespace API, the `Quote` union and pure-computation subpath entries.

## v2.0.0-beta.0

> 🧪 **First public beta** (`npm i stock-sdk@beta`): the v2.0.0 API surface is stable — try it and send feedback; minor adjustments are still possible before the final release. The items below are the breaking changes and new capabilities relative to v1.
>
> v2 is a **hard, single-track switch** — there is no `compat` entry point and no v1 legacy method aliases. When migrating from v1, read it alongside the [v1 → v2 migration guide](/en/guide/migration-v1-to-v2).

### Breaking changes

- **Namespaced API**: all 105 methods move from the flat `sdk.getXxx()` to namespaces `sdk.<ns>.<method>()` (e.g. `sdk.getFullQuotes()` → `sdk.quotes.cn()`, `sdk.getETFOptionDailyKline()` → `sdk.options.etf.dailyKline()`). There are **no compatibility aliases**; see the [migration guide](/en/guide/migration-v1-to-v2) and the [API Overview](/en/api/) for the full mapping.
- **`Quote` discriminated union**: quote types are consolidated from separate interfaces (`FullQuote` / `HKQuote` / `USQuote` / `FundQuote` …) into a `Quote` union discriminated by `assetType`. Legacy type names may remain during beta to protect migration; new code should target `Quote` and narrow with `switch(q.assetType)`.
- **`raw` field removed**: the `raw: string[]` field on 8 return types (which leaked implementation details) is deleted. The escape hatch becomes a provider-level `getXxxRaw()` debug function and no longer pollutes data objects.
- **Unified units and conventions (target contract)**: `volume` targets **shares**; `amount` / `price` / market cap target the **major unit of each asset's quote currency** (CNY for A-shares, HKD for HK, USD for US, indicated by `currency`, with **no cross-currency conversion**); percentages are **percentage numbers** (e.g. `5.2` means 5.2%). Once fully landed, some numeric conventions will change relative to v1, so backtest / display logic must be recalibrated.
  > ⚠️ Unit conversions (lots→shares ×100, 万→yuan ×10000, etc.) must be calibrated per source against real data; for now values are emitted in each source's raw convention and landed after calibration — subject to the final implementation.
- **`timestamp`: `NaN` → `null`**: unparsable times change from `NaN` to `number | null`; null-checks move from `Number.isNaN(...)` to `=== null`. A `tz` (market time zone) field is also added to dated records.
- **Legacy entries and signatures cleaned up**: v1 flat methods and the legacy `boolean` signatures `getAShareCodeList(boolean)` / `getUSCodeList(boolean)` are removed in favor of namespaced APIs and options-object signatures. Some legacy fields / type names may remain during beta to protect migration; the final source of truth is the type definitions and migration guide.
- **Errors unified as `SdkError`**: the SDK now throws **only `SdkError`**, no longer leaking raw `TypeError` / `DOMException` / `RangeError`. Every error carries a unified `code`, with two new codes — `ABORTED` (external signal cancellation, distinct from `TIMEOUT`) and `UPSTREAM_ERROR` (upstream returned a structured error, distinct from the empty-data `UPSTREAM_EMPTY`). Importable from `stock-sdk/errors`.

### New capabilities

- **Unified symbol model**: `string` is first-class plus an optional `SymbolRef`; `normalizeSymbol` parses leniently (`sh600519` / `600519` / `600519.SH` / `00700` / `hk00700` / `AAPL` / `105.AAPL` / `rb2510` / `CFFEX.IF2412`, etc.). See [Symbols & code rules](/en/guide/symbols).
- **CLI**: `stock-sdk <command>` fetches quotes / K-line / search right in the terminal (`quote` / `kline` / `search` / `mcp` …), with a zero-dependency hand-written arg parser and JSON output by default.
- **MCP server**: `stock-sdk mcp` starts an MCP server in one command for AI tools like Cursor / Claude / Codex. A **zero-dependency, hand-written minimal MCP** (the `stdio + tools` subset) that does not pull in `@modelcontextprotocol/sdk`.
- **Subpath exports**: new sub-entries `stock-sdk/indicators`, `stock-sdk/signals`, `stock-sdk/symbols`, `stock-sdk/screener`, `stock-sdk/cache`, `stock-sdk/errors`. Users of pure computation only (indicators / symbols / signals) no longer drag `RequestClient` and all providers into their bundle.
- **Composable request layer**: `RequestClientOptions` / `GetOptions` gain `fetchImpl` (inject a custom fetch) and `signal` (external cancellation); client-level lifecycle `hooks` are added. See [Request governance](/en/guide/request-governance).
- **Signal layer**: `calcSignals` (event detection for golden / death crosses, overbought / oversold, etc.) — pure computation, no network — exported from `stock-sdk/signals`.
- **Screener + backtest**: `screen()` for local filtering plus `backtest()` for strategy backtesting, exported from `stock-sdk/screener`.
- **Unified cache layer**: low-level cache primitives are exported (`MemoryCache` / `getSharedCache` / `cacheThrough` via the `stock-sdk/cache` subpath); the SDK uses them internally for the trading calendar, code lists and board mappings with tiered TTLs. Note: caches are currently module-level (shared across instances); injecting a `CacheStore` at construction time with per-endpoint policies is not implemented yet and is on the 2.0.0 roadmap.

### Compatibility & baseline

- **Zero runtime dependencies** maintained (both CLI and MCP are dependency-free); browser + Node 18+ dual-target; ESM + CJS dual-format.
- Node baseline stays at `>=18` (`AbortSignal.any` has a runtime fallback).
- **Hard single-track switch**: v1 code must be migrated wholesale per the [migration guide](/en/guide/migration-v1-to-v2); there is no smooth transition path.

---

> The v1.x changelog history lives in the v1 docs site. This page records releases starting from v2.0.0.
