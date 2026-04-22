# Request Governance

Stock SDK now supports both global request governance and provider-specific overrides. Existing initialization code keeps working because `providerPolicies` only layers additional rules on top of the old defaults.

## Core Model

- Global `timeout`, `retry`, `rateLimit`, and `circuitBreaker` act as the default policy.
- `providerPolicies` only overrides a specific provider such as `tencent`, `eastmoney`, or `sina`.
- The same API works in browser and Node.js; capabilities like `rotateUserAgent` are mainly useful in Node.js.

## Global Configuration

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK({
  timeout: 8000,
  retry: {
    maxRetries: 3,
    baseDelay: 800,
  },
  rateLimit: {
    requestsPerSecond: 5,
    maxBurst: 10,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenRequests: 1,
  },
});
```

## providerPolicies Overrides

```ts
const sdk = new StockSDK({
  timeout: 8000,
  providerPolicies: {
    eastmoney: {
      timeout: 12000,
      rateLimit: {
        requestsPerSecond: 3,
        maxBurst: 3,
      },
      retry: {
        maxRetries: 5,
        baseDelay: 1200,
      },
      circuitBreaker: {
        failureThreshold: 4,
        resetTimeout: 45000,
        halfOpenRequests: 1,
      },
    },
    tencent: {
      timeout: 5000,
      rateLimit: {
        requestsPerSecond: 8,
        maxBurst: 16,
      },
    },
  },
});
```

## Common Types

### RateLimiterOptions

```ts
interface RateLimiterOptions {
  requestsPerSecond: number;
  maxBurst?: number;
}
```

### CircuitBreakerOptions

```ts
interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenRequests?: number;
  onStateChange?: (from: string, to: string) => void;
}
```

### ProviderRequestPolicy

```ts
interface ProviderRequestPolicy {
  timeout?: number;
  retry?: RetryOptions;
  rateLimit?: RateLimiterOptions;
  circuitBreaker?: CircuitBreakerOptions;
  headers?: Record<string, string>;
  userAgent?: string;
  rotateUserAgent?: boolean;
}
```

## Recommended Patterns

### Real-time Quotes First

For `getSimpleQuotes`, `getFullQuotes`, and `getHKQuotes`:

- Increase Tencent throughput
- Keep `timeout` short
- Use lightweight retries

### K-line and Board Data First

For Eastmoney-heavy workflows:

- Lower `RateLimiterOptions.requestsPerSecond`
- Increase `timeout`
- Configure dedicated `CircuitBreakerOptions` for `eastmoney`

## Backward Compatibility

This still works exactly as before:

```ts
const sdk = new StockSDK({
  timeout: 8000,
  retry: { maxRetries: 3 },
  rateLimit: { requestsPerSecond: 5 },
});
```

If you do not pass `providerPolicies`, the SDK behavior remains compatible with previous versions.

## Related Pages

- [Error Handling & Retry](/en/guide/retry)
- [Quick Start](/en/guide/getting-started)
- [API Overview](/en/api/)
