# Batch Query

Efficiently fetch large amounts of stock data.

## getAllAShareQuotes

Get all A-Share real-time quotes. Supports filtering by exchange or board.

```typescript
// Get all A-Share quotes
const quotes = await sdk.getAllAShareQuotes();

// Get STAR Market (科创板) quotes only
const kcQuotes = await sdk.getAllAShareQuotes({ market: 'kc' });

// Get ChiNext (创业板) quotes with progress
const cyQuotes = await sdk.getAllAShareQuotes({
  market: 'cy',
  batchSize: 500,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
});
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| market | `AShareMarket` | - | Filter by exchange/board |
| batchSize | `number` | 500 | Codes per request |
| concurrency | `number` | 7 | Parallel requests |
| onProgress | `function` | - | Progress callback |

### AShareMarket Type

| Value | Description | Code Pattern |
|-------|-------------|--------------|
| `'sh'` | Shanghai Stock Exchange | Starts with 6 |
| `'sz'` | Shenzhen Stock Exchange | Starts with 0 or 3 |
| `'bj'` | Beijing Stock Exchange | Starts with 92 |
| `'kc'` | STAR Market (科创板) | Starts with 688 |
| `'cy'` | ChiNext (创业板) | Starts with 30 |

## getAllHKShareQuotes

Get all HK stock quotes.

```typescript
const quotes = await sdk.getAllHKShareQuotes({
  concurrency: 5,
  onProgress: (c, t) => console.log(`${c}/${t}`),
});
```

## getAllUSShareQuotes

Get all US stock quotes. Supports filtering by market.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `batchSize` | `number` | `500` | Batch size per request |
| `concurrency` | `number` | `7` | Max concurrent requests |
| `onProgress` | `function` | - | Progress callback |
| `market` | `USMarket` | - | Filter by market: `NASDAQ`, `NYSE`, `AMEX` |

### Example

```typescript
// Get all US stocks
const allQuotes = await sdk.getAllUSShareQuotes();

// Get NASDAQ stocks only
const nasdaqQuotes = await sdk.getAllUSShareQuotes({ market: 'NASDAQ' });

// Get NYSE stocks with progress
const nyseQuotes = await sdk.getAllUSShareQuotes({
  market: 'NYSE',
  concurrency: 5,
  onProgress: (c, t) => console.log(`${c}/${t}`),
});
```

## getAllQuotesByCodes

Get quotes for specific code list.

```typescript
const codes = ['sh600000', 'sz000001', 'sh600519', ...];

const quotes = await sdk.getAllQuotesByCodes(codes, {
  batchSize: 100,
  concurrency: 3,
});
```

## batchRaw

Low-level batch query for mixed data types.

```typescript
const result = await sdk.batchRaw([
  'r_sz000858',  // Real-time quote
  'r_sh600519',  // Real-time quote
]);
```

## Performance Tips

1. **Adjust concurrency based on network**
   - Low latency: Use higher concurrency (7-10)
   - High latency: Use lower concurrency (3-5)

2. **Use progress callbacks for UI feedback**
   ```typescript
   onProgress: (completed, total) => {
     updateProgressBar(completed / total * 100);
   }
   ```

3. **Handle errors gracefully**
   ```typescript
   try {
     const quotes = await sdk.getAllAShareQuotes();
   } catch (error) {
     // Implement retry or fallback
   }
   ```

