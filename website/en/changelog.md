---
pageClass: changelog-page
---

# Changelog

This page records the version update history of Stock SDK.

## **[1.10.1](https://www.npmjs.com/package/stock-sdk/v/1.10.1)** (2026-06-04)

> Bug-fix release. Fixes 10 issues from a full code review: indicator seeding (RSI / DMI-ADX), Beijing Stock Exchange code classification, intraday volume units, minute K-line date filtering, plus rate-limiter concurrency, a pagination infinite loop, and JSON parse-error classification.

### Bug Fixes

- **RSI / DMI-ADX seeding**: RSI dropped the `period`-th change from its first value; DMI's +DI/-DI and ADX seeds each had an off-by-one / out-of-range index, leaving ADX ≈ 14 on a steady trend (should be ≈ 100). All corrected to the Wilder definition.
- **Tencent Beijing-exchange filter** (`getAShareCodeList({ market: 'bj' })`): only matched `92`-prefixed codes, missing the 4 / 8 legacy BSE codes and returning almost nothing; now matches 4 / 8 and the new 920 segment.
- **Tencent intraday volume unit** (`getTodayTimeline`): the unit was inferred from only the first tick, so a 0-volume first tick left the whole day 100× off; now scans to the first usable tick.
- **Minute K-line date-only `endDate`** (A-share / HK / US): a `YYYY-MM-DD` end dropped the entire final day; it is now padded to `23:59`.
- **`getMarketCode` Beijing 920xxx**: the new 920-prefixed BSE segment was misread as Shanghai; now mapped to the Shenzhen / Beijing group.
- **Rate-limiter concurrency burst** (`RateLimiter.acquire`): concurrent callers woke together and drove tokens negative; now serialized via a promise chain (sequential timing unchanged).
- **EastMoney pagination infinite loop** (`fetchPaginatedData`): an over-reported `total` with an empty out-of-range page looped forever; added an empty-page break.
- **JSON parse-error classification**: a 200 with a non-JSON body was a retryable `NETWORK_ERROR`; now a non-retryable `PARSE_ERROR` (no same-host retry, fallback still allowed).
- **HK batch options**: `getAllHKShareQuotes` drops the meaningless `market` field (new `GetAllHKQuotesOptions`); passing it is now a compile error instead of a silent no-op.

### Compatibility

After the fixes, RSI / DMI(ADX) warm-up values change (now correct) — update old snapshots; `getMarketCode` returns `'0'` instead of `'1'` only for 920xxx (not a top-level export); passing `market` to the HK method is now a compile error. All other runtime behavior is unchanged.


## **[1.10.0](https://www.npmjs.com/package/stock-sdk/v/1.10.0)** (2026-05-27)

