# History K-Line

Get historical K-line (candlestick) data.

::: warning Default adjustment
All K-line methods on this page (`getHistoryKline` / `getHKHistoryKline` /
`getUSHistoryKline` / `getMinuteKline`) **default `adjust` to `'qfq'`
(forward-adjusted)**.

Without an explicit `adjust`, the returned prices have already been
forward-adjusted; for back-tests or dividend-reinvested return calculations
pass `'hfq'` or `''` explicitly.
See [Dividend Adjustment](/en/guide/dividend-adjustment) for details.
:::

## getHistoryKline

```typescript
const klines = await sdk.getHistoryKline('sz000858', {
  period: 'daily',
  startDate: '20240101',
  endDate: '20241231',
  adjust: 'qfq',
});
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| code | `string` | Yes | - | Stock code with exchange prefix |
| options.period | `'daily' | 'weekly' | 'monthly'` | No | `'daily'` | K-line period |
| options.startDate | `string` | No | - | Start date (YYYYMMDD) |
| options.endDate | `string` | No | - | End date (YYYYMMDD) |
| options.adjust | `'' | 'qfq' | 'hfq'` | No | `'qfq'` | Price adjustment |

### Adjustment Types

| Value | Description |
|-------|-------------|
| `''` | No adjustment (raw prices) |
| `'qfq'` | Forward adjustment (recommended) |
| `'hfq'` | Backward adjustment |

### Return Type

```typescript
interface KlineData {
  date: string;    // Date (YYYY-MM-DD)
  open: number;    // Open price
  close: number;   // Close price
  high: number;    // High price
  low: number;     // Low price
  volume: number;  // Trading volume
  amount: number;  // Trading amount
  amplitude: number;      // Amplitude (%)
  changePercent: number;  // Change percentage
  change: number;         // Price change
  turnoverRate: number;   // Turnover rate (%)
}
```

## Example

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Daily K-line with backward adjustment
const daily = await sdk.getHistoryKline('sz000858', {
  period: 'daily',
  startDate: '20240101',
  endDate: '20241231',
  adjust: 'qfq',
});

daily.forEach(k => {
  console.log(`${k.date}: O ${k.open} H ${k.high} L ${k.low} C ${k.close}`);
});

// Weekly K-line
const weekly = await sdk.getHistoryKline('sz000858', {
  period: 'weekly',
  startDate: '20240101',
});

// Monthly K-line without adjustment
const monthly = await sdk.getHistoryKline('sz000858', {
  period: 'monthly',
  adjust: '',
});
```

---

## getHKHistoryKline

Get HK stock history K-line (daily/weekly/monthly), data source: East Money.

### Signature

```typescript
getHKHistoryKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<HKHistoryKline[]>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | HK stock code, 5 digits (e.g. `'00700'`, `'09988'`) |

### Return Type

> **Since v1.9.1**: the return type is split from the legacy `HKUSHistoryKline`
> into a more precise `HKHistoryKline`, carrying `currency: 'HKD'` and
> timezone / timestamp metadata. The legacy `HKUSHistoryKline` alias remains
> usable (now `HKHistoryKline | USHistoryKline`); existing code does not need
> to migrate immediately.

```typescript
interface HKHistoryKline {
  date: string;               // Date YYYY-MM-DD (HK time)
  timestamp: number;          // UTC milliseconds (NaN if unparseable)
  tz: 'Asia/Hong_Kong';       // Timezone
  currency: 'HKD';            // Pricing currency
  lotSize: number | null;     // HK board lot size; not provided by the K-line endpoint, fixed null
  code: string;               // Stock code
  name: string;               // Stock name
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  changePercent: number | null;
  change: number | null;
  amplitude: number | null;
  turnoverRate: number | null;
}
```

### Example

```typescript
// Get Tencent Daily K-line
const klines = await sdk.getHKHistoryKline('00700');

// Get Alibaba Weekly K-line, forward adjusted
const weeklyKlines = await sdk.getHKHistoryKline('09988', {
  period: 'weekly',
  adjust: 'qfq',
  startDate: '20240101',
  endDate: '20241231',
});

console.log(klines[0].name);   // Tencent
console.log(klines[0].close);  // Close price
```

---

## getUSHistoryKline

Get US stock history K-line (daily/weekly/monthly), data source: East Money.

### Signature

```typescript
getUSHistoryKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<USHistoryKline[]>
```

### Return Type

```typescript
interface USHistoryKline {
  date: string;               // Date YYYY-MM-DD (US Eastern time)
  timestamp: number;          // UTC milliseconds (DST handled automatically)
  tz: 'America/New_York';     // Timezone
  currency: 'USD';            // Pricing currency
  code: string;               // Stock code
  name: string;               // Stock name
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  changePercent: number | null;
  change: number | null;
  amplitude: number | null;
  turnoverRate: number | null;
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | US stock code, format: `{market}.{ticker}` (e.g. `'105.MSFT'`, `'106.BABA'`) |

### Market Codes

| Code | Description | Example |
|------|-------------|---------|
| `105` | NASDAQ | `105.AAPL`, `105.MSFT`, `105.TSLA` |
| `106` | NYSE | `106.BABA` |
| `107` | AMEX/Others | `107.XXX` |

### Example

```typescript
// Get Microsoft Daily K-line
const klines = await sdk.getUSHistoryKline('105.MSFT');

// Get Apple Weekly K-line, forward adjusted
const weeklyKlines = await sdk.getUSHistoryKline('105.AAPL', {
  period: 'weekly',
  adjust: 'qfq',
  startDate: '20240101',
  endDate: '20241231',
});

console.log(klines[0].name);   // Microsoft
console.log(klines[0].close);  // Close price

// Get Alibaba Monthly K-line
const monthlyKlines = await sdk.getUSHistoryKline('106.BABA', {
  period: 'monthly',
});
```
