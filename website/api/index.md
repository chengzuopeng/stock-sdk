# API 概览

本页帮助你快速定位 Stock SDK 的功能模块和具体接口。

## SDK 初始化

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK(options?);
```

### 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `baseUrl` | `string` | `'https://qt.gtimg.cn'` | 腾讯行情请求地址（可替换为代理） |
| `timeout` | `number` | `30000` | 请求超时时间（毫秒） |
| `retry` | `RetryOptions` | 见下表 | 重试配置 |
| `headers` | `Record<string, string>` | - | 自定义请求头 |
| `userAgent` | `string` | - | 自定义 User-Agent（浏览器环境可能会被忽略） |
| `rateLimit` | `RateLimitOptions` | - | 限流配置（防止请求过快被频控） |
| `rotateUserAgent` | `boolean` | `false` | 是否启用 UA 轮换（仅 Node.js 有效） |
| `circuitBreaker` | `CircuitBreakerOptions` | - | 熔断器配置（连续失败时暂停请求） |

### 重试配置 (RetryOptions)

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `maxRetries` | `number` | `3` | 最大重试次数 |
| `baseDelay` | `number` | `1000` | 初始退避延迟（毫秒） |
| `maxDelay` | `number` | `30000` | 最大退避延迟（毫秒） |
| `backoffMultiplier` | `number` | `2` | 退避系数 |
| `retryableStatusCodes` | `number[]` | `[408, 429, 500, 502, 503, 504]` | 可重试的 HTTP 状态码 |
| `retryOnNetworkError` | `boolean` | `true` | 网络错误时是否重试 |
| `retryOnTimeout` | `boolean` | `true` | 超时时是否重试 |
| `onRetry` | `function` | - | 重试回调 `(attempt, error, delay) => void` |

### 限流配置 (RateLimitOptions)

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `requestsPerSecond` | `number` | `5` | 每秒最大请求数 |
| `maxBurst` | `number` | `= requestsPerSecond` | 令牌桶容量（允许的突发请求数） |

::: tip 限流建议
建议配置 `requestsPerSecond: 3~5`，避免触发东方财富的频率限制。
:::

### 熔断器配置 (CircuitBreakerOptions)

::: warning 默认关闭
熔断器 **默认关闭**，需要显式配置才会启用。建议在生产环境中开启，防止连续失败导致雪崩效应。
:::

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| `failureThreshold` | `number` | `5` | 连续失败多少次后触发熔断 |
| `resetTimeout` | `number` | `30000` | 熔断持续时间（毫秒），之后进入半开状态 |
| `halfOpenRequests` | `number` | `1` | 半开状态允许的探测请求数 |
| `onStateChange` | `function` | - | 状态变化回调 `(from, to) => void` |

**熔断器状态说明：**
- **CLOSED**：正常状态，允许所有请求
- **OPEN**：熔断状态，拒绝所有请求，抛出 `CircuitBreakerError`
- **HALF_OPEN**：半开状态，允许少量请求探测服务是否恢复

### 完整配置示例

```typescript
const sdk = new StockSDK({
  timeout: 10000,
  headers: {
    'X-Request-Source': 'my-app',
  },
  userAgent: 'StockSDK/1.6',
  
  // 重试配置
  retry: {
    maxRetries: 5,
    baseDelay: 500,
    onRetry: (attempt, error, delay) => {
      console.log(`第 ${attempt} 次重试，等待 ${delay}ms`);
    }
  },
  
  // 限流配置（推荐开启）
  rateLimit: {
    requestsPerSecond: 5,
    maxBurst: 10,
  },
  
  // UA 轮换（仅 Node.js 有效）
  rotateUserAgent: true,
  
  // 熔断器配置（可选，建议生产环境开启）
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 30000,
    onStateChange: (from, to) => {
      console.log(`熔断器状态: ${from} -> ${to}`);
    }
  }
});
```

> 详细说明请参考 [错误处理与重试](/guide/retry)。


## 实时行情

- [A 股行情](/api/quotes)
- [港股行情](/api/hk-quotes)
- [美股行情](/api/us-quotes)
- [基金行情](/api/fund-quotes)

## K 线数据

- [历史 K 线](/api/kline)
- [分钟 K 线](/api/minute-kline)
- [分时走势](/api/timeline)

## 技术指标

- [指标概览](/api/indicators)
- [MA 均线](/api/indicator-ma)
- [MACD](/api/indicator-macd)
- [BOLL 布林带](/api/indicator-boll)
- [KDJ](/api/indicator-kdj)
- [RSI / WR](/api/indicator-rsi-wr)
- [BIAS 乖离率](/api/indicator-bias)
- [CCI 商品通道指数](/api/indicator-cci)
- [ATR 平均真实波幅](/api/indicator-atr)

## 行业板块

- [行业板块](/api/industry-board)

## 概念板块

- [概念板块](/api/concept-board)

## 批量与扩展

- [代码列表](/api/code-lists)
- [搜索](/api/search)
- [批量查询](/api/batch)
- [扩展数据](/api/fund-flow)（资金流向、交易日历等）
- [分红派送](/api/dividend)
