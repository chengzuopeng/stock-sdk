---
pageClass: changelog-page
---

# Changelog

This page records the release history of Stock SDK. The latest v2.0.0 is an **architectural leap** — without adding data sources, it reworks the symbol model, data contract, API surface, request layer, and error system, and adds a CLI / MCP and subpath exports.

## 2.0.0-beta.0

> 🧪 **First public beta** (`npm i stock-sdk@beta`): the v2.0.0 API surface is stable — try it and send feedback; minor adjustments are still possible before the final release. The items below are the breaking changes and new capabilities relative to v1.
>
> v2 is a **hard, single-track switch** — there is no `compat` entry point and no legacy type aliases. When migrating from v1, read it alongside the [v1 → v2 migration guide](/en/guide/migration-v1-to-v2).

### Breaking changes

- **Namespaced API**: all 105 methods move from the flat `sdk.getXxx()` to namespaces `sdk.<ns>.<method>()` (e.g. `sdk.getFullQuotes()` → `sdk.quotes.cn()`, `sdk.getETFOptionDailyKline()` → `sdk.options.etf.dailyKline()`). There are **no compatibility aliases**; see the [migration guide](/en/guide/migration-v1-to-v2) and the [API Overview](/en/api/) for the full mapping.
- **`Quote` discriminated union**: quote types are consolidated from separate interfaces (`FullQuote` / `HKQuote` / `USQuote` / `FundQuote` …) into a `Quote` union discriminated by `assetType`. Legacy type names (`FullQuote` / `HKUSHistoryKline`, etc.) are removed; callers narrow with `switch(q.assetType)`.
- **`raw` field removed**: the `raw: string[]` field on 8 return types (which leaked implementation details) is deleted. The escape hatch becomes a provider-level `getXxxRaw()` debug function and no longer pollutes data objects.
- **Unified units and conventions**: `volume` now targets **shares**; `amount` / `price` / market cap target the **major unit of each asset's quote currency** (CNY for A-shares, HKD for HK, USD for US, indicated by `currency`, with **no cross-currency conversion**); percentages are **percentage numbers** (e.g. `5.2` means 5.2%). **Numeric conventions change relative to v1, so backtest / display logic must be recalibrated.**
  > ⚠️ Unit conversions (lots→shares ×100, 万→yuan ×10000, etc.) must be calibrated per source against real data; for now values are emitted in each source's raw convention and landed after calibration — subject to the final implementation.
- **`timestamp`: `NaN` → `null`**: unparsable times change from `NaN` to `number | null`; null-checks move from `Number.isNaN(...)` to `=== null`. A `tz` (market time zone) field is also added to dated records.
- **All `@deprecated` removed**: 16 leftover `@deprecated` fields are dropped (e.g. the `tradeDate` alias, legacy `OptionLHBItem` fields, `ComexInventory.inventory`, `FullQuote.volume2`); the legacy `boolean` signatures `getAShareCodeList(boolean)` / `getUSCodeList(boolean)` are removed in favor of the options-object signature only.
- **Errors unified as `SdkError`**: the SDK now throws **only `SdkError`**, no longer leaking raw `TypeError` / `DOMException` / `RangeError`. Every error carries a unified `code`, with two new codes — `ABORTED` (external signal cancellation, distinct from `TIMEOUT`) and `UPSTREAM_ERROR` (upstream returned a structured error, distinct from the empty-data `UPSTREAM_EMPTY`). Importable from `stock-sdk/errors`.

### New capabilities

- **Unified symbol model**: `string` is first-class plus an optional `SymbolRef`; `normalizeSymbol` parses leniently (`sh600519` / `600519` / `600519.SH` / `00700` / `hk00700` / `AAPL` / `105.AAPL` / `rb2510` / `CFFEX.IF2412`, etc.). See [Symbols & code rules](/en/guide/symbols).
- **CLI**: `stock-sdk <command>` fetches quotes / K-line / search right in the terminal (`quote` / `kline` / `search` / `mcp` …), with a zero-dependency hand-written arg parser and JSON output by default.
- **MCP server**: `stock-sdk mcp` starts an MCP server in one command for AI tools like Cursor / Claude / Codex. A **zero-dependency, hand-written minimal MCP** (the `stdio + tools` subset) that does not pull in `@modelcontextprotocol/sdk`.
- **Subpath exports**: new sub-entries `stock-sdk/indicators`, `stock-sdk/signals`, `stock-sdk/symbols`, `stock-sdk/screener`, `stock-sdk/cache`, `stock-sdk/errors`. Users of pure computation only (indicators / symbols / signals) no longer drag `RequestClient` and all providers into their bundle.
- **Composable request layer**: `RequestClientOptions` / `GetOptions` gain `fetchImpl` (inject a custom fetch) and `signal` (external cancellation); client-level lifecycle `hooks` are added. See [Request governance](/en/guide/request-governance).
- **Signal layer**: `calcSignals` (event detection for golden / death crosses, overbought / oversold, etc.) — pure computation, no network — exported from `stock-sdk/signals`.
- **Screener + backtest**: chainable `sdk.screener()` for local filtering plus `backtest()` for strategy backtesting, exported from `stock-sdk/screener`.
- **Unified cache layer**: low-level cache primitives are exported (`MemoryCache` / `getSharedCache` / `cacheThrough` via the `stock-sdk/cache` subpath); the SDK uses them internally for the trading calendar, code lists and board mappings with tiered TTLs. Note: caches are currently module-level (shared across instances); injecting a `CacheStore` at construction time with per-endpoint policies is not implemented yet and is on the 2.0.0 roadmap.

### Compatibility & baseline

- **Zero runtime dependencies** maintained (both CLI and MCP are dependency-free); browser + Node 18+ dual-target; ESM + CJS dual-format.
- Node baseline stays at `>=18` (`AbortSignal.any` has a runtime fallback).
- **Hard single-track switch**: v1 code must be migrated wholesale per the [migration guide](/en/guide/migration-v1-to-v2); there is no smooth transition path.

---

> The v1.x changelog history lives in the v1 docs site. This page records releases starting from v2.0.0.
