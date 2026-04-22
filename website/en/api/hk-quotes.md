# HK Stock Quotes

This page covers HK real-time quotes only. For HK code lists and full-market batch quotes, see [Code Lists](/en/api/code-lists) and [Batch Query](/en/api/batch).

## getHKQuotes

```ts
getHKQuotes(codes: string[]): Promise<HKQuote[]>
```

### Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `codes` | `string[]` | HK stock codes such as `['00700', '09988']` |

### Return Type

```ts
interface HKQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  prevClose: number;
  open: number;
  volume: number;
  time: string;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  amount: number;
  lotSize: number | null;
  circulatingMarketCap: number | null;
  totalMarketCap: number | null;
  currency: string;
  raw: string[];
}
```

### Example

```ts
const quotes = await sdk.getHKQuotes(['00700', '09988']);

quotes.forEach((item) => {
  console.log(`${item.name}: ${item.price} ${item.currency}`);
});
```

## Code Format

- HK stock codes use 5 digits, for example `00700`
- No exchange prefix is needed

## Related Pages

- [Code Lists](/en/api/code-lists)
- [Batch Query](/en/api/batch)
- [K-line APIs](/en/api/kline)
