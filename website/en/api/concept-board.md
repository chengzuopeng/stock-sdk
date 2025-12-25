# Concept Sectors

Get East Money concept sector data, including sector list, real-time quotes, constituents, and K-line data.

## getConceptBoardList

Get all concept sector names, codes, and real-time quote overview.

### Signature

```typescript
getConceptBoardList(): Promise<ConceptBoard[]>
```

### Return Type

```typescript
interface ConceptBoard {
  rank: number;                        // Rank (by change percent)
  name: string;                        // Sector name
  code: string;                        // Sector code (e.g., BK0800)
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
// Get all concept sectors
const boards = await sdk.getConceptBoardList();

// Print top 5 sectors by change percent
boards.slice(0, 5).forEach(b => {
  console.log(`${b.name}: ${b.changePercent}% (Leader: ${b.leadingStock})`);
});
```

---

## getConceptBoardSpot

Get real-time quote data for a specific concept sector.

### Signature

```typescript
getConceptBoardSpot(symbol: string): Promise<ConceptBoardSpot[]>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Concept sector name (e.g., `'人工智能'`) or code (e.g., `'BK0800'`) |

### Return Type

```typescript
interface ConceptBoardSpot {
  item: string;         // Indicator name
  value: number | null; // Indicator value
}
```

Returns indicators including: Latest, High, Low, Open, Volume, Amount, Change%, Amplitude, Turnover Rate, Change.

### Example

```typescript
// Query by sector name
const spot = await sdk.getConceptBoardSpot('人工智能');

// Query by sector code
const spot2 = await sdk.getConceptBoardSpot('BK0800');

spot.forEach(s => {
  console.log(`${s.item}: ${s.value}`);
});
```

---

## getConceptBoardConstituents

Get the constituent stocks of a specific concept sector with their real-time quotes.

### Signature

```typescript
getConceptBoardConstituents(symbol: string): Promise<ConceptBoardConstituent[]>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Concept sector name or code |

### Return Type

```typescript
interface ConceptBoardConstituent {
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
// Get constituents of AI sector
const stocks = await sdk.getConceptBoardConstituents('人工智能');

// Print top 10 stocks by change percent
stocks.slice(0, 10).forEach(s => {
  console.log(`${s.name}(${s.code}): ${s.price} (${s.changePercent}%)`);
});
```

---

## getConceptBoardKline

Get historical K-line data for a concept sector (daily/weekly/monthly).

### Signature

```typescript
getConceptBoardKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    adjust?: '' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }
): Promise<ConceptBoardKline[]>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Concept sector name or code |
| `period` | `string` | `'daily'` | K-line period: `'daily'` / `'weekly'` / `'monthly'` |
| `adjust` | `string` | `''` | Adjust type: `''` (none) / `'qfq'` (forward) / `'hfq'` (backward) |
| `startDate` | `string` | - | Start date `YYYYMMDD` |
| `endDate` | `string` | - | End date `YYYYMMDD` |

### Return Type

```typescript
interface ConceptBoardKline {
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
const dailyKlines = await sdk.getConceptBoardKline('人工智能', {
  startDate: '20240101',
  endDate: '20241231',
});

// Get weekly K-line
const weeklyKlines = await sdk.getConceptBoardKline('BK0800', {
  period: 'weekly',
  startDate: '20240101',
  endDate: '20241231',
});

dailyKlines.forEach(k => {
  console.log(`${k.date}: O ${k.open} H ${k.high} L ${k.low} C ${k.close}`);
});
```

---

## getConceptBoardMinuteKline

Get minute K-line data for a concept sector (1/5/15/30/60 minutes).

### Signature

```typescript
getConceptBoardMinuteKline(
  symbol: string,
  options?: {
    period?: '1' | '5' | '15' | '30' | '60';
  }
): Promise<ConceptBoardMinuteTimeline[] | ConceptBoardMinuteKline[]>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Concept sector name or code |
| `period` | `string` | `'5'` | Minute period: `'1'` / `'5'` / `'15'` / `'30'` / `'60'` |

### Return Type

**For 1-minute period:**

```typescript
interface ConceptBoardMinuteTimeline {
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
interface ConceptBoardMinuteKline {
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
const timeline = await sdk.getConceptBoardMinuteKline('人工智能', {
  period: '1',
});

// Get 5-minute K-line
const minuteKlines = await sdk.getConceptBoardMinuteKline('BK0800', {
  period: '5',
});

// Get 60-minute (hourly) K-line
const hourlyKlines = await sdk.getConceptBoardMinuteKline('人工智能', {
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
const boards = await sdk.getConceptBoardList();
const boardMap = new Map(boards.map(b => [b.name, b.code]));

// Find code for a specific sector
const code = boardMap.get('人工智能');  // BK0800
```

### Track Hot Concept Sectors

```typescript
// Get top 10 concept sectors by change percent
const boards = await sdk.getConceptBoardList();
const hotBoards = boards.slice(0, 10);

// Get leader stock for each hot sector
for (const board of hotBoards) {
  const stocks = await sdk.getConceptBoardConstituents(board.code);
  console.log(`${board.name} Leader: ${stocks[0]?.name}`);
}
```

