# reference · Reference Data

The `sdk.reference` namespace collects "reference / foundational" data: A-share per-stock dividend details and the A-share trading calendar (raw array).

| Method | Description |
|---|---|
| `sdk.reference.dividendDetail(symbol)` | A-share per-stock dividend & bonus history |
| `sdk.reference.tradingCalendar()` | A-share trading calendar (raw date array) |

> `dividendDetail` focuses on "the full dividend/bonus record of a single stock"; for "whole-market fund dividends" use [`sdk.fund.dividendList()`](./fund.md).

## sdk.reference.dividendDetail

Get the dividend & bonus history of a given A-share stock, including bonus/transfer shares, cash dividends, financial metrics, and key dates.

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `symbol` | `string \| SymbolRef` | Yes | Stock symbol; `string` is first-class, e.g. `'600519'` / `'sh600519'` / `'600519.SH'`; a `SymbolRef` also works |

> Symbols are parsed leniently via `normalizeSymbol`, so prefix style doesn't matter. See [Symbols & Code Rules](../guide/symbols.md).

### Example

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Dividend history of Kweichow Moutai
const dividends = await sdk.reference.dividendDetail('600519');
console.log('records:', dividends.length);

const latest = dividends[0];
console.log('name:', latest.name);
console.log('report date:', latest.reportDate);
console.log('pretax dividend per 10 shares:', latest.dividendPretax, 'CNY');
console.log('description:', latest.dividendDesc);
console.log('ex-dividend date:', latest.exDividendDate);
console.log('progress:', latest.assignProgress);
```

### Returns

Returns `Promise<DividendDetail[]>`, sorted by report date descending (latest first):

```ts
interface DividendDetail {
  code: string;
  name: string;
  reportDate: string | null;       // report period YYYY-MM-DD
  planNoticeDate: string | null;   // plan announcement date
  disclosureDate: string | null;   // earnings disclosure date

  // bonus / transfer shares
  assignTransferRatio: number | null; // total bonus+transfer (X shares per 10)
  bonusRatio: number | null;          // bonus shares (X per 10)
  transferRatio: number | null;       // transferred shares (X per 10)

  // cash dividend
  dividendPretax: number | null;   // pretax dividend per 10 shares, in CNY
  dividendDesc: string | null;     // description, e.g. "10派2.36元(含税...)"
  dividendYield: number | null;    // dividend yield

  // financial metrics
  eps: number | null;              // earnings per share (CNY)
  bps: number | null;              // net assets per share (CNY)
  capitalReserve: number | null;   // capital reserve per share (CNY)
  unassignedProfit: number | null; // undistributed profit per share (CNY)
  netProfitYoy: number | null;     // net profit YoY growth (percent)
  totalShares: number | null;      // total shares

  // key dates
  equityRecordDate: string | null; // equity record date YYYY-MM-DD
  exDividendDate: string | null;   // ex-dividend date YYYY-MM-DD
  payDate: string | null;          // cash payment date YYYY-MM-DD

  // progress
  assignProgress: string | null;   // plan progress (e.g. "实施分配")
  noticeDate: string | null;       // latest announcement date YYYY-MM-DD
}
```

> Some fields may be `null` (missing or not applicable); newly listed or non-dividend-paying companies may return an empty array. Exact fields follow the implementation.

## sdk.reference.tradingCalendar

Get the raw A-share trading-day array (ascending).

This is the low-level calendar data; for most use cases prefer the high-level conveniences in [`sdk.calendar.*`](./calendar.md) (is-trading-day / jump-to-trading-day / market status).

### Parameters

None.

### Example

```ts
const days = await sdk.reference.tradingCalendar();

console.log('total trading days:', days.length);
console.log('earliest:', days[0], 'latest:', days[days.length - 1]);

// Check a date yourself
const isOpen = days.includes('2026-06-01');
```

### Returns

Returns `Promise<string[]>`, elements being `'YYYY-MM-DD'` strings sorted ascending. Backed by a cache (~12 hours); the first call fetches the full list.

## Notes

1. **Cache**: `tradingCalendar` is backed by a ~12-hour cache, which the trading-day methods in `sdk.calendar.*` reuse.
2. **Market scope**: both the trading calendar and `dividendDetail` target A-shares; Hong Kong / US are out of scope.
3. **Prefer high-level conveniences**: for "is trading day / next trading day / market status", prefer [`sdk.calendar`](./calendar.md) instead of handling the raw array yourself.
