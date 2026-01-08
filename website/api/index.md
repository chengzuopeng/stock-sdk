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

### 示例

```typescript
const sdk = new StockSDK({
  timeout: 10000,
  retry: {
    maxRetries: 5,
    baseDelay: 500,
    onRetry: (attempt, error, delay) => {
      console.log(`第 ${attempt} 次重试，等待 ${delay}ms`);
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
