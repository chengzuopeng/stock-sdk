# Changelog

This page records the version update history of Stock SDK.

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
</style>

