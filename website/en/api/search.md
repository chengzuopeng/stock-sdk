# Search

## search

Search for stocks by code, name, or pinyin abbreviation. Supports A-shares, HK stocks, US stocks, funds, and indices.

### Type Definition

```ts
/**
 * Normalized asset category
 * - Derived from the raw `type` string by the SDK
 */
type SearchResultType =
  | 'stock'
  | 'index'
  | 'fund'
  | 'bond'
  | 'futures'
  | 'option'
  | 'other';

/**
 * Stock Search Result
 */
export interface SearchResult {
  /** Stock code (full, e.g. sh600519) */
  code: string;
  /** Stock name */
  name: string;
  /** Market identifier (sh/sz/hk/us) */
  market: string;
  /** Raw upstream asset type string (e.g. 'GP-A' / 'ZS' / 'KJ') */
  type: string;
  /** Normalized asset category for cross-provider classification */
  category?: SearchResultType;
}

function search(keyword: string): Promise<SearchResult[]>;
```

### Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `keyword` | `string` | Keyword (e.g., `600519`, `maotai`, `Tencent`) |

### `type` Field (Raw Values)

`type` keeps the raw asset type string returned by Tencent. Common values:

| Category | Value | Description |
| :--- | :--- | :--- |
| **Stocks** | `GP-A` | A-shares (SSE/SZSE main board / ChiNext / STAR) |
| | `GP-B` | B-shares |
| | `GP` | General stocks (HK / US / others) |
| **Indices** | `ZS` | Index |
| **On-market Funds** | `ETF` | ETF |
| | `LOF` | LOF |
| | `QDII-ETF` | Cross-border ETF |
| | `QDII-LOF` | Cross-border LOF |
| **Off-market Funds** | `KJ` | Open-end fund (hybrid / equity / bond, etc.) |
| | `KJ-HB` | Money market fund |
| | `KJ-CX` | Innovative fund |
| | `QDII` | QDII fund |
| | `QDII-FOF` | QDII-FOF fund |

::: tip
`type` is typed as `string` (not narrowed to a union) so any new upstream values pass through transparently. For stable category checks, prefer `category` below.
:::

### `category` Field (Normalized Category)

`category` is the SDK-normalized classification derived from the raw `type`,
useful for unified handling across providers:

| Value | Meaning | Mapped From |
| :--- | :--- | :--- |
| `stock` | Stock | `GP-A` / `GP-B` / `GP` |
| `index` | Index | `ZS` |
| `fund` | Fund | `ETF` / `LOF` / `KJ` / `QDII*` etc. |
| `bond` | Bond | `ZQ*` |
| `futures` | Futures | `QH*` |
| `option` | Option | `QZ*` / `OPTION*` |
| `other` | Other | Anything else |

### Example

```ts
// Search for Maotai
const results = await sdk.search('maotai');
console.log(results);
// Output:
// [
//   {
//     code: 'sh600519',
//     name: '贵州茅台',
//     market: 'sh',
//     type: 'GP-A',     // raw asset type
//     category: 'stock' // normalized category
//   }
// ]

// Search for Tencent (HK)
const hkResults = await sdk.search('00700');

// Prefer `category` for category-based filtering
const stocks = results.filter(r => r.category === 'stock');
```

### Cross-Origin Note

This API uses **Script Tag Injection (JSONP)** in the browser environment, allowing cross-origin calls without a proxy. In Node.js, it uses standard HTTP requests.
