# 快速开始

本页展示最常见的接入方式。默认情况下，直接创建 `StockSDK` 实例即可；如果你需要更细的请求治理，可以按 provider 定制策略。

## 安装

```bash
npm install stock-sdk
```

## 创建实例

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();
```

## 可选配置

```ts
const sdk = new StockSDK({
  baseUrl: '/api/tencent',
  timeout: 8000,
  headers: {
    'X-Request-Source': 'quotes-dashboard',
  },
  userAgent: 'quotes-dashboard/1.0',
  retry: {
    maxRetries: 3,
    baseDelay: 800,
  },
  rateLimit: {
    requestsPerSecond: 5,
    maxBurst: 10,
  },
  rotateUserAgent: true,
  providerPolicies: {
    eastmoney: {
      timeout: 12000,
      rateLimit: {
        requestsPerSecond: 3,
        maxBurst: 3,
      },
      circuitBreaker: {
        failureThreshold: 4,
        resetTimeout: 45000,
        halfOpenRequests: 1,
      },
    },
  },
});
```

> 建议在应用内复用同一个实例。

## 获取实时行情

```ts
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519']);

quotes.forEach((item) => {
  console.log(`${item.name}: ${item.price} (${item.changePercent}%)`);
});
```

代码格式说明：

- A 股 / 指数：`sh000001`、`sz000858`、`bj430047`
- 港股：`00700`
- 美股行情：`AAPL`、`MSFT`
- 美股 K 线：`105.AAPL`、`106.BABA`

## 获取 K 线和指标

```ts
const data = await sdk.getKlineWithIndicators('sz000858', {
  startDate: '20240101',
  endDate: '20241231',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    obv: { maPeriod: 20 },
    sar: true,
  },
});

console.log(data[30].ma?.ma5);
console.log(data[30].macd?.dif);
console.log(data[30].obv?.obvMa);
console.log(data[30].sar?.sar);
```

## 获取全市场数据

```ts
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`批次进度: ${completed}/${total}`);
  },
});

console.log(allQuotes.length);
```

## 港股和美股

```ts
const hkQuotes = await sdk.getHKQuotes(['00700', '09988']);
const usQuotes = await sdk.getUSQuotes(['AAPL', 'MSFT']);

const hkKlines = await sdk.getHKHistoryKline('00700', {
  period: 'daily',
  startDate: '20240101',
});

const usKlines = await sdk.getUSHistoryKline('105.MSFT', {
  period: 'daily',
  startDate: '20240101',
});
```

## 期货和期权

```ts
const futures = await sdk.getFuturesKline('RBM', {
  period: 'daily',
  startDate: '20250101',
});

const optionSpot = await sdk.getIndexOptionSpot('io', 'io2504');

console.log(futures[0]?.close);
console.log(optionSpot.calls[0]?.symbol);
```

## 分红和交易日历

```ts
const dividends = await sdk.getDividendDetail('600519');
const calendar = await sdk.getTradingCalendar();

console.log(dividends[0]?.assignProgress);
console.log(calendar[0]?.date, calendar[0]?.isOpen);
```

## 下一步

- [请求治理](/guide/request-governance)
- [技术指标](/guide/indicators)
- [期货与期权](/guide/futures-options)
- [分红与交易日历](/guide/dividend-calendar)
- [API 总览](/api/)
