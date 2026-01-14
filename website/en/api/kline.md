# History K-Line

Get historical K-line (candlestick) data.

## getHistoryKline

```typescript
const klines = await sdk.getHistoryKline('sz000858', {
  period: 'daily',
  startDate: '20240101',
  endDate: '20241231',
  adjust: 'hfq',
});
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| code | `string` | Yes | - | Stock code with exchange prefix |
| options.period | `'daily' | 'weekly' | 'monthly'` | No | `'daily'` | K-line period |
| options.startDate | `string` | No | - | Start date (YYYYMMDD) |
| options.endDate | `string` | No | - | End date (YYYYMMDD) |
| options.adjust | `'' | 'qfq' | 'hfq'` | No | `'hfq'` | Price adjustment |

### Adjustment Types

| Value | Description |
|-------|-------------|
| `''` | No adjustment (raw prices) |
| `'qfq'` | Forward adjustment |
| `'hfq'` | Backward adjustment (recommended) |

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
  adjust: 'hfq',
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
): Promise<HKUSHistoryKline[]>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | HK stock code, 5 digits (e.g. `'00700'`, `'09988'`) |

### Return Type

```typescript
interface HKUSHistoryKline {
  date: string;               // Date YYYY-MM-DD
  code: string;               // Stock code
  name: string;               // Stock name
  open: number | null;        // Open price
  close: number | null;       // Close price
  high: number | null;        // High price
  low: number | null;         // Low price
  volume: number | null;      // Trading volume
  amount: number | null;      // Trading amount
  changePercent: number | null;  // Change %
  change: number | null;         // Price change
  amplitude: number | null;      // Amplitude %
  turnoverRate: number | null;   // Turnover rate %
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
): Promise<HKUSHistoryKline[]>
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
