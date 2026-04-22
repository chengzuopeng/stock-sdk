# 请求治理

Stock SDK 现已支持全局请求治理和按 provider 的细粒度覆盖。旧的初始化方式仍然可用，新增能力通过 `providerPolicies` 叠加，不会破坏已有 API。

## 核心思路

- 全局 `timeout`、`retry`、`rateLimit`、`circuitBreaker` 作为默认策略。
- `providerPolicies` 只覆盖指定数据源，例如 `tencent`、`eastmoney`、`sina`。
- 浏览器和 Node.js 使用同一套接口；仅 `rotateUserAgent` 这类能力在 Node.js 下更有意义。

## 全局配置

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

## providerPolicies 覆盖策略

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

## 常用类型

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

## 推荐策略

### 实时行情优先

适合 `getSimpleQuotes`、`getFullQuotes`、`getHKQuotes` 这类低延迟场景：

- 腾讯链路提高 `requestsPerSecond`
- 保持较短 `timeout`
- 只做轻量重试

### K 线和板块优先

适合东方财富链路：

- 降低 `RateLimiterOptions.requestsPerSecond`
- 提高 `timeout`
- 为 `eastmoney` 单独配置 `CircuitBreakerOptions`

## 与旧代码兼容

以下代码仍然完全可用：

```ts
const sdk = new StockSDK({
  timeout: 8000,
  retry: { maxRetries: 3 },
  rateLimit: { requestsPerSecond: 5 },
});
```

如果不传 `providerPolicies`，SDK 行为与旧版本保持一致。

## 相关页面

- [错误处理与重试](/guide/retry)
- [快速开始](/guide/getting-started)
- [API 总览](/api/)
