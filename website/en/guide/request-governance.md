# Request Governance

v2 consolidates the request layer — timeout, retry, rate limiting, circuit breaking, and host fallback — inside `RequestClient`, configured once when you construct `StockSDK`. Every governance feature works **globally** or can be overridden **per data source (provider)**. v2 also adds three composable extension points: `fetchImpl` (inject a custom fetch), `signal` (external cancellation), and request lifecycle `hooks` (observability).

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK({
  timeout: 8000,
  retry: { maxRetries: 3 },
  rateLimit: { requestsPerSecond: 5 },
})
```

> All governance config goes through the `new StockSDK(options)` constructor (i.e. `RequestClientOptions`). Every field is optional and falls back to a built-in default.

## Config layers and precedence

Governance is resolved in three layers, **nearest wins**:

1. **Global defaults**: the top-level constructor fields (`timeout` / `retry` / `rateLimit` / `circuitBreaker` / `headers` / `userAgent` / `rotateUserAgent`), applied to every provider.
2. **Per-provider**: `providerPolicies` overrides a single data source; providers not listed fall back to the global defaults. Merging is **shallow** — a provider policy only needs the fields you want to change; the rest are inherited.
3. **Per-request**: the internal request layer (`RequestClient.get`) supports per-call `fetchImpl` / `signal`, but **public namespace methods do not accept per-call options yet** — per-call cancellation/injection is on the 2.0.0 roadmap. For now use the client-level `signal` (which cancels all in-flight requests of the instance).

```ts
const sdk = new StockSDK({
  // global defaults
  timeout: 8000,
  retry: { maxRetries: 3, baseDelay: 1000 },
  // per-provider overrides
  providerPolicies: {
    eastmoney: {
      timeout: 12000,                       // this endpoint is slower — widen its timeout
      rateLimit: { requestsPerSecond: 3 },  // its own limit; everything else inherited
    },
    tencent: {
      retry: { maxRetries: 5 },             // two extra retries for this source
    },
  },
})
```

Known provider names: `tencent` / `eastmoney` / `sina` / `linkdiary` (unrecognized hosts map to `unknown`). The keys of `providerPolicies` are exactly these names.

## Timeout

`timeout` (milliseconds) caps how long a single request waits. It is enforced by an internal `AbortController` and surfaced as the error code `TIMEOUT` (distinct from external cancellation, which is `ABORTED`).

```ts
const sdk = new StockSDK({ timeout: 8000 }) // 8s globally
// per-provider override
new StockSDK({ providerPolicies: { eastmoney: { timeout: 12000 } } })
```

## Retry

Retry behaviour is described by `RetryOptions` and uses **exponential backoff**. By default, retryable failures include network errors, timeouts, and retryable HTTP status codes.

| Field | Description | Default |
|---|---|---|
| `maxRetries` | Maximum number of retries | `3` |
| `baseDelay` | Initial backoff (ms) | `1000` |
| `maxDelay` | Backoff ceiling (ms) | `30000` |
| `backoffMultiplier` | Backoff factor | `2` |
| `retryableStatusCodes` | Retryable HTTP status codes | `[408, 429, 500, 502, 503, 504]` |
| `retryOnNetworkError` | Retry on network errors | `true` |
| `retryOnTimeout` | Retry on timeout | `true` |
| `onRetry` | Pre-retry callback `(attempt, error, delay) => void` | — |

```ts
const sdk = new StockSDK({
  retry: {
    maxRetries: 4,
    baseDelay: 500,
    backoffMultiplier: 2,
    onRetry: (attempt, error, delay) => {
      console.warn(`Retry #${attempt} in ${delay}ms, reason: ${error.message}`)
    },
  },
})
```

> Backoff is roughly `baseDelay × backoffMultiplier^(attempt-1)`, capped by `maxDelay`. For error classification and which codes are retried, see [Error Handling & Retry](/en/guide/retry).

## Rate limiting

`rateLimit` uses a token-bucket algorithm to smooth out request rate and avoid being throttled upstream.

| Field | Description | Default |
|---|---|---|
| `requestsPerSecond` | Max requests per second | `5` |
| `maxBurst` | Bucket capacity (allowed burst) | equals `requestsPerSecond` |

```ts
const sdk = new StockSDK({
  rateLimit: { requestsPerSecond: 3, maxBurst: 6 },
})
```

When the bucket is empty, requests queue and wait rather than failing outright — rate limiting slows down, it does not reject.

## Circuit breaking

`circuitBreaker` short-circuits requests after consecutive failures, preventing you from hammering an already-unhealthy upstream (the avalanche effect). The state machine is `CLOSED → OPEN → HALF_OPEN`: once consecutive failures hit the threshold it goes `OPEN` (requests are rejected with `CIRCUIT_OPEN`); after a cooldown it moves to `HALF_OPEN` and lets a few probes through; a successful probe restores `CLOSED`.

| Field | Description | Default |
|---|---|---|
| `failureThreshold` | Consecutive failures to trip the breaker | `5` |
| `resetTimeout` | How long the breaker stays open (ms) | `30000` |
| `halfOpenRequests` | Probe requests allowed in half-open | `1` |
| `onStateChange` | State-change callback `(from, to) => void` | — |

```ts
const sdk = new StockSDK({
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
    onStateChange: (from, to) => console.warn(`Circuit: ${from} → ${to}`),
  },
})
```

While the breaker is open, requests fail immediately with the error code `CIRCUIT_OPEN` — no network call is made.

## Host fallback

Some data sources have multiple usable domains. When the primary host fails, the request layer automatically switches to the next candidate host and retries. This is transparent to the caller and is reported via `hooks.trace('fallback', ctx)` (see below). The host candidates and switching strategy are built into the request layer; no manual configuration is needed.

## New in v2: fetchImpl

`fetchImpl` lets you inject a custom `fetch` implementation for **proxying / mocking / request logging**. It defaults to the runtime global `fetch` (available in the browser and Node 18+).

```ts
const sdk = new StockSDK({
  fetchImpl: async (input, init) => {
    console.log('[fetch]', input)
    return fetch(input, init) // wrap with logging, then delegate
  },
})
```

- Typed as `typeof fetch`.
- Precedence: per-request > client-level `fetchImpl` > runtime global `fetch`.
- Even if the injected implementation throws a bare `TypeError`, the exit boundary normalizes it into an `SdkError` (see [Error Handling & Retry](/en/guide/retry)).

## New in v2: signal (external cancellation)

`signal` accepts an external `AbortSignal`; when it fires, the request is actively cancelled. It is **merged** with the internal timeout signal — whichever fires first aborts. Cancellation triggered by an external signal is classified as the error code `ABORTED` (distinct from `TIMEOUT`).

```ts
const controller = new AbortController()

