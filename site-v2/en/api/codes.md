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
console.log(cn.length, cn[0]) // { code, name, ... }

// US / HK / fund
const us = await sdk.codes.us()
const hk = await sdk.codes.hk()
const fund = await sdk.codes.fund()
```

### Feeding batch quotes

A code list is often the input to [batch](/en/api/batch) or [quotes](/en/api/quotes):

```ts
const cn = await sdk.codes.cn()
const top100 = cn.slice(0, 100).map((it) => it.code)
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

Each method returns an **array of code items**, each carrying at least the code, name and basic identity fields:

| Field | Type | Description |
|---|---|---|
| `code` | `string` | Bare code (no prefix) |
| `name` | `string` | Name |
| `market` | `Market` | Owning market |

> Exact fields (whether `exchange` / `pinyin` / listing status are included, etc.) are subject to the implementation, finalized along with `src/sdk/namespaces` and the corresponding type definitions.
