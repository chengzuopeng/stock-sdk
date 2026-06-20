# search · Stock Search

`sdk.search(keyword)` is a top-level convenience on the SDK that searches by code, name, or pinyin abbreviation across A-shares, Hong Kong, US, funds, and indices.

| Method | Description |
|---|---|
| `sdk.search(keyword)` | Keyword search, returns `SearchResult[]` |
| `generateSearchExternalLinks(result)` | Pure helper: turn a single result into external links (EastMoney / Xueqiu, etc.) |

## sdk.search

### Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `keyword` | `string` | Yes | Keyword, e.g. `'600519'` / `'maotai'` / `'腾讯'` / `'00700'` |

### Example

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// Search Moutai
const results = await sdk.search('maotai');
console.log(results);
// [
//   {
//     code: 'sh600519',
//     name: '贵州茅台',
//     market: 'sh',
//     type: 'GP-A',      // raw upstream asset type
//     category: 'stock'  // normalized category
//   }
// ]

// Search Tencent (HK)
const hk = await sdk.search('00700');

// Prefer category for stable classification
const stocks = results.filter((r) => r.category === 'stock');
```

### Returns

Returns `Promise<SearchResult[]>`:

```ts
interface SearchResult {
  code: string;                // full code, e.g. 'sh600519'
  name: string;                // name
  market: string;              // market tag (sh/sz/hk/us)
  type: string;                // raw upstream asset-type string (e.g. 'GP-A' / 'ZS' / 'KJ')
  category?: SearchResultType; // normalized category for cross-source classification
}

type SearchResultType =
  | 'stock'
  | 'index'
  | 'fund'
  | 'bond'
  | 'futures'
  | 'option'
  | 'other';
```

::: tip type vs category
`type` passes through the raw upstream string (not narrowed to a union, so new upstream types still flow through); `category` is the SDK's normalized, stable classification. **Use `category` for classification logic.**
:::

Common `type` values and how they map to `category`:

| Class | Raw `type` values | Maps to `category` |
|---|---|---|
| Stock | `GP-A` / `GP-B` / `GP` | `stock` |
| Index | `ZS` | `index` |
| On-exchange fund | `ETF` / `LOF` / `QDII-ETF` / `QDII-LOF` | `fund` |
| Off-exchange fund | `KJ` / `KJ-HB` / `KJ-CX` / `QDII` / `QDII-FOF` | `fund` |
| Bond | `ZQ*` | `bond` |
| Futures | `QH*` | `futures` |
| Option | `QZ*` / `OPTION*` | `option` |
| Other | not covered above | `other` |

> Exact fields follow the implementation.

## generateSearchExternalLinks

A pure helper that builds links to external finance sites (EastMoney, Xueqiu, etc.) from a single `SearchResult`. It does not modify the search result; markets that can't be deep-linked fall back to the site's search page.

### Import & Signature

```ts
import { generateSearchExternalLinks } from 'stock-sdk';

interface ExternalLink {
  name: string;
  url: string;
}

function generateSearchExternalLinks(result: SearchResult): ExternalLink[];
```

### Example

```ts
import { StockSDK, generateSearchExternalLinks } from 'stock-sdk';

const sdk = new StockSDK();
const [maotai] = await sdk.search('maotai');
const links = generateSearchExternalLinks(maotai);

console.log(links);
// [
//   { name: '东方财富', url: 'https://quote.eastmoney.com/sh600519.html' },
//   { name: '雪球',     url: 'https://xueqiu.com/S/SH600519' }
// ]
```

## Notes

1. **CORS**: in the browser this runs via Script Tag Injection (JSONP) — no proxy needed for cross-origin calls; in Node.js it uses a standard HTTP request.
2. **Unified errors**: network failures on the browser JSONP path are also normalized to `SdkError` (`NETWORK_ERROR`), consistent with Node. See [Error Handling](../guide/retry.md).
3. **Classification**: for cross-source type checks use `category`, not the raw `type` string.
4. **Next step — fetching quotes**: once you have `SearchResult.code`, pick the matching quote method by `category` — stocks via [`sdk.quotes.*`](./quotes.md), funds via [`sdk.quotes.fund()`](./quotes.md) / [`sdk.fund.*`](./fund.md).
