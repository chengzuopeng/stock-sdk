# Changelog

This page records the version update history of Stock SDK.

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

