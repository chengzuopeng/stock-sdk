# Industry Sectors

Get East Money industry sector data, including sector list, real-time quotes, constituents, and K-line data.

## getIndustryBoardList

Get all industry sector names, codes, and real-time quote overview.

### Signature

```typescript
getIndustryBoardList(): Promise<IndustryBoard[]>
```

### Return Type

```typescript
interface IndustryBoard {
  rank: number;                        // Rank (by change percent)
  name: string;                        // Sector name
  code: string;                        // Sector code (e.g., BK0447)
  price: number | null;                // Latest price
  change: number | null;               // Price change
  changePercent: number | null;        // Change percent %
  totalMarketCap: number | null;       // Total market cap
  turnoverRate: number | null;         // Turnover rate %
  riseCount: number | null;            // Number of rising stocks
  fallCount: number | null;            // Number of falling stocks
  leadingStock: string | null;         // Leading stock name
  leadingStockChangePercent: number | null;  // Leading stock change %
}
```

### Example

```typescript
// Get all industry sectors
const boards = await sdk.getIndustryBoardList();

// Print top 5 sectors by change percent
boards.slice(0, 5).forEach(b => {
  console.log(`${b.name}: ${b.changePercent}% (Leader: ${b.leadingStock})`);
});
```

---

## getIndustryBoardSpot

Get real-time quote data for a specific industry sector.

### Signature

```typescript
getIndustryBoardSpot(symbol: string): Promise<IndustryBoardSpot[]>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Industry sector name (e.g., `'互联网服务'`) or code (e.g., `'BK0447'`) |

### Return Type

```typescript
interface IndustryBoardSpot {
  item: string;         // Indicator name
  value: number | null; // Indicator value
}
```

Returns indicators including: Latest, High, Low, Open, Volume, Amount, Change%, Amplitude, Turnover Rate, Change.

### Example

```typescript
// Query by sector name
const spot = await sdk.getIndustryBoardSpot('互联网服务');

// Query by sector code
const spot2 = await sdk.getIndustryBoardSpot('BK0447');

spot.forEach(s => {
  console.log(`${s.item}: ${s.value}`);
});
```

---

## getIndustryBoardConstituents

Get the constituent stocks of a specific industry sector with their real-time quotes.

### Signature

```typescript
getIndustryBoardConstituents(symbol: string): Promise<IndustryBoardConstituent[]>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Industry sector name or code |

### Return Type

```typescript
interface IndustryBoardConstituent {
  rank: number;              // Rank
  code: string;              // Stock code
  name: string;              // Stock name
  price: number | null;      // Latest price
  changePercent: number | null;  // Change percent %
  change: number | null;     // Price change
  volume: number | null;     // Volume
  amount: number | null;     // Amount
  amplitude: number | null;  // Amplitude %
  high: number | null;       // High
  low: number | null;        // Low
  open: number | null;       // Open
  prevClose: number | null;  // Previous close
  turnoverRate: number | null;   // Turnover rate %
  pe: number | null;         // Dynamic P/E ratio
  pb: number | null;         // P/B ratio
}
```

### Example

```typescript
// Get constituents of Internet Services sector
const stocks = await sdk.getIndustryBoardConstituents('互联网服务');

// Print top 10 stocks by change percent
stocks.slice(0, 10).forEach(s => {
  console.log(`${s.name}(${s.code}): ${s.price} (${s.changePercent}%)`);
});
```

---

## getIndustryBoardKline

Get historical K-line data for an industry sector (daily/weekly/monthly).

### Signature

```typescript
getIndustryBoardKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<IndustryBoardKline[]>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Industry sector name or code |
| `period` | `string` | `'daily'` | K-line period: `'daily'` / `'weekly'` / `'monthly'` |
| `adjust` | `string` | `''` | Adjust type: `''` (none) / `'qfq'` (forward) / `'hfq'` (backward) |
| `startDate` | `string` | - | Start date `YYYYMMDD` |
| `endDate` | `string` | - | End date `YYYYMMDD` |

### Return Type

```typescript
interface IndustryBoardKline {
  date: string;               // Date
  open: number | null;        // Open price
  close: number | null;       // Close price
  high: number | null;        // High price
  low: number | null;         // Low price
  changePercent: number | null;   // Change percent %
  change: number | null;          // Price change
  volume: number | null;          // Volume
  amount: number | null;          // Amount
  amplitude: number | null;       // Amplitude %
  turnoverRate: number | null;    // Turnover rate %
}
```

### Example

```typescript
// Get daily K-line
const dailyKlines = await sdk.getIndustryBoardKline('互联网服务', {
  startDate: '20240101',
  endDate: '20241231',
});

// Get weekly K-line
const weeklyKlines = await sdk.getIndustryBoardKline('BK0447', {
  period: 'weekly',
  startDate: '20240101',
  endDate: '20241231',
});

dailyKlines.forEach(k => {
  console.log(`${k.date}: O ${k.open} H ${k.high} L ${k.low} C ${k.close}`);
});
```

---

## getIndustryBoardMinuteKline

Get minute K-line data for an industry sector (1/5/15/30/60 minutes).

### Signature

```typescript
getIndustryBoardMinuteKline(
  symbol: string,
  options?: {
    period?: '1' | '5' | '15' | '30' | '60';
  }
): Promise<IndustryBoardMinuteTimeline[] | IndustryBoardMinuteKline[]>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Industry sector name or code |
| `period` | `string` | `'5'` | Minute period: `'1'` / `'5'` / `'15'` / `'30'` / `'60'` |

### Return Type

**For 1-minute period:**

```typescript
interface IndustryBoardMinuteTimeline {
  time: string;              // Date time
  open: number | null;       // Open price
  close: number | null;      // Close price
  high: number | null;       // High price
  low: number | null;        // Low price
  volume: number | null;     // Volume
  amount: number | null;     // Amount
  price: number | null;      // Latest price
}
```

**For 5/15/30/60-minute period:**

```typescript
interface IndustryBoardMinuteKline {
  time: string;                   // Date time
  open: number | null;            // Open price
  close: number | null;           // Close price
  high: number | null;            // High price
  low: number | null;             // Low price
  changePercent: number | null;   // Change percent %
  change: number | null;          // Price change
  volume: number | null;          // Volume
  amount: number | null;          // Amount
  amplitude: number | null;       // Amplitude %
  turnoverRate: number | null;    // Turnover rate %
}
```

### Example

```typescript
// Get 1-minute timeline data
const timeline = await sdk.getIndustryBoardMinuteKline('互联网服务', {
  period: '1',
});

// Get 5-minute K-line
const minuteKlines = await sdk.getIndustryBoardMinuteKline('BK0447', {
  period: '5',
});

// Get 60-minute (hourly) K-line
const hourlyKlines = await sdk.getIndustryBoardMinuteKline('互联网服务', {
  period: '60',
});

minuteKlines.forEach(k => {
  console.log(`${k.time}: ${k.close} (${k.changePercent}%)`);
});
```

---

## Tips

### Lookup Sector Name and Code

```typescript
// Get sector list first to build name-to-code mapping
const boards = await sdk.getIndustryBoardList();
const boardMap = new Map(boards.map(b => [b.name, b.code]));

// Find code for a specific sector
const code = boardMap.get('互联网服务');  // BK0447
```

### Find Sector Leader

```typescript
// Get constituents (already sorted by change percent)
const stocks = await sdk.getIndustryBoardConstituents('互联网服务');

// The leader is the top stock
const leader = stocks[0];
console.log(`Leader: ${leader.name} Change: ${leader.changePercent}%`);
```

