# Futures & Options

Stock SDK already covers domestic futures, global futures, and several option workflows. This guide turns those APIs into task-oriented usage patterns.

## Futures

### Daily Domestic Futures Analysis

```ts
const rbMain = await sdk.getFuturesKline('RBM', {
  period: 'daily',
  startDate: '20250101',
});

const ifWeekly = await sdk.getFuturesKline('IF2604', {
  period: 'weekly',
  startDate: '20250101',
});
```

Common use cases:

- Trend tracking for main continuous contracts
- Backtesting or charting for a specific contract

### Global Futures Monitoring

```ts
const globalSpot = await sdk.getGlobalFuturesSpot();
const copper = await sdk.getGlobalFuturesKline('HG00Y', {
  period: 'daily',
  startDate: '20250101',
});
```

`getGlobalFuturesSpot` works well for intraday dashboards, while `getGlobalFuturesKline` is better for historical analysis and indicators.

## Options

### CFFEX Index Options

```ts
const ioTQuote = await sdk.getIndexOptionSpot('io', 'io2504');
const ioKline = await sdk.getIndexOptionKline('io2504C3600');
```

`getIndexOptionSpot` returns T-quotes, which are useful for strike distribution, volatility studies, and expiry screening.

### SSE ETF Options

```ts
const monthInfo = await sdk.getETFOptionMonths('50ETF');
const expireInfo = await sdk.getETFOptionExpireDay('50ETF', monthInfo.months[0]);
const minuteData = await sdk.getETFOptionMinute('10009633');
```

Recommended flow:

- Call `getETFOptionMonths` to fetch available expiries
- Call `getETFOptionExpireDay` to fetch the exact expiry date and remaining days
- Call `getETFOptionMinute` or `getETFOptionDailyKline` for intraday or daily prices

### Commodity Options

```ts
const auSpot = await sdk.getCommodityOptionSpot('au', 'au2506');
const mKline = await sdk.getCommodityOptionKline('m2409C3200');
```

## Workflow Examples

### 1. Domestic Futures Dashboard

- Use `getFuturesKline` for main continuous K-line
- Use `getFuturesInventorySymbols` and `getFuturesInventory` for inventory overlays
- Apply `calcMA`, `calcMACD`, and `calcATR` on top of futures data

### 2. ETF Option Expiry Screening

- Start with `getETFOptionMonths`
- Add `getETFOptionExpireDay`
- Filter strategies based on remaining days and minute-level prices

### 3. Index Option T-Quote Monitoring

- Fetch calls and puts with `getIndexOptionSpot`
- Aggregate strike-level volume, open interest, and spread data
- Fetch historical movement with `getIndexOptionKline` when needed

## Related APIs

- [Futures API](/en/api/futures)
- [Options API](/en/api/options)
- [Technical Indicators](/en/guide/indicators)
