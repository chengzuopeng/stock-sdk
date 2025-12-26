# Extended Data

## getTradingCalendar

Get A-share trading calendar, returning all trading days from 1990 to the future.

### Signature

```typescript
getTradingCalendar(): Promise<string[]>
```

### Return Type

```typescript
string[]  // Array of trading dates, e.g. ['1990-12-19', '1990-12-20', ...]
```

### Example

```typescript
const calendar = await sdk.getTradingCalendar();

console.log(`Total ${calendar.length} trading days`);
console.log(`First trading day: ${calendar[0]}`);  // 1990-12-19
console.log(`Last trading day: ${calendar[calendar.length - 1]}`);

// Check if a date is a trading day
function isTradingDay(date: string): boolean {
  return calendar.includes(date);
}

console.log(isTradingDay('2024-01-02'));  // true
console.log(isTradingDay('2024-01-01'));  // false (New Year's Day)
```

### Use Cases

```typescript
// Get recent N trading days
function getRecentTradingDays(n: number): string[] {
  const today = new Date().toISOString().slice(0, 10);
  const idx = calendar.findIndex(d => d >= today);
  return calendar.slice(Math.max(0, idx - n), idx);
}

// Count trading days between two dates
function countTradingDays(start: string, end: string): number {
  return calendar.filter(d => d >= start && d <= end).length;
}

// Get next trading day
function getNextTradingDay(date: string): string | undefined {
  return calendar.find(d => d > date);
}
```

---

## getFundFlow

Get capital flow data for stocks.

```typescript
const flows = await sdk.getFundFlow(['sz000858', 'sh600519']);
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| codes | `string[]` | Yes | Stock codes |

### Return Type

```typescript
interface FundFlowData {
  code: string;            // Stock code
  name: string;            // Stock name
  mainNet: number;         // Main capital net inflow
  mainNetRatio: number;    // Main capital net ratio (%)
  superLargeNet: number;   // Super large order net
  superLargeRatio: number; // Super large order ratio (%)
  largeNet: number;        // Large order net
  largeRatio: number;      // Large order ratio (%)
  mediumNet: number;       // Medium order net
  mediumRatio: number;     // Medium order ratio (%)
  smallNet: number;        // Small order net
  smallRatio: number;      // Small order ratio (%)
}
```

## getPanelLargeOrder

Get large order ratio from order book.

```typescript
const orders = await sdk.getPanelLargeOrder(['sz000858']);
```

### Return Type

```typescript
interface PanelLargeOrderData {
  code: string;
  name: string;
  buyLargeRatio: number;   // Buy side large order ratio
  sellLargeRatio: number;  // Sell side large order ratio
}
```

## Example

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Get fund flow
const flows = await sdk.getFundFlow(['sz000858', 'sh600519']);
flows.forEach(f => {
  console.log(`${f.name}:`);
  console.log(`  Main Net: ${f.mainNet} (${f.mainNetRatio}%)`);
  console.log(`  Large Net: ${f.largeNet}`);
});

// Get large order ratio
const orders = await sdk.getPanelLargeOrder(['sz000858']);
orders.forEach(o => {
  console.log(`${o.name}: Buy ${o.buyLargeRatio}%, Sell ${o.sellLargeRatio}%`);
});
```

