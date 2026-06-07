# sdk.batch · Batch Quotes

The `sdk.batch` namespace is for **whole-market or large-batch** quote fetching: pull a full A-share / HK / US market snapshot in one call, or fetch by a given set of codes. Compared with calling [quotes](/en/api/quotes) one by one, batch handles chunking and concurrency internally — ideal for screening, scanning and dashboards.

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const all = await sdk.batch.cn()
```

## Methods

| Method | Description |
|---|---|
| `batch.cn(opts?)` | Whole-market A-share batch quotes |
| `batch.hk(opts?)` | Whole-market HK batch quotes |
| `batch.us(opts?)` | Whole-market US batch quotes |
| `batch.byCodes(codes, opts?)` | Batch quotes for given codes (cross-market inferred from symbols) |
| `batch.raw(params)` | Raw batch endpoint (passes low-level params through, returns unmerged raw structure) |

## Examples

### Whole-market snapshot

```ts
// Pull the entire A-share market at once
const all = await sdk.batch.cn()
console.log(all.length) // thousands of rows

// HK / US whole markets
const hk = await sdk.batch.hk()
const us = await sdk.batch.us()
```

### By codes

```ts
// Cross-market codes can be mixed; normalizeSymbol infers each market
const quotes = await sdk.batch.byCodes(['600519', '00700', 'AAPL'])
```

### Progress callback

Whole-market batches run chunked and concurrent; you can observe progress via options (exact params subject to the implementation):

```ts
const all = await sdk.batch.cn({
  onProgress: ({ loaded, total }) => {
    console.log(`${loaded}/${total}`)
  },
})
```

### Raw batch

`batch.raw` passes low-level params through and returns the unmerged raw structure — an advanced escape hatch that bypasses the unified contract:

```ts
const raw = await sdk.batch.raw({ /* low-level params, subject to implementation */ })
```

## Return

`batch.cn` / `batch.hk` / `batch.us` / `batch.byCodes` return an **array** of the [Quote discriminated union](/en/api/quotes#return-the-quote-discriminated-union), with the same fields as `sdk.quotes.*`: base fields `symbol` / `market` / `assetType` / `exchange` / `currency` / `timestamp` / `tz` / `source`, and quote fields `price` / `change` / `changePercent` / `volume` / `amount`, etc.

```ts
const all = await sdk.batch.cn()

// Local screening over the whole market (or use sdk.screener() directly)
const hot = all.filter(
  (q) => q.assetType === 'stock' && q.changePercent > 5,
)
```

::: tip Units & caching
- Return values follow the v2 unified conventions: percentages as percentage numbers, amounts / prices in base quote currency, volume in shares, `timestamp` as `number | null`, and no `raw` field.
- Whole-market snapshots pair well with a short-TTL cache to avoid repeated full pulls in a short window.
- `batch.raw` returns the raw structure and is **not** merged into the unified contract; its fields follow the underlying endpoint.
:::

> batch is the underlying data source for the [screener `sdk.screener()`](/en/api/). Exact concurrency params, progress callback signature and raw structure are subject to the implementation, finalized along with `src/sdk/namespaces`.
