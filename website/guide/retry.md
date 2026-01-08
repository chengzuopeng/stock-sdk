# 错误处理与重试

Stock SDK 内置了完善的错误处理和自动重试机制，帮助你应对网络不稳定场景。

## 默认行为

SDK 默认启用以下重试策略：

| 配置项 | 默认值 | 说明 |
|-------|-------|------|
| `maxRetries` | 3 | 最大重试次数 |
| `baseDelay` | 1000ms | 初始退避延迟 |
| `maxDelay` | 30000ms | 最大退避延迟 |
| `backoffMultiplier` | 2 | 退避系数 |

### 自动重试的错误类型

| 错误类型 | 是否重试 |
|---------|---------|
| 请求超时 | ✅ 重试 |
| 网络错误（DNS/连接失败） | ✅ 重试 |
| HTTP 408 (Request Timeout) | ✅ 重试 |
| HTTP 429 (Too Many Requests) | ✅ 重试 |
| HTTP 500/502/503/504 (服务器错误) | ✅ 重试 |
| HTTP 400/401/403/404 (客户端错误) | ❌ 不重试 |

## 指数退避

当请求失败时，SDK 使用**指数退避**策略计算等待时间：

```
等待时间 = baseDelay × (backoffMultiplier ^ 重试次数)
```

**示例**（默认配置）：

| 重试次数 | 计算 | 等待时间 |
|---------|------|---------|
| 第 1 次 | 1000 × 2⁰ | ~1 秒 |
| 第 2 次 | 1000 × 2¹ | ~2 秒 |
| 第 3 次 | 1000 × 2² | ~4 秒 |

这种策略给服务器恢复时间，避免在服务器过载时持续发送请求。

## 自定义重试配置

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK({
  timeout: 10000,
  retry: {
    maxRetries: 5,           // 最多重试 5 次
    baseDelay: 500,          // 初始延迟 500ms
    maxDelay: 10000,         // 最大延迟 10 秒
    backoffMultiplier: 1.5,  // 退避系数 1.5
  }
});
```

## 禁用重试

某些场景下你可能希望禁用自动重试：

```typescript
const sdk = new StockSDK({
  retry: {
    maxRetries: 0  // 禁用重试
  }
});
```

## 重试回调

通过 `onRetry` 回调监听重试事件，用于日志记录或调试：

```typescript
const sdk = new StockSDK({
  retry: {
    onRetry: (attempt, error, delay) => {
      console.log(`第 ${attempt} 次重试`);
      console.log(`错误: ${error.message}`);
      console.log(`等待 ${Math.round(delay)}ms 后重试...`);
    }
  }
});
```

## 细粒度控制

### 仅对特定错误重试

```typescript
const sdk = new StockSDK({
  retry: {
    retryOnTimeout: true,      // 超时时重试
    retryOnNetworkError: false, // 网络错误不重试
    retryableStatusCodes: [503, 504], // 只对这些状态码重试
  }
});
```

## 错误处理

### HttpError

当服务器返回非 2xx 状态码时，SDK 抛出 `HttpError`：

```typescript
import { StockSDK, HttpError } from 'stock-sdk';

const sdk = new StockSDK();

try {
  const quotes = await sdk.getSimpleQuotes(['invalid_code']);
} catch (error) {
  if (error instanceof HttpError) {
    console.log(`HTTP 错误: ${error.status} ${error.statusText}`);
  } else {
    console.log(`其他错误: ${error.message}`);
  }
}
```

### 超时错误

超时错误表现为 `DOMException`，`name` 为 `AbortError`：

```typescript
try {
  const quotes = await sdk.getSimpleQuotes(['sh000001']);
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    console.log('请求超时');
  }
}
```

## 配置参考

### RetryOptions

| 属性 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `maxRetries` | `number` | `3` | 最大重试次数 |
| `baseDelay` | `number` | `1000` | 初始退避延迟（毫秒） |
| `maxDelay` | `number` | `30000` | 最大退避延迟（毫秒） |
| `backoffMultiplier` | `number` | `2` | 退避系数 |
| `retryableStatusCodes` | `number[]` | `[408, 429, 500, 502, 503, 504]` | 可重试的 HTTP 状态码 |
| `retryOnNetworkError` | `boolean` | `true` | 是否在网络错误时重试 |
| `retryOnTimeout` | `boolean` | `true` | 是否在超时时重试 |
| `onRetry` | `function` | - | 重试回调函数 |
