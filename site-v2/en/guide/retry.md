# Error Handling & Retry

v2 throws **a single error type**: `SdkError`. Network failures, timeouts, HTTP 4xx/5xx, upstream empty / structured errors, invalid arguments / symbols, and circuit-breaker short-circuits are all normalized into an `SdkError` (or a subclass) carrying a `code`. You no longer need to distinguish bare `TypeError` / `DOMException`.

The error types and helpers are exported from the `stock-sdk/errors` subpath:

```ts
import { SdkError, getSdkErrorCode, isSdkError } from 'stock-sdk/errors'
```

## SdkError

The base class for every SDK error. Key fields:

| Field | Type | Description |
|---|---|---|
| `code` | `SdkErrorCode` | Standard error code (table below) — **prefer this for branching** |
| `message` | `string` | Human-readable description |
| `provider` | `ProviderName?` | The data source that raised the error |
| `url` | `string?` | The request URL that failed |
| `status` | `number?` | HTTP status code, for HTTP errors |
| `details` | `Record<string, unknown>?` | Extra context (e.g. `statusText` / `symbol` / `timeout`) |
| `cause` | `unknown?` | The underlying error, if any |

```ts
import { SdkError } from 'stock-sdk/errors'

try {
  const q = await sdk.quotes.cn(['600519'])
} catch (e) {
  if (e instanceof SdkError) {
    console.error(e.code, e.message, e.provider, e.status)
  }
}
```

## Error codes

`SdkErrorCode` is a string-literal union covering every failure case in the request and contract layers:

| Code | Meaning | Retried by default? |
|---|---|---|
| `NETWORK_ERROR` | Network-layer failure (DNS / connection / bare `TypeError`) | Yes (`retryOnNetworkError`) |
| `TIMEOUT` | Internal timeout (`timeout` reached) | Yes (`retryOnTimeout`) |
| `ABORTED` | **Cancelled by an external `signal`** (distinct from timeout) | No |
| `HTTP_ERROR` | HTTP non-2xx (other than 429) | If status is retryable (`retryableStatusCodes`) |
| `RATE_LIMITED` | HTTP 429 (throttled upstream) | If 429 is in `retryableStatusCodes` (default: yes) |
| `CIRCUIT_OPEN` | Circuit breaker open, request short-circuited | No |
| `UPSTREAM_EMPTY` | Upstream returned **empty data** | No |
| `UPSTREAM_ERROR` | Upstream returned a **structured error** (`code != 0` / with `msg`) | No |
| `PARSE_ERROR` | Response could not be parsed | No |
| `INVALID_SYMBOL` | A symbol / code could not be resolved | No |
| `INVALID_ARGUMENT` | Invalid argument (range / type) | No |
| `NOT_FOUND` | Resource does not exist | No |

> v2 adds **two codes** over v1: `ABORTED` (external cancellation, distinct from the internal `TIMEOUT`) and `UPSTREAM_ERROR` (structured upstream error, distinct from the empty-data `UPSTREAM_EMPTY`).

## Error subclasses

`SdkError` has several semantic subclasses that set the matching `code` automatically. You can branch with either `instanceof` or `code`.

| Subclass | `code` | When |
|---|---|---|
| `HttpError` | `HTTP_ERROR` / `RATE_LIMITED` (429) | HTTP non-2xx, carries `status` / `statusText` |
| `UpstreamEmptyError` | `UPSTREAM_EMPTY` | Upstream returned empty data |
| `UpstreamError` | `UPSTREAM_ERROR` | Upstream structured error |
| `NotFoundError` | `NOT_FOUND` | Resource not found |
| `InvalidArgumentError` | `INVALID_ARGUMENT` | Invalid argument |
| `InvalidSymbolError` | `INVALID_SYMBOL` | Invalid symbol (`details.symbol` holds the raw input) |
| `AbortedError` | `ABORTED` | Cancelled by an external signal |
| `CircuitBreakerError` | `CIRCUIT_OPEN` | Circuit breaker open |

```ts
import { HttpError, isSdkError } from 'stock-sdk/errors'

try {
  await sdk.kline.cn('600519', { period: 'day' })
} catch (e) {
  if (e instanceof HttpError) {
    console.error(`HTTP ${e.status} ${e.statusText}`)
  } else if (isSdkError(e)) {
    console.error(e.code, e.message)
  }
}
```

## getSdkErrorCode

