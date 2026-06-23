---
pageClass: changelog-page
---

# Changelog

This page records the release history of Stock SDK. v2.0.0 is an **architectural leap** — without adding data sources, it reworks the symbol model, data contract, API surface, request layer, and error system, and adds a CLI / MCP and subpath exports.

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
