# Batch Query

Stock SDK provides efficient batch query capabilities for large-scale data fetching.

## Get All A-Share Codes

```typescript
// Get all A-Share stock codes
const codes = await sdk.getAShareCodeList();
console.log(`Total: ${codes.length} stocks`);
// Total: 5000+ stocks

// Codes include exchange prefix by default
console.log(codes[0]); // 'sh600000'

// Without prefix (simple mode)
const pureCodes = await sdk.getAShareCodeList({ simple: true });
console.log(pureCodes[0]); // '600000'

// Filter by market
const kcCodes = await sdk.getAShareCodeList({ market: 'kc' }); // STAR Market
const cyCodes = await sdk.getAShareCodeList({ market: 'cy' }); // ChiNext

// Combine options
const cyCodsPure = await sdk.getAShareCodeList({ simple: true, market: 'cy' });
```

## Get All HK Stock Codes

```typescript
const hkCodes = await sdk.getHKCodeList();
console.log(hkCodes[0]); // '00700'
```

## Get All US Stock Codes

```typescript
const usCodes = await sdk.getUSCodeList();
console.log(usCodes[0]); // '105.AAPL'

// Without market prefix
const usCodesWithoutPrefix = await sdk.getUSCodeList({ simple: true });
console.log(usCodesWithoutPrefix[0]); // 'AAPL'

// Filter by market
const nasdaqCodes = await sdk.getUSCodeList({ market: 'NASDAQ' });
const nyseCodes = await sdk.getUSCodeList({ market: 'NYSE' });
const amexCodes = await sdk.getUSCodeList({ market: 'AMEX' });
```

## Batch Get All A-Share Quotes

```typescript
const allQuotes = await sdk.getAllAShareQuotes({
  // Batch size (default: 500)
  batchSize: 300,
  // Concurrency (default: 7)
  concurrency: 5,
  // Progress callback
  onProgress: (completed, total) => {
    const percent = Math.round(completed / total * 100);
    console.log(`Progress: ${percent}% (${completed}/${total})`);
  },
});

console.log(`Got ${allQuotes.length} stocks`);
```

## Batch Get Specific Quotes

```typescript
const codes = ['sh600000', 'sz000001', 'sh600519', /* ... more codes */];

const quotes = await sdk.getAllQuotesByCodes(codes, {
  batchSize: 100,
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total}`);
  },
});
```

## Batch Get HK/US Quotes

```typescript
// All HK stock quotes
const hkQuotes = await sdk.getAllHKShareQuotes({
  concurrency: 5,
  onProgress: (c, t) => console.log(`${c}/${t}`),
});

// All US stock quotes
const usQuotes = await sdk.getAllUSShareQuotes({
  concurrency: 5,
  onProgress: (c, t) => console.log(`${c}/${t}`),
});
```

## Performance Tips

### 1. Adjust Concurrency

Higher concurrency = faster, but may hit rate limits:

```typescript
// Conservative (slow but stable)
{ concurrency: 3 }

// Balanced (recommended)
{ concurrency: 5 }

// Aggressive (fast but may fail)
{ concurrency: 10 }
```

### 2. Adjust Batch Size

Larger batch = fewer requests, but larger payload:

```typescript
// Small batch (more requests)
{ batchSize: 100 }

// Large batch (fewer requests)
{ batchSize: 500 }
```

### 3. Error Handling

```typescript
try {
  const quotes = await sdk.getAllAShareQuotes({
    concurrency: 5,
    onProgress: (c, t) => console.log(`${c}/${t}`),
  });
} catch (error) {
  console.error('Batch fetch failed:', error);
  // Implement retry logic if needed
}
```

### 4. Caching

For frequently accessed data, consider caching:

```typescript
// Simple in-memory cache
const cache = new Map();

async function getCachedQuotes(codes: string[]) {
  const cacheKey = codes.join(',');
  
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey);
    // Cache valid for 30 seconds
    if (Date.now() - timestamp < 30000) {
      return data;
    }
  }
  
  const quotes = await sdk.getSimpleQuotes(codes);
  cache.set(cacheKey, { data: quotes, timestamp: Date.now() });
  return quotes;
}
```

## Next Steps

- [API Documentation](/en/api/batch) for detailed batch API
- [Technical Indicators](/en/guide/indicators) for indicator calculations

