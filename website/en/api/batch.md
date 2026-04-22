# Batch Query

Stock SDK provides full-market batch quotes, custom code-list batch quotes, and a low-level mixed raw query API.

::: tip Code Lists
For market code lists, see [Code Lists](/en/api/code-lists).
:::

## getAllAShareQuotes

```ts
getAllAShareQuotes(options?: {
  market?: AShareMarket;
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<FullQuote[]>
```

Use it to fetch the entire A-share market with optional `market`, `batchSize`, `concurrency`, and `onProgress`.

## getAllQuotesByCodes

```ts
getAllQuotesByCodes(
  codes: string[],
  options?: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<FullQuote[]>
```

### Returned Order

The results are returned in the same order as the input `codes`, which makes it easier to align with a watchlist, table rows, or your own cache keys.

```ts
const codes = ['sz000858', 'sh600519', 'sh600000', 'sz000001'];
const quotes = await sdk.getAllQuotesByCodes(codes, {
  batchSize: 100,
  concurrency: 2,
});

console.log(quotes.map((item) => item.code));
// ['sz000858', 'sh600519', 'sh600000', 'sz000001']
```

## getAllHKShareQuotes

```ts
getAllHKShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<HKQuote[]>
```

## getAllUSShareQuotes

```ts
getAllUSShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
  market?: 'NASDAQ' | 'NYSE' | 'AMEX';
}): Promise<USQuote[]>
```

## batchRaw

```ts
batchRaw(params: string): Promise<{ key: string; fields: string[] }[]>
```

`batchRaw` is the low-level mixed query API for advanced cases where you want to parse the raw fields yourself.

```ts
const raw = await sdk.batchRaw('sz000858,s_sh000001,jj000001');

console.log(raw[0].key);
console.log(raw[0].fields);
```

## Performance Tips

- Reduce `concurrency` on unstable networks
- Reduce `batchSize` when each request becomes too large
- Use `providerPolicies` from [Request Governance](/en/guide/request-governance) for finer-grained control

## Related Pages

- [Code Lists](/en/api/code-lists)
- [Request Governance](/en/guide/request-governance)
