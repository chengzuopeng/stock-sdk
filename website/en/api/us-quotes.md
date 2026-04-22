# US Stock Quotes

This page covers US real-time quotes only. For US code lists and full-market batch quotes, see [Code Lists](/en/api/code-lists) and [Batch Query](/en/api/batch).

## getUSQuotes

```ts
getUSQuotes(codes: string[]): Promise<USQuote[]>
```

### Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `codes` | `string[]` | US stock tickers such as `['AAPL', 'MSFT', 'BABA']` |

### Return Type

```ts
interface USQuote {
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
  turnoverRate: number | null;
  pe: number | null;
  amplitude: number | null;
  totalMarketCap: number | null;
  pb: number | null;
  high52w: number | null;
  low52w: number | null;
  raw: string[];
}
```

### Example

```ts
const quotes = await sdk.getUSQuotes(['AAPL', 'MSFT', 'BABA']);

quotes.forEach((item) => {
  console.log(`${item.name}: $${item.price} (${item.changePercent}%)`);
});
```

## Code Format

- Use tickers such as `AAPL` and `MSFT` for real-time quotes
- Use `{market}.{ticker}` such as `105.AAPL` and `106.BABA` for historical K-line

## Related Pages

- [Code Lists](/en/api/code-lists)
- [Batch Query](/en/api/batch)
- [K-line APIs](/en/api/kline)
