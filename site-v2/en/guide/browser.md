# Browser Usage

stock-sdk is a zero-dependency SDK that runs in **both the browser and Node.js 18+**—the same code works on both ends. The browser, however, has its own constraints—mainly cross-origin (CORS) and differences in how some data sources are fetched. This page lays out those differences and how to handle them.

## Basic usage

In the browser, usage is identical to Node—just `import` (ESM):

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const quotes = await sdk.quotes.cn(['600519', '000001'])
```

The main entry is a pure library with zero runtime dependencies. Combined with subpath exports (`stock-sdk/indicators`, `stock-sdk/signals`, `stock-sdk/symbols`), pure-computation usage won't pull the network layer into your bundle.

## CORS: the core browser constraint

Market data comes from third-party upstreams (Tencent / Eastmoney / Sina, etc.). These endpoints **don't necessarily open CORS for your page's domain**, so the browser blocks cross-origin responses under the same-origin policy. This is the biggest difference from Node—Node has no same-origin policy and can request directly.

How to handle it:

1. **Use a self-hosted proxy**: forward requests through your own backend / edge function, have the server fetch upstream data, and return it same-origin to the frontend. This is the safest approach for production.

2. **Inject a custom `fetch`**: the v2 request layer supports injecting `fetchImpl`, so you can route requests through your own proxy:

   ```ts
   const sdk = new StockSDK({
     fetchImpl: (url, init) => {
       // rewrite to your own proxy address
       const proxied = `https://your-proxy.example.com/?u=${encodeURIComponent(String(url))}`
       return fetch(proxied, init)
     },
   })
   ```

   `fetchImpl` can also be overridden per-call via `GetOptions`. See [Request Governance](/en/guide/request-governance).

3. **Use `<script>` injection for sources that support it**: some data sources natively provide data as JS globals / JSONP, which bypasses CORS (see below).

::: warning Don't fight CORS
You cannot "disable" CORS from frontend code. Requesting an endpoint that doesn't open cross-origin will always fail—you must fetch via a proxy or the `<script>` injection approach below.
:::

## `<script>`-injected data sources

Some upstream sources (e.g. parts of Sina quotes, Tencent search smartbox, fund-valuation fundgz) provide data as **JSONP / global variables**. These sources **don't go through standard `fetch`**; instead the browser dynamically inserts a `<script>` tag and reads the global variable the script attaches to `window`—because `<script>` loading is exempt from the same-origin policy, this bypasses CORS.

stock-sdk wraps this mechanism internally (`core/jsVars.ts` + `core/scriptMutex.ts`), transparently to the caller: call the method as usual, and the SDK picks the correct fetch path for the current environment.

- **Browser**: automatically uses `<script>` injection to read globals / JSONP.
- **Node**: these sources fetch over plain HTTP and parse, no `<script>` needed.

::: tip Error handling
The `<script>` injection path doesn't go through `RequestClient`, but v2 handles errors on these paths explicitly: a failed script load throws `NETWORK_ERROR`, a timeout throws `TIMEOUT`—both unified `SdkError`s. For error codes and retries see [Errors & Retry](/en/guide/retry).
:::

## Cross-platform differences at a glance

| Aspect | Browser | Node.js 18+ |
|---|---|---|
| Same-origin policy / CORS | Restricted; needs a proxy or `<script>` injection | No restriction; request directly |
| `<script>`-injected sources | Reads globals via dynamic `<script>` | Fetches over plain HTTP and parses |
| Default `fetch` | Browser-native `fetch` | Node-native `fetch` (built in since 18) |
| `AbortSignal.any` | Supported in modern browsers | 18.17+ supported; lower versions get an SDK built-in fallback |
| CLI / MCP | Not applicable (Node-only) | `stock-sdk` command and `stock-sdk mcp` |

The SDK picks the fetch path automatically based on the runtime environment, so **your business call code is identical on both ends**—you don't write one version for the browser and another for Node.

## Practical advice

- **Prefer a self-hosted proxy in production**, consolidating upstream requests on the server—this solves CORS and makes it easy to add caching, rate limiting, and key protection.
- **For pure-frontend demos / intranet tools**, consider `<script>`-injected sources, or a public proxy (mind stability and compliance).
- **Import via subpath as needed**: on the browser side, when using only indicators / signals / symbol parsing, import from sub-entries like `stock-sdk/indicators` to avoid bundling the request layer.
- **Inject `fetchImpl`** uniformly for proxy rerouting, logging, or mocking—see [Request Governance](/en/guide/request-governance).