const sdk = new StockSDK({ signal: controller.signal }) // client-level
// Note: namespace methods do not accept a per-call { signal } yet (roadmap item); a client-level abort cancels all in-flight requests of the instance

// somewhere later
controller.abort()
```

> Signal merging prefers the native `AbortSignal.any`; on Node 18.0–18.16 (where that API is missing) it falls back to a hand-rolled linkage and cleans up listeners after the request to avoid leaking long-lived signals. The SDK's Node baseline remains `>=18`.

## New in v2: request lifecycle hooks

`hooks` are **client-level** observability hooks for logging, metrics, and tracing. Every callback runs inside a `try/catch`, so **throwing inside a hook never affects the main request flow**.

```ts
interface RequestLifecycleContext {
  provider: ProviderName
  url: string
  timeout: number
  attempt: number
  responseType?: 'text' | 'json' | 'arraybuffer'
}

interface RequestHooks {
  onRequest?(ctx: RequestLifecycleContext): void
  onResponse?(ctx: RequestLifecycleContext, meta: { status: number; durationMs: number }): void
  onError?(ctx: RequestLifecycleContext, error: SdkError): void
  onRetry?(ctx: RequestLifecycleContext, error: SdkError, delay: number): void
  trace?(event: 'request' | 'response' | 'error' | 'retry' | 'fallback', ctx: RequestLifecycleContext): void
}
```

| Hook | When it fires |
|---|---|
| `onRequest` | Before each request is sent |
| `onResponse` | After a response arrives (with `status` and `durationMs`) |
| `onError` | When a request fails (error already normalized to `SdkError`) |
| `onRetry` | Before each retry (with this attempt's `delay`) |
| `trace` | Unified event stream: `request` / `response` / `error` / `retry` / `fallback` (host switch) |

```ts
const sdk = new StockSDK({
  hooks: {
    onRequest: (ctx) => console.log(`→ ${ctx.provider} ${ctx.url} (attempt ${ctx.attempt})`),
    onResponse: (ctx, meta) => console.log(`← ${meta.status} in ${meta.durationMs}ms`),
    onError: (ctx, err) => console.error(`✗ ${err.code}: ${err.message}`),
    trace: (event, ctx) => {
      if (event === 'fallback') console.warn(`host fallback on ${ctx.provider}`)
    },
  },
})
```

- `hooks` are client-level only (not part of per-request options, to keep those lean).
- `onRetry` is compatible with and reuses `RetryOptions.onRetry`; `hooks.onRetry` is the richer superset (it carries `ctx`).
- The `error` passed to `onError` / `onRetry` is already an `SdkError`, so you can read `error.code` directly.

## Compatibility with v1

- The legacy global `timeout` / `retry` / `rateLimit` / `circuitBreaker` config **still works** with unchanged semantics.
- `providerPolicies` is additive and orthogonal to the global config; omitting it has no effect.
- `fetchImpl` / `signal` / `hooks` are all optional and orthogonal to existing provider policies; the new fields don't break existing calls.

> Per-request options on namespace methods are not implemented yet (on the 2.0.0 roadmap); all client-level config fields and defaults above are stable.

## See also

- [Error Handling & Retry](/en/guide/retry) — `SdkError`, error codes, `getSdkErrorCode`, retry decisions.
- [Browser Usage](/en/guide/browser) — differences between cross-runtime fetch and JSONP.