Reads the standard error code off any error, returning `SdkErrorCode | undefined`. It's more robust than `instanceof`: it recognizes `SdkError` and `HttpError`, reads `sdkCode` off network errors that were annotated with metadata, maps abort-shaped `DOMException`s to `TIMEOUT`, and falls back to `NETWORK_ERROR` for bare `TypeError`s.

```ts
import { getSdkErrorCode } from 'stock-sdk/errors'

try {
  await sdk.quotes.cn(['600519'])
} catch (e) {
  switch (getSdkErrorCode(e)) {
    case 'RATE_LIMITED':
      // throttled: back off and retry
      break
    case 'INVALID_SYMBOL':
      // bad code: tell the user
      break
    case 'ABORTED':
      // user cancelled: swallow silently
      break
    case undefined:
      // not an SDK error (e.g. a bug in your own code)
      throw e
  }
}
```

`isSdkError(e)` is a convenient type guard for `e instanceof SdkError`; pair it with `getSdkErrorCode` to cover "give me a code even if it isn't an SdkError".

## Retry strategy

Retries happen **automatically** in the request layer, controlled by the `retry` (`RetryOptions`) you pass when constructing `StockSDK`, using exponential backoff. The full field table and config examples live in [Request Governance · Retry](/en/guide/request-governance#retry).

**Which errors are retried** (by default):

- `NETWORK_ERROR` — when `retryOnNetworkError !== false`.
- `TIMEOUT` — when `retryOnTimeout !== false`.
- `HTTP_ERROR` / `RATE_LIMITED` — when the status matches `retryableStatusCodes` (default `[408, 429, 500, 502, 503, 504]`).

**Which errors are not retried** (retrying is pointless and only burns budget):

- `ABORTED` — the user cancelled; retrying defeats the intent.
- `CIRCUIT_OPEN` — the breaker is open; wait for cooldown instead of pushing through.
- `INVALID_SYMBOL` / `INVALID_ARGUMENT` / `NOT_FOUND` — argument / resource issues; the result won't change.
- `PARSE_ERROR` / `UPSTREAM_EMPTY` / `UPSTREAM_ERROR` — upstream data issues; retrying is equally fruitless.

Backoff is roughly `baseDelay × backoffMultiplier^(attempt-1)`, capped by `maxDelay`. Before each retry, both `RetryOptions.onRetry(attempt, error, delay)` and the client-level `hooks.onRetry(ctx, error, delay)` fire (see [Request Governance · hooks](/en/guide/request-governance#new-in-v2-request-lifecycle-hooks)).

```ts
const sdk = new StockSDK({
  retry: {
    maxRetries: 4,
    baseDelay: 500,
    retryableStatusCodes: [429, 500, 502, 503, 504],
    onRetry: (attempt, error, delay) =>
      console.warn(`Retry #${attempt} in ${delay}ms; reason ${error.message}`),
  },
})
```

### Application-level backoff

When the request layer exhausts its retries and still fails, it throws the last `SdkError` to the caller. If you want a longer backoff specifically for `RATE_LIMITED`, combine `getSdkErrorCode` with your own loop:

```ts
import { getSdkErrorCode } from 'stock-sdk/errors'

async function withBackoff<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (getSdkErrorCode(e) === 'RATE_LIMITED' && i < tries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** i))
        continue
      }
      throw e
    }
  }
  throw new Error('unreachable')
}

const q = await withBackoff(() => sdk.quotes.cn(['600519']))
```

## Practical guidance

- **Branch on `code`, not `message`**: the message text may change; `code` is the stable contract.
- **Prefer `getSdkErrorCode`**: it covers edge cases `instanceof` misses (e.g. native errors that were annotated with metadata).
- **Distinguish user cancellation from timeout**: `ABORTED` (external `signal`) ≠ `TIMEOUT` (internal timeout); the former should usually be swallowed.
- **Empty vs error**: `UPSTREAM_EMPTY` means "queried fine but no data", `UPSTREAM_ERROR` means "upstream explicitly errored" — handle them differently.

> The v2 SDK is still being implemented: the error-code set, subclasses, and the behaviour of `getSdkErrorCode` / `isSdkError` are stable; the **exact classification of individual throw sites is subject to the final implementation**.

## See also

- [Request Governance](/en/guide/request-governance) — full config for timeout / retry / rate limiting / circuit breaking / host fallback / hooks.