> Dual-theme release: (1) **Mutual fund extensions** — 4 deep-data methods covering [issue #16](https://github.com/chengzuopeng/stock-sdk/issues/16); (2) **HK / US minute K-line + intraday timeline** — 4 cells in the README matrix flip ❌ → ✅. Also fixes a 5xx ETF / 9xx B-share secid classification bug. **No breaking changes.**

### New Features

**Mutual fund extensions (`FundService`, top-level export)**
- `getFundDividendList` — Fund dividend events (year-paginated; client-side `code` filter; `page: 'all'` auto-aggregates)
- `getFundNavHistory` — Full NAV history (unit + accumulated, one call, open-end / ETF / LOF / money-market / QDII)
- `getFundEstimate` — Intraday NAV estimate (T-1 settled NAV + live estimate)
- `getFundRankHistory` — Similar-type rank history (daily 3-month rank + percentile)

**HK / US minute K-line + intraday timeline**
- `getHKMinuteKline(symbol, options?)` — 5/15/30/60-minute K-line, or intraday timeline (`period: '1'`)
- `getUSMinuteKline(symbol, options?)` — Same as above (US regular session only)
- New types `HKMinuteKline` / `HKMinuteTimeline` / `USMinuteKline` / `USMinuteTimeline` (structurally aligned with A-share `MinuteKline`, plus `currency` / `code`)
- Reuses the existing `push2his.eastmoney.com` (33 / 63 subdomains) stack — zero new data source dependencies

**Generic utilities** (top-level export)
- `fetchJsVars` / `parseJsVars` — Dual-environment parser for `var X = ...; var Y = ...;` style JS variable declarations (pingzhongdata / funddataIndex_Interface, etc.); browsers `<script>`-inject, Node uses fetch + bracket scan; optional `client` integrates with the SDK request stack
- `withScriptMutex` / `BROWSER_JSVARS_MUTEX_KEY` — Browser global-name mutex to prevent `<script>`-injection concurrent contamination
- `formatInTz(epoch, tz)` — UTC ms → `YYYY-MM-DD HH:mm` string in any time zone, the inverse of `parseMarketTime`, handles DST

### Bug Fixes

- **`getMarketCode` 5xx / 9xx classification**: codes starting with `5` (on-exchange ETF / LOF, e.g. 510050 / 518880 / 588000) and `9` (Shanghai B-shares) were misclassified to Shenzhen, so `getHistoryKline` etc. returned no data; now correctly mapped to Shanghai (secid=1)
- **US minute K / timeline time zone**: EastMoney trends2 / kline return `time` strings in **Beijing time**; early implementation parsed with `MARKET_TZ.US` directly, leaving `timestamp` off by 12–13 hours. Fixed: parse as `Asia/Shanghai` for the correct epoch, then `formatInTz` to NYC
- **HK/US `period='1'` default `ndays` changed from 5 to 1**: aligns with the README "today's timeline" promise; multi-day windows now go through `options.ndays`

### Browser concurrency & request governance

Fund endpoints load via `<script>` injection (fund.eastmoney.com / fundgz.1234567.com.cn have no CORS). pingzhongdata shares `fS_code` / `fS_name`; fundgz shares the fixed `jsonpgz` callback — both prone to concurrent contamination, guarded by `withScriptMutex` global serialization. Node.js real concurrency is unaffected.

The 4 `FundService` methods integrate with `RequestClient` on Node — `providerPolicies.eastmoney` etc. all apply (`fundgz.1234567.com.cn` is explicitly classified as `eastmoney`). HK / US minute K-line endpoints have fully open CORS and reuse the push2his fallback pool.

### Docs & examples

- README matrix: "Mutual Fund" column +4 capability rows; HK / US "Minute K-line" & "Today's timeline" 4 cells ❌ → ✅
- New [`/api/fund-extended`](/en/api/fund-extended); `/api/minute-kline` adds HK / US sections (with `ndays` parameter + US time zone warning)
- Playground: new "Fund Extended" category (4 demos) + HK / US minute K-line demos under "K-Line"

### Compatibility

No breaking changes. Only `getMarketCode` returns `'1'` instead of `'0'` for unprefixed codes starting with 5/9 (silent bug fix); this function is not a top-level export and is internal-only — regular users are unaffected.


## **[1.9.3](https://www.npmjs.com/package/stock-sdk/v/1.9.3)** (2026-05-22)

> Bug fix release. Resolves 7 issues discovered after v1.9.0 / v1.9.2. **No breaking changes.**

### Bug Fixes

**Tencent "phantom quote" for invalid codes**
- All Tencent quote endpoints previously filtered only on `fields[0] !== ''`. For unmatched codes,
  Tencent returns `v_pv_none_match="1"` (`fields = ['1']`) which passed the filter and was parsed
  into a placeholder result with `code: ''`, `price: 0`.
- Fixed across 7 entry points: `getFullQuotes` / `getSimpleQuotes` / `getHKQuotes` / `getUSQuotes` /
  `getFundQuotes` / `getFundFlow` / `getPanelLargeOrder`.
- New behavior: filter by exact response `key` membership against the requested code set, plus a
  field-length threshold tuned to each parser's highest accessed index.

**Timestamp parsing**
- `getTodayTimeline` per-tick `timestamp: NaN` — Tencent returns `date=YYYYMMDD`, but the
  internal `combineDateAndTime` only accepted `YYYY-MM-DD`. Fixed `core/time.ts` to accept both.
- `getKlineWithIndicators` returning 0 bars on HK / US when start/end dates were in `YYYY-MM-DD`
  format — `calcActualStartDate` sliced unmodified input (producing garbage dates) and `endDate`
  was passed through unchanged. Both sites now normalize to `YYYYMMDD` before reaching the
  provider.

**Request governance consistency**
- `getTodayTimeline` previously used raw `fetch`, bypassing retry / rateLimit / circuitBreaker /
  providerPolicies / host fallback. Now routed through `RequestClient.get` so its governance
  matches every other endpoint in the same SDK instance.

**Misleading JSDoc**
- `getHKQuotes` / `getUSQuotes` examples showed already-prefixed codes
  (`'hk00700'` / `'usAAPL'`), which the provider then re-prefixed, breaking the query.
  Examples now use the correct un-prefixed form (`'00700'` / `'AAPL'`).

### Restored exports (fulfilling earlier changelog promises)

`src/index.ts` now actually re-exports the symbols previously listed in the changelog:
- **Time helpers**: `MARKET_TZ` / `MarketTz` / `TimeMeta` / `parseMarketTime` /
  `buildTimeMeta` / `buildTimeMetaFromDateAndTime`
- **Service & types**: `TradingCalendarService` / `MarketStatus` / `SupportedMarket`
- **US-market types**: `USMarket` / `GetUSCodeListOptions` / `GetAllUSQuotesOptions`

TypeScript users can now import these directly from `stock-sdk`.

### Internal

- `providers/tencent/timeline.ts` no longer uses `any`. Three local interfaces
  (`TencentTimelineResponse` / `TencentStockTimeline` / `TencentStockTimelineInner`)
  describe the Tencent response shape, in line with the project's no-`any` policy.

### Compatibility

- No breaking changes.
- The only behavioral difference: invalid codes no longer return placeholder quotes.
  If your code relied on receiving a `code: ''`, `price: 0` row, you'll now get an empty array
  and need to handle that explicitly.


## **[1.9.2](https://www.npmjs.com/package/stock-sdk/v/1.9.2)** (2026-05-16)

> Data-contract cleanup + business helper additions. **All changes are non-breaking**;
> existing code can upgrade without migration.

### New Features

**Unified time metadata (`timestamp` + `tz`)**
- All time-bearing return types gain new `timestamp: number` (UTC unix ms) and
  `tz: MarketTz` (IANA timezone name) fields.
- Affected types: `FullQuote` / `HKQuote` / `USQuote` / `FundQuote` / `FundFlow` /
  `HistoryKline` / `MinuteTimeline` / `MinuteKline` / `TodayTimeline` / `TodayTimelineResponse` /
  `HKHistoryKline` / `USHistoryKline`.
- US daylight-saving transitions (EST UTC-5 ↔ EDT UTC-4) are handled automatically,
  no `dayjs` / `moment` dependency.
- The original `time` / `date` string fields are kept untouched.
- New exports: `MARKET_TZ`, `MarketTz`, `TimeMeta`, `parseMarketTime`, `buildTimeMeta`,
  `buildTimeMetaFromDateAndTime` (under `src/core/time`).

**HK / US K-line type split**
- New `HKHistoryKline`: includes `currency: 'HKD'`, `lotSize: number | null`, `tz: 'Asia/Hong_Kong'`.
- New `USHistoryKline`: includes `currency: 'USD'`, `tz: 'America/New_York'`.
- `getHKHistoryKline` now returns `Promise<HKHistoryKline[]>`,
  `getUSHistoryKline` returns `Promise<USHistoryKline[]>`.
- The legacy `HKUSHistoryKline` is now a `HKHistoryKline | USHistoryKline` union alias and
  marked `@deprecated`. Existing code keeps working without immediate migration.

**A-share trading calendar helpers**
- `isTradingDay(date?)`: check whether a date is an A-share trading day,
  reusing the existing 12-hour calendar cache.
- `nextTradingDay(date?)` / `prevTradingDay(date?)`: jump to the next / previous trading day.
- `getMarketStatus(market='A')`: synchronous current market status —
  `'pre_market' | 'open' | 'lunch_break' | 'after_hours' | 'closed'` —
  for A-share / HK / US (US handles DST automatically). HK and US have no official
  calendar data source, so the helper falls back to "Mon–Fri + known trading sessions"
  and does **not** detect public holidays.
- Inputs accept `'YYYY-MM-DD'` / `'YYYYMMDD'` / `Date`; omit to use today in `Asia/Shanghai`.
- New exports: `TradingCalendarService`, `MarketStatus`, `SupportedMarket`.

### Documentation

- New [Dividend Adjustment](/en/guide/dividend-adjustment) guide spelling out that
  every K-line method's `adjust` parameter defaults to `'qfq'`, with concrete scenarios
  and pitfalls for forward / backward / no adjustment.
- `getHistoryKline` / `getMinuteKline` / `getHKHistoryKline` / `getUSHistoryKline` JSDoc
  explicitly notes the `adjust` default and back-test caveats.
- README now includes a market coverage matrix making each market's support level
  explicit, plus notes on real-time data delay and the v1.9.2 type split.

### Compatibility

- **Fully backward compatible**: all changes are additive (new fields / new methods);
  no existing field names or return shapes change.
  - `HKUSHistoryKline` remains exported; legacy `Promise<HKUSHistoryKline[]>` annotations still type-check.
  - Code that does not consume the new `timestamp` / `tz` fields is unaffected.


## **[1.9.1](https://www.npmjs.com/package/stock-sdk/v/1.9.1)** (2026-05-15)

### New Features

**External Site Links**
- `generateSearchExternalLinks(result)` — Pure utility that converts a `SearchResult` from the `search` API into East Money and Xueqiu links; covers A-share (including indices), HK (auto zero-padded to 5 digits), US, and global indices, with site search pages used as a fallback for unrecognized markets
- Added `ExternalLink` type (`{ name, url }`) and exported it from the main module

### Improvements

- Documented `generateSearchExternalLinks` usage in both the Chinese and English README and in the docs site's Search section
- Added comprehensive unit tests for the new utility, covering A-share / A-share indices / HK with zero-padding / US / Tencent numeric market codes / global indices / fallback search scenarios

### Compatibility

- Pure string-generation function; does not mutate `search` results or issue any network request
- No breaking changes; usage from 1.9.0 remains compatible

## **[1.9.0](https://www.npmjs.com/package/stock-sdk/v/1.9.0)** (2026-05-02)

### New Features

**Fund Flow (Deep)**
- `getIndividualFundFlow` — Per-stock fund flow history (daily/weekly/monthly)
- `getMarketFundFlow` — Market fund flow (SH + SZ indices)
- `getFundFlowRank` — Stock fund flow ranking (today / 3-day / 5-day / 10-day)
- `getSectorFundFlowRank` — Sector fund flow ranking (industry / concept / region)
- `getSectorFundFlowHistory` — Single sector's historical fund flow

**Northbound / Stock Connect**
- `getNorthboundMinute` — Northbound / Southbound minute data
- `getNorthboundFlowSummary` — Stock Connect market flow summary
- `getNorthboundHoldingRank` — Northbound / SH-Connect / SZ-Connect holding rank
- `getNorthboundHistory` — Northbound / Southbound capital history
- `getNorthboundIndividual` — Per-stock northbound holding history

**Limit-Up Pool / Stock Changes**
- `getZTPool` — 6 pools: limit-up / yesterday / strong / sub-new / broken / limit-down
- `getStockChanges` — 22 change types (rocket launch, large buy, limit-up seal, etc.)
- `getBoardChanges` — Daily board change details

**Dragon-Tiger List**
- `getDragonTigerDetail` — Dragon-tiger detail (by date range)
- `getDragonTigerStockStats` — Stock listing statistics (1m / 3m / 6m / 1y)
- `getDragonTigerInstitution` — Institution buy/sell statistics
- `getDragonTigerBranchRank` — Brokerage branch ranking
- `getDragonTigerStockSeatDetail` — Per-stock seat detail (buy + sell sides)

**Block Trade / Margin Trading**
- `getBlockTradeMarketStat` / `getBlockTradeDetail` / `getBlockTradeDailyStat` — Block trade market summary, detail, per-stock aggregates
- `getMarginAccountInfo` / `getMarginTargetList` — Margin trading account statistics and target securities

### Improvements

- Extracted shared datacenter helpers `fetchDatacenter` / `fetchDatacenterList` that unify pagination, param building, and response parsing; `dividend.ts` and `futuresInventory.ts` now reuse them
- Playground gained 23 interactive demos covering every new method


## **[1.8.3](https://www.npmjs.com/package/stock-sdk/v/1.8.3)** (2026-04-25)

> This release does not add business APIs. It focuses on system architecture, request stability, type compatibility, and documentation tooling while keeping existing usage compatible.

### Improvements

**Architecture and Request Governance**
- Split the `StockSDK` facade into quote, K-line, board, futures, options, and indicator services while preserving the public method surface
- Split public types into domain files under `src/types/`; the legacy `src/types.ts` barrel remains available for compatibility
- Added Eastmoney host fallback and counted retry / fallback requests against the `rateLimit` budget

**Type Compatibility**
- Made `TodayTimelineResponse.preClose` optional to avoid type breaks in existing mocks or manually constructed objects
- Preserved the raw Tencent search `SearchResult.type` string and added `category` as the normalized asset classification, keeping checks such as `type === 'GP-A'` working
- Kept legacy fields on `OptionLHBItem` and `ComexInventory`, with clearer replacement-field semantics

**Documentation and Tooling**
- Added documentation metadata generation, documentation consistency checks, and a CI workflow
- Updated Search, Options, Timeline, Retry, and Request Governance documentation, and fixed the GitHub Pages deployment workflow

### Compatibility

- This release contains no breaking changes
- Existing `StockSDK` initialization, SDK method names, option shapes, and main return structures remain compatible


## **[1.8.1](https://www.npmjs.com/package/stock-sdk/v/1.8.1)** (2026-04-22)

### Improvements

**Request Governance**
- Added optional `providerPolicies` to `RequestClient`, allowing provider-level overrides for timeout, retry, rate limiting, circuit breaker, headers, and UA strategy across `tencent`, `eastmoney`, `sina`, and other built-in providers
- Preserved the existing global `timeout`, `retry`, `rateLimit`, and `circuitBreaker` behavior, so legacy initialization code continues to work unchanged
- Isolated circuit breaker and rate limiter runtime state by provider, preventing failures from one data source from affecting another

**Technical Indicators**
- Completed one-stop support for `OBV`, `ROC`, `DMI`, `SAR`, and `KC` in `getKlineWithIndicators` and `addIndicators`
- Synchronized `IndicatorOptions` and lookback estimation logic for the newly exported indicators

**Batch Query**
- Whole-market batch APIs now preserve input order internally, so returned quote arrays stay aligned with the requested symbol order
- The public `asyncPool` export remains backward compatible to avoid breaking existing external utility usage

**Provider Refactor**
- Introduced Eastmoney history-K-line and board provider factories to reduce duplicated logic across HK/US K-line and industry/concept board modules
- Public API names, parameters, and return types remain unchanged


## **[1.8.0](https://www.npmjs.com/package/stock-sdk/v/1.8.0)** (2026-03-13)

### New Features

**Options Data**
- Added CFFEX index option T-quote API `getIndexOptionSpot`, supporting SSE 50 (ho), CSI 300 (io), CSI 1000 (mo)
- Added index option contract daily K-line API `getIndexOptionKline`
- Added all CFFEX option real-time quotes API `getCFFEXOptionQuotes` (Eastmoney data source)
- Added SSE ETF option expiration month list API `getETFOptionMonths`, supporting 50ETF, 300ETF, 500ETF, STAR 50
- Added ETF option expiration date & remaining days API `getETFOptionExpireDay`
- Added ETF option intraday minute data API `getETFOptionMinute`
- Added ETF option historical daily K-line API `getETFOptionDailyKline`
- Added ETF option 5-day minute data API `getETFOption5DayMinute`
- Added commodity option T-quote API `getCommodityOptionSpot`, covering 30 varieties (gold, silver, copper, soybean meal, sugar, etc.)
- Added commodity option contract daily K-line API `getCommodityOptionKline`
- Added option leaderboard API `getOptionLHB`

## **[1.7.0](https://www.npmjs.com/package/stock-sdk/v/1.7.0)** (2026-02-28)

### New Features

**Futures Data**
- Added domestic futures history K-line API `getFuturesKline`, supporting all domestic futures exchanges (SHFE, DCE, CZCE, INE, CFFEX, GFEX), main continuous contracts (e.g. `RBM`) and specific contracts (e.g. `rb2510`), with daily/weekly/monthly periods
- Added global futures real-time quotes API `getGlobalFuturesSpot`, covering major international exchanges including COMEX, NYMEX, CBOT, LME, etc., with 600+ instruments
- Added global futures history K-line API `getGlobalFuturesKline`, supporting daily/weekly/monthly periods
- Added futures inventory symbol list API `getFuturesInventorySymbols`
- Added futures inventory data API `getFuturesInventory` for querying historical inventory data of domestic futures varieties
- Added COMEX gold/silver inventory API `getComexInventory`

### Improvements

**Playground**
- Added futures data API demonstrations

## **[1.6.2](https://www.npmjs.com/package/stock-sdk/v/1.6.2)** (2026-01-25)

### New Features

**Fund Data**
- Added `getFundCodeList` method: Get all fund codes (26000+ funds)

## **[1.6.1](https://www.npmjs.com/package/stock-sdk/v/1.6.1)** (2026-01-25)

### New Features

**Rate Limiting & Protection**
- Added request rate limiter (`rateLimit`): Token bucket algorithm with configurable requests per second and burst capacity
- Added User-Agent rotation (`rotateUserAgent`): Node.js only, reduces risk of being identified as the same client
- Added circuit breaker (`circuitBreaker`): Automatically pauses requests on consecutive failures to prevent cascade failures (disabled by default, requires explicit configuration)

**Infrastructure**
- Added general-purpose memory cache module with TTL expiration and LRU eviction

## **[1.6.0](https://www.npmjs.com/package/stock-sdk/v/1.6.0)** (2026-01-24)

### New Features

**Dividend Data**
- Added A-share dividend details API `getDividendDetail`, supporting historical dividend records covering 20+ dimensions including cash dividends, share transfers, financial indicators (EPS, BPS, net profit YoY, etc.), key dates, and distribution progress

## **[1.5.0](https://www.npmjs.com/package/stock-sdk/v/1.5.0)** (2026-01-18)

### New Features

**Technical Indicators**
- Added 5 new technical indicators: **OBV** (On Balance Volume), **ROC** (Rate of Change), **DMI/ADX** (Directional Movement Index), **SAR** (Parabolic SAR), **KC** (Keltner Channel)
- Improved documentation and Playground demos for indicator functions

**Batch Query Enhancements**
- `getAShareCodeList`, `getUSCodeList` parameters upgraded to options object for flexible filtering:
  - `simple`: Remove exchange/market prefix
  - `market`: Filter by market
- `getAllAShareQuotes`, `getAllUSShareQuotes` now support `market` parameter for filtering quotes

## **[1.4.5](https://www.npmjs.com/package/stock-sdk/v/1.4.5)** (2026-01-15)

### Changes

**Default Adjustment Type Changed**
- Default price adjustment for all K-line APIs changed from **backward adjustment (`hfq`)** to **forward adjustment (`qfq`)**
- Affected APIs: `getHistoryKline`, `getHKHistoryKline`, `getUSHistoryKline`, `getMinuteKline`, `getKlineWithIndicators`


## **[1.4.4](https://www.npmjs.com/package/stock-sdk/v/1.4.4)** (2026-01-14)

### Improvements
- Code optimizations to reduce bundle size

## **[1.4.3](https://www.npmjs.com/package/stock-sdk/v/1.4.3)** (2026-01-08)

### Improvements

**Request Method Optimization**
- Support configuration of error retry policies, including retry count, retry interval, etc.
- Optimized error handling to provide more detailed error information.
- Support custom headers and userAgent.

**Unit Test Structure Optimization**
- Separation of integration/unit tests.
- Added MSW mock layer to intercept real requests for unit testing.

**Cache Optimization**
- In-memory caching for code lists/trading calendars: Reduces duplicate requests.

## **[1.4.2](https://www.npmjs.com/package/stock-sdk/v/1.4.2)** (2026-01-07)

### New Features

**Search Functionality**
- Added stock search API `search`, supporting search by code, name, and pinyin for A-shares, HK stocks, and US stocks

## **[1.4.1](https://www.npmjs.com/package/stock-sdk/v/1.4.1)** (2025-12-29)

### New Features

**Extended Data**
- Added A-share trading calendar API `getTradingCalendar`

## **[1.4.0](https://www.npmjs.com/package/stock-sdk/v/1.4.0)** (2025-12-26)

### New Features

**Board Data**
- Added industry board APIs: `getIndustryList`, `getIndustrySpot`, `getIndustryConstituents`, `getIndustryKline`, `getIndustryMinuteKline`
- Added concept board APIs: `getConceptList`, `getConceptSpot`, `getConceptConstituents`, `getConceptKline`, `getConceptMinuteKline`

### Improvements

**Playground**
- Added board data API demonstrations
- Playground now supports local development mode, allowing direct reference to local source code for debugging

## **[1.3.1](https://www.npmjs.com/package/stock-sdk/v/1.3.1)** (2025-12-24)

### Improvements

**Documentation Improvements**
- Official website launched: [https://stock-sdk.linkdiary.cn/](https://stock-sdk.linkdiary.cn/)
- Improved API documentation introduction
- One bigfix

## **[1.3.0](https://www.npmjs.com/package/stock-sdk/v/1.3.0)** (2025-12-23)

### New Features

**K-Line Data**
- Added HK and US stock history K-line APIs `getHKHistoryKline`, `getUSHistoryKline` (daily/weekly/monthly)
- Added APIs to get all US and HK stock real-time quotes `getAllUSShareQuotes`, `getAllHKShareQuotes` (with concurrency control and progress callback)

**Technical Indicators**
- Added one-stop indicator API `getKlineWithIndicators` (auto-fetch K-line and calculate indicators)
- Added MA calculation functions `calcMA` (supports SMA/EMA/WMA), `calcSMA`, `calcEMA`, `calcWMA`
- Added indicator calculation functions `calcMACD`, `calcBOLL`, `calcKDJ`, `calcRSI`, `calcWR`, etc.

### Improvements

- Added i18n support for Chinese and English documentation

## **[1.2.0](https://www.npmjs.com/package/stock-sdk/v/1.2.0)** (2025-12-18)

### New Features

**K-Line Data**
- Added A-Share history K-line API `getHistoryKline` (daily/weekly/monthly, data source: East Money)
- Added minute K-line API `getMinuteKline` (1/5/15/30/60 minutes)
- Added today's timeline API `getTodayTimeline`

### Improvements

- Completely restructured API documentation with clearer table format

## **[1.1.0](https://www.npmjs.com/package/stock-sdk/v/1.1.0)** (2025-12-12)

### Features

**Real-time Quotes**
- A-Share/Index full quotes `getFullQuotes`
- A-Share/Index simple quotes `getSimpleQuotes`
- HK stock quotes `getHKQuotes`
- US stock quotes `getUSQuotes`
- Mutual fund quotes `getFundQuotes`

**Extended Data**
- Fund flow `getFundFlow`
- Large order ratio `getPanelLargeOrder`

**Batch Query**
- All A-Share code list `codeList`
- Get all A-Share real-time quotes `getAllAShareQuotes` (with concurrency control and progress callback)
- Batch get quotes by codes `getAllQuotesByCodes`
- Batch mixed query `batchRaw`

**Features**
- Zero dependencies, lightweight
- Supports both browser and Node.js 18+
- Provides both ESM and CommonJS module formats
- Complete TypeScript type definitions

---

::: tip Version Specification
Stock SDK follows [Semantic Versioning](https://semver.org/).
- **Major**: incompatible API changes
- **Minor**: backward-compatible new features
- **Patch**: backward-compatible bug fixes
:::

<script setup>
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  document.body.classList.add('changelog-page')
})

onUnmounted(() => {
  document.body.classList.remove('changelog-page')
})
</script>

<style>
/* Changelog page specific styles */

/* Add background: subtle gray background and weak decorative gradient */
body.changelog-page {
  --vp-layout-max-width: 1400px;
  background-color: var(--vp-c-bg-alt) !important;
  background-image: radial-gradient(circle at 50% -20%, var(--vp-c-brand-soft) 0%, transparent 40%) !important;
  background-attachment: fixed !important;
}

/* Make content card have white background and slight rounding for contrast */
body.changelog-page .VPDoc .content {
  padding: 2rem 3rem !important;
  background: var(--vp-c-bg) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
  margin-top: 2rem !important;
  margin-bottom: 3rem !important;
}

/* Dark mode adaptation */
.dark body.changelog-page .VPDoc .content {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
}

body.changelog-page .VPDoc {
  padding: 0 32px !important;
}

body.changelog-page .VPDoc > .container {
  max-width: 100% !important;
}

body.changelog-page .VPDoc > .container > .content {
  max-width: 1100px !important;
}

body.changelog-page .vp-doc {
  max-width: 100% !important;
}

/* Header styles minor adjustment */
body.changelog-page .vp-doc h1 {
  margin-top: 0 !important;
  margin-bottom: 1.5rem !important;
  text-align: center;
}

body.changelog-page .vp-doc h2 {
  margin-top: 2.5rem !important;
  margin-bottom: 1rem !important;
  padding-bottom: 0.5rem !important;
  border-bottom: 1px solid var(--vp-c-divider) !important;
  display: flex !important;
  align-items: center !important;
  border-top: 0 !important;
}

/* Add a small dot decoration for version numbers */
body.changelog-page .vp-doc h2::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: var(--vp-c-brand);
  border-radius: 50%;
  margin-right: 12px;
}

body.changelog-page .vp-doc h3 {
  margin-top: 1.5rem !important;
  margin-bottom: 0.75rem !important;
  color: var(--vp-c-brand) !important;
}

body.changelog-page .vp-doc p {
  margin-top: 0.5rem !important;
  margin-bottom: 0.5rem !important;
}

body.changelog-page .vp-doc ul,
body.changelog-page .vp-doc ol {
  margin-top: 0.5rem !important;
  margin-bottom: 0.5rem !important;
}

body.changelog-page .vp-doc li {
  margin-top: 0.25rem !important;
  margin-bottom: 0.25rem !important;
}

body.changelog-page .vp-doc hr {
  margin-top: 2rem !important;
  margin-bottom: 2rem !important;
  border: 0 !important;
  border-top: 2px dashed var(--vp-c-divider) !important;
}

body.changelog-page .vp-doc .custom-block {
  margin-top: 1.5rem !important;
  margin-bottom: 1.5rem !important;
}

body.changelog-page .vp-doc h2 a {
  margin-right: 8px;
}
</style>
