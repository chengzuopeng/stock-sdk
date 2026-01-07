# Search

## search

Search for stocks by code, name, or pinyin abbreviation. Supports A-shares, HK stocks, and US stocks.

### Type Definition

```ts
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
  /** Asset type (GP-A/GP/KJ etc.) */
  type: string;
}

function search(keyword: string): Promise<SearchResult[]>;
```

### Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `keyword` | `string` | Keyword (e.g., `600519`, `maotai`, `Tencent`) |

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
//     type: 'GP-A'
//   }
// ]

// Search for Tencent (HK)
const hkResults = await sdk.search('00700');
```

### Cross-Origin Note

This API uses **Script Tag Injection (JSONP)** in the browser environment, allowing cross-origin calls without a proxy. In Node.js, it uses standard HTTP requests.
