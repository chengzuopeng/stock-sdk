# Futures

## getFuturesKline

Get domestic futures historical K-line (daily/weekly/monthly). Data source: Eastmoney.

Supports all varieties from SHFE, DCE, CZCE, INE, CFFEX, and GFEX exchanges.

### Signature

```typescript
getFuturesKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    startDate?: string;
    endDate?: string;
  }
): Promise<FuturesKline[]>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Contract code, e.g. `'rb2605'` (specific) or `'RBM'` (main continuous) |
| `period` | `string` | `'daily'` | K-line period: `'daily'` / `'weekly'` / `'monthly'` |
| `startDate` | `string` | - | Start date `YYYYMMDD` |
| `endDate` | `string` | - | End date `YYYYMMDD` |

### Symbol Format

| Format | Description | Example |
|--------|-------------|---------|
| `variety + contract month` | Specific contract | `rb2605`, `IF2604`, `TA509` |
| `variety + M` | Main continuous contract | `RBM`, `IFM`, `TAM`, `scM` |

### Return Type

```typescript
interface FuturesKline {
  date: string;               // Date YYYY-MM-DD
  code: string;               // Contract code
  name: string;               // Contract name
  open: number | null;        // Open price
  close: number | null;       // Close price
  high: number | null;        // High price
  low: number | null;         // Low price
  volume: number | null;      // Volume
  amount: number | null;      // Turnover
  amplitude: number | null;   // Amplitude %
  changePercent: number | null;  // Change %
  change: number | null;         // Change amount
  turnoverRate: number | null;   // Turnover rate %
  openInterest: number | null;   // Open interest
}
```

### Example

```typescript
// Get rebar main continuous daily K-line
const klines = await sdk.getFuturesKline('RBM');

// Get CSI 300 futures specific contract weekly K-line
const weeklyKlines = await sdk.getFuturesKline('IF2604', {
  period: 'weekly',
  startDate: '20250101',
});

klines.forEach(k => {
  console.log(`${k.date}: close ${k.close} OI ${k.openInterest}`);
});
```

---

## getGlobalFuturesSpot

Get global futures real-time quotes (COMEX, NYMEX, CBOT, SGX, NYBOT, LME, MDEX, TOCOM, IPE). Data source: Eastmoney.

### Signature

```typescript
getGlobalFuturesSpot(
  options?: {
    pageSize?: number;
  }
): Promise<GlobalFuturesQuote[]>
```

### Return Type

```typescript
interface GlobalFuturesQuote {
  code: string;               // Contract code
  name: string;               // Name
  price: number | null;       // Latest price
  change: number | null;      // Change amount
  changePercent: number | null;  // Change %
  open: number | null;        // Open
  high: number | null;        // High
  low: number | null;         // Low
  prevSettle: number | null;  // Previous settlement price
  volume: number | null;      // Volume
  buyVolume: number | null;   // Buy volume
  sellVolume: number | null;  // Sell volume
  openInterest: number | null;   // Open interest
}
```

### Example

```typescript
const quotes = await sdk.getGlobalFuturesSpot();
quotes.forEach(q => {
  console.log(`${q.name} (${q.code}): ${q.price} ${q.changePercent}%`);
});
```

---

## getGlobalFuturesKline

Get global futures historical K-line (daily/weekly/monthly). Data source: Eastmoney.

### Signature

```typescript
getGlobalFuturesKline(
  symbol: string,
  options?: {
    period?: 'daily' | 'weekly' | 'monthly';
    startDate?: string;
    endDate?: string;
    marketCode?: number;
  }
): Promise<FuturesKline[]>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Contract code, e.g. `'HG00Y'` (COMEX copper continuous) |
| `period` | `string` | `'daily'` | K-line period |
| `marketCode` | `number` | - | Eastmoney market code (for varieties not built-in) |

### Built-in Varieties

| Exchange | Varieties | Market Code |
|----------|-----------|-------------|
| COMEX | HG, GC, SI, QI, QO, MGC | 101 |
| NYMEX | CL, NG, RB, HO, PA, PL | 102 |
| CBOT | ZW, ZM, ZS, ZC, ZL, ZR, YM, NQ, ES | 103 |
| NYBOT | SB, CT | 108 |
| LME | LCPT, LZNT, LALT | 109 |

### Example

```typescript
// Get COMEX copper continuous daily K-line
const klines = await sdk.getGlobalFuturesKline('HG00Y');

// Get NYMEX crude oil weekly K-line
const oilKlines = await sdk.getGlobalFuturesKline('CL00Y', {
  period: 'weekly',
  startDate: '20250101',
});
```

---

## getFuturesInventorySymbols

Get futures inventory symbol list. Data source: Eastmoney Data Center.

### Signature

```typescript
getFuturesInventorySymbols(): Promise<FuturesInventorySymbol[]>
```

### Return Type

```typescript
interface FuturesInventorySymbol {
  code: string;       // Variety code
  name: string;       // Variety name
  marketCode: string; // Market code
}
```

### Example

```typescript
const symbols = await sdk.getFuturesInventorySymbols();
symbols.forEach(s => {
  console.log(`${s.name} (${s.code})`);
});
```

---

## getFuturesInventory

Get futures inventory data. Data source: Eastmoney Data Center.

### Signature

```typescript
getFuturesInventory(
  symbol: string,
  options?: {
    startDate?: string;
    pageSize?: number;
  }
): Promise<FuturesInventory[]>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | `string` | - | Variety code (from `getFuturesInventorySymbols`) |
| `startDate` | `string` | `'2020-10-28'` | Start date `YYYY-MM-DD` |

### Return Type

```typescript
interface FuturesInventory {
  code: string;             // Variety code
  date: string;             // Date
  inventory: number | null; // Inventory
  change: number | null;    // Change
}
```

### Example

```typescript
const inventory = await sdk.getFuturesInventory('rb');
inventory.forEach(item => {
  console.log(`${item.date}: inventory ${item.inventory} change ${item.change}`);
});
```

---

## getComexInventory

Get COMEX gold/silver inventory data. Data source: Eastmoney Data Center.

### Signature

```typescript
getComexInventory(
  symbol: 'gold' | 'silver',
  options?: {
    pageSize?: number;
  }
): Promise<ComexInventory[]>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | `'gold'` or `'silver'` |

### Return Type

```typescript
interface ComexInventory {
  date: string;                // Date
  name: string;                // Variety name
  storageTon: number | null;   // Storage (tons)
  storageOunce: number | null; // Storage (ounces)
}
```

### Example

```typescript
// Get COMEX gold inventory
const goldInventory = await sdk.getComexInventory('gold');
goldInventory.forEach(item => {
  console.log(`${item.date}: ${item.storageTon} tons`);
});

// Get COMEX silver inventory
const silverInventory = await sdk.getComexInventory('silver');
```
