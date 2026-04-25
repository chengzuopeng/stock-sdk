# Options Data

Get real-time quotes, K-line, and minute data for CFFEX index options, SSE ETF options, and commodity options.

## CFFEX Index Options

### getIndexOptionSpot

Get CFFEX index option T-quotes (calls + puts).

```ts
const spot = await sdk.getIndexOptionSpot('io', 'io2504');
console.log(spot.calls); // Call contracts
console.log(spot.puts);  // Put contracts
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `product` | `'ho' \| 'io' \| 'mo'` | Product code: ho(SSE 50), io(CSI 300), mo(CSI 1000) |
| `contract` | `string` | Contract code, e.g. `'io2504'` |

**Returns:** `OptionTQuoteResult`

```ts
interface OptionTQuoteResult {
  calls: OptionTQuote[];
  puts: OptionTQuote[];
}

interface OptionTQuote {
  symbol: string;        // Contract identifier
  buyVolume: number | null;     // Bid volume
  buyPrice: number | null;      // Bid price
  price: number | null;         // Last price
  askPrice: number | null;      // Ask price
  askVolume: number | null;     // Ask volume
  openInterest: number | null;  // Open interest
  change: number | null;        // Price change
  strikePrice: number | null;   // Strike price (null for puts)
}
```

### getIndexOptionKline

Get CFFEX index option contract daily K-line.

```ts
const klines = await sdk.getIndexOptionKline('io2504C3600');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Contract code (with call/put identifier), e.g. `'io2504C3600'` |

**Returns:** `OptionKline[]`

```ts
interface OptionKline {
  date: string;    // Date YYYY-MM-DD
  open: number | null;    // Open price
  high: number | null;    // High price
  low: number | null;     // Low price
  close: number | null;   // Close price
  volume: number | null;  // Volume
}
```

### getCFFEXOptionQuotes

Get all CFFEX option real-time quotes (Eastmoney data source).

```ts
const quotes = await sdk.getCFFEXOptionQuotes();
console.log(quotes[0].code); // 'MO2603-P-8200'
```

**Returns:** `CFFEXOptionQuote[]`

```ts
interface CFFEXOptionQuote {
  code: string;           // Contract code
  name: string;           // Contract name
  price: number | null;          // Last price
  change: number | null;         // Price change
  changePercent: number | null;  // Change percent
  volume: number | null;         // Volume
  amount: number | null;         // Amount
  openInterest: number | null;   // Open interest
  strikePrice: number | null;    // Strike price
  remainDays: number | null;     // Days to expiry
  dailyChange: number | null;    // Daily change
  prevSettle: number | null;     // Previous settlement
  open: number | null;           // Open price
}
```

## SSE ETF Options

### getETFOptionMonths

Get SSE ETF option expiration month list.

```ts
const info = await sdk.getETFOptionMonths('50ETF');
console.log(info.months); // ['2026-03', '2026-04', '2026-06']
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cate` | `ETFOptionCate` | Category: `'50ETF'`, `'300ETF'`, `'500ETF'`, `'科创50'` |

**Returns:** `ETFOptionMonth`

```ts
interface ETFOptionMonth {
  months: string[];    // Expiration months
  stockId: string;     // Underlying security code
  cateId: string;      // Current category ID
  cateList: string[];  // Available categories
}
```

### getETFOptionExpireDay

Get SSE ETF option expiration date and remaining days.

```ts
const info = await sdk.getETFOptionExpireDay('50ETF', '2026-03');
console.log(info.expireDay);      // '2026-03-25'
console.log(info.remainderDays);  // 12
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cate` | `ETFOptionCate` | Category |
| `month` | `string` | Expiration month `YYYY-MM` |

**Returns:** `ETFOptionExpireDay`

```ts
interface ETFOptionExpireDay {
  expireDay: string;     // Expiration date
  remainderDays: number; // Remaining days
  stockId: string;       // Underlying security code
  name: string;          // Underlying name
}
```

### getETFOptionMinute

Get SSE ETF option intraday minute data.

```ts
const minutes = await sdk.getETFOptionMinute('10009633');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | `string` | Option code (numeric only) |

**Returns:** `OptionMinute[]`

```ts
interface OptionMinute {
  time: string;          // Time HH:mm:ss
  date: string;          // Date YYYY-MM-DD
  price: number | null;         // Price
  volume: number | null;        // Volume
  openInterest: number | null;  // Open interest
  avgPrice: number | null;      // Average price
}
```

### getETFOptionDailyKline

Get SSE ETF option historical daily K-line.

```ts
const klines = await sdk.getETFOptionDailyKline('10009633');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | `string` | Option code (numeric only) |

**Returns:** `OptionKline[]`

### getETFOption5DayMinute

Get SSE ETF option 5-day minute data.

```ts
const minutes = await sdk.getETFOption5DayMinute('10009633');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | `string` | Option code (numeric only) |

**Returns:** `OptionMinute[]`

## Commodity Options

### getCommodityOptionSpot

Get commodity option T-quotes.

```ts
const spot = await sdk.getCommodityOptionSpot('au', 'au2506');
console.log(spot.calls); // Call contracts
console.log(spot.puts);  // Put contracts
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `variety` | `string` | Variety code, e.g. `'au'`, `'cu'`, `'SR'`, `'m'` |
| `contract` | `string` | Contract code, e.g. `'au2506'` |

**Supported commodity option varieties:**

SHFE: au (gold), ag (silver), cu (copper), al (aluminum), zn (zinc), ru (rubber)
INE: sc (crude oil)
DCE: m (soybean meal), c (corn), i (iron ore), p (palm oil), pp, l, v, pg, y, a, b, eg, eb
CZCE: SR (sugar), CF (cotton), TA, MA, RM, OI, PK, PF, SA, UR

**Returns:** `OptionTQuoteResult`

### getCommodityOptionKline

Get commodity option contract daily K-line.

```ts
const klines = await sdk.getCommodityOptionKline('m2409C3200');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Contract code (with call/put identifier), e.g. `'m2409C3200'` |

**Returns:** `OptionKline[]`

## Ranking Data

### getOptionLHB

Get option leaderboard.

```ts
const lhb = await sdk.getOptionLHB('510050', '2022-01-21');
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Underlying code, e.g. `'510050'`, `'510300'`, `'159919'` |
| `date` | `string` | Trading date `YYYY-MM-DD` |

**Returns:** `OptionLHBItem[]`

```ts
interface OptionLHBItem {
  tradeType: string;   // Trade type
  date: string;        // Trade date
  symbol: string;      // Underlying code
  targetName: string;  // Underlying name
  memberName: string;  // Member abbreviation
  rank: number;        // Rank
  sellVolume: number | null;  // Sell volume
  buyVolume: number | null;   // Buy volume
  // ...more fields
}
```

The return value also keeps legacy aliases such as `tradeDate`, `volume`, `amount`, `openInterest`, and `side` for backward compatibility.
