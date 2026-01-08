# Error Handling & Retry

Stock SDK includes built-in error handling and automatic retry mechanisms to help you handle unstable network conditions.

## Default Behavior

SDK enables the following retry strategy by default:

| Option | Default | Description |
|--------|---------|-------------|
| `maxRetries` | 3 | Maximum retry attempts |
| `baseDelay` | 1000ms | Initial backoff delay |
| `maxDelay` | 30000ms | Maximum backoff delay |
| `backoffMultiplier` | 2 | Backoff multiplier |

### Error Types That Trigger Retry

| Error Type | Retry? |
|------------|--------|
| Request Timeout | ✅ Yes |
| Network Error (DNS/Connection) | ✅ Yes |
| HTTP 408 (Request Timeout) | ✅ Yes |
| HTTP 429 (Too Many Requests) | ✅ Yes |
| HTTP 500/502/503/504 (Server Errors) | ✅ Yes |
| HTTP 400/401/403/404 (Client Errors) | ❌ No |

## Exponential Backoff

When a request fails, SDK uses **exponential backoff** to calculate wait time:

```
delay = baseDelay × (backoffMultiplier ^ attempt)
```

**Example** (default config):

| Attempt | Calculation | Wait Time |
|---------|-------------|-----------|
| 1st | 1000 × 2⁰ | ~1 second |
| 2nd | 1000 × 2¹ | ~2 seconds |
| 3rd | 1000 × 2² | ~4 seconds |

This strategy gives the server time to recover, avoiding continuous requests during overload.

## Custom Retry Configuration

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK({
  timeout: 10000,
  retry: {
    maxRetries: 5,           // Max 5 retries
    baseDelay: 500,          // Initial delay 500ms
    maxDelay: 10000,         // Max delay 10 seconds
    backoffMultiplier: 1.5,  // Backoff multiplier 1.5
  }
});
```

## Disable Retry

In some cases, you may want to disable automatic retry:

```typescript
const sdk = new StockSDK({
  retry: {
    maxRetries: 0  // Disable retry
  }
});
```

## Retry Callback

Use `onRetry` callback to monitor retry events for logging or debugging:

```typescript
const sdk = new StockSDK({
  retry: {
    onRetry: (attempt, error, delay) => {
      console.log(`Retry attempt ${attempt}`);
      console.log(`Error: ${error.message}`);
      console.log(`Waiting ${Math.round(delay)}ms before retry...`);
    }
  }
});
```

## Fine-grained Control

### Retry Only on Specific Errors

```typescript
const sdk = new StockSDK({
  retry: {
    retryOnTimeout: true,       // Retry on timeout
    retryOnNetworkError: false, // Don't retry on network error
    retryableStatusCodes: [503, 504], // Only retry on these status codes
  }
});
```

## Error Handling

### HttpError

When server returns a non-2xx status code, SDK throws `HttpError`:

```typescript
import { StockSDK, HttpError } from 'stock-sdk';

const sdk = new StockSDK();

try {
  const quotes = await sdk.getSimpleQuotes(['invalid_code']);
} catch (error) {
  if (error instanceof HttpError) {
    console.log(`HTTP Error: ${error.status} ${error.statusText}`);
  } else {
    console.log(`Other Error: ${error.message}`);
  }
}
```

### Timeout Error

Timeout errors appear as `DOMException` with `name` set to `AbortError`:

```typescript
try {
  const quotes = await sdk.getSimpleQuotes(['sh000001']);
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    console.log('Request timed out');
  }
}
```

## Configuration Reference

### RetryOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `baseDelay` | `number` | `1000` | Initial backoff delay (ms) |
| `maxDelay` | `number` | `30000` | Maximum backoff delay (ms) |
| `backoffMultiplier` | `number` | `2` | Backoff multiplier |
| `retryableStatusCodes` | `number[]` | `[408, 429, 500, 502, 503, 504]` | HTTP status codes to retry |
| `retryOnNetworkError` | `boolean` | `true` | Retry on network errors |
| `retryOnTimeout` | `boolean` | `true` | Retry on timeout |
| `onRetry` | `function` | - | Retry callback function |
