# sdk.codes · Code Lists

The `sdk.codes` namespace returns the **full code list** per market, used to build watchlists, feed batch fetches, or do local lookups. Results are typically large and change slowly — a good fit for a longer TTL in the [cache layer](/en/api/).

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const cn = await sdk.codes.cn()
```

## Methods

| Method | Description |
|---|---|
| `codes.cn(opts?)` | A-share code list |
| `codes.us(opts?)` | US code list |
| `codes.hk()` | HK code list |
| `codes.fund()` | Fund code list |

> v1's old boolean signatures `getAShareCodeList(boolean)` / `getUSCodeList(boolean)` are removed; v2 uses an options object uniformly (no arg or `{...}`). See [Migrate from v1](/en/guide/migration-v1-to-v2).

## Examples

```ts
// Full A-share code list
const cn = await sdk.codes.cn()
console.log(cn.length, cn[0]) // e.g. "sh600000" (with { simple: true } → "600000")

// US / HK / fund
const us = await sdk.codes.us()
const hk = await sdk.codes.hk()
const fund = await sdk.codes.fund()
```

### Feeding batch quotes

A code list is often the input to [batch](/en/api/batch) or [quotes](/en/api/quotes):

```ts
const cn = await sdk.codes.cn()
const top100 = cn.slice(0, 100) // already an array of code strings, use directly
const quotes = await sdk.quotes.cnSimple(top100)
```

### Recommended caching

Code lists update infrequently — enabling the cache is recommended (default TTL 6 hours):

```ts
const sdk = new StockSDK({
  cache: { enabled: true, policies: { codeList: { ttl: 6 * 3600_000 } } },
})
const cn = await sdk.codes.cn() // first fetch, then cache hits
```

## Return

Each method returns an **array of code strings** (`string[]`) — each item is a symbol's code, **not an object**. Codes carry their exchange prefix by default; for A-shares / US you can pass `{ simple: true }` to strip it:

```ts
await sdk.codes.cn()                  // ["sh600000", "sz000001", "bj430047", ...]
await sdk.codes.cn({ simple: true })  // ["600000", "000001", "430047", ...]
await sdk.codes.cn({ market: 'kc' })  // STAR Market only
```

| Option | Type | Applies to | Description |
|---|---|---|---|
| `simple` | `boolean` | `codes.cn` / `codes.us` | Strip the exchange prefix (A-share `sh`/`sz`/`bj`), default `false` |
| `market` | `AShareMarket` / `USMarket` | `codes.cn` / `codes.us` | Filter by sub-market (e.g. A-share `kc` STAR, `cy` ChiNext); `codes.hk` / `codes.fund` take no options |

> The returned code strings can be fed directly into [batch](/en/api/batch) / [quotes](/en/api/quotes).
