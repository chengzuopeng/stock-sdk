# 快速开始

本指南将帮助你在几分钟内开始使用 Stock SDK。

## 安装

```bash
npm install stock-sdk
```

## 基础使用

### 1. 创建 SDK 实例

```typescript
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();
```

#### 可选配置

`StockSDK` 支持传入请求配置，适合设置代理、调整超时或自定义请求头：

```typescript
const sdk = new StockSDK({
  // 自定义腾讯行情请求地址（例如本地代理 /api/tencent）
  baseUrl: '/api/tencent',
  // 请求超时时间（毫秒）
  timeout: 8000,
  // 自定义请求头
  headers: {
    'X-Request-Source': 'my-app',
  },
  // 自定义 User-Agent（浏览器环境可能会被忽略）
  userAgent: 'StockSDK/1.4',
  // 重试配置（可选）
  retry: {
    maxRetries: 5,       // 最大重试次数
    baseDelay: 1000,     // 初始退避延迟
  },
  // 限流配置（防止请求过快被频控）
  rateLimit: {
    requestsPerSecond: 5, // 每秒最多 5 个请求
    maxBurst: 10,         // 允许的突发请求数
  },
  // 是否启用 UA 轮换（仅 Node.js 有效）
  rotateUserAgent: true,
});
```

> 建议在应用中复用同一个 `StockSDK` 实例，减少重复初始化。
> 
> 详细的重试配置请参考 [错误处理与重试](/guide/retry)。

::: tip 防频控建议
如果你遇到东方财富接口频繁返回错误，建议：
1. 配置 `rateLimit` 限制请求速率（推荐 3-5 次/秒）
2. 在 Node.js 环境下启用 `rotateUserAgent` 轮换 User-Agent
3. 对于批量请求，适当降低 `concurrency` 并发数
4. 配置 `circuitBreaker` 熔断器，连续失败时自动暂停请求
:::

#### 熔断器配置

当连续多次请求失败时，熔断器会自动暂停请求，避免雪崩效应：

```typescript
const sdk = new StockSDK({
  circuitBreaker: {
    failureThreshold: 5,   // 连续失败 5 次后触发熔断
    resetTimeout: 30000,   // 熔断 30 秒后尝试恢复
    halfOpenRequests: 1,   // 半开状态允许 1 个探测请求
    onStateChange: (from, to) => {
      console.log(`熔断器状态: ${from} -> ${to}`);
    }
  }
});
```

### 2. 获取股票行情

```typescript
// 获取简要行情
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858', 'sh600519']);

quotes.forEach(q => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});
// 上证指数: 3200.00 (0.50%)
// 五 粮 液: 150.00 (2.35%)
// 贵州茅台: 1800.00 (1.20%)
```

::: tip 代码格式
- **A 股/指数**：带交易所前缀（`sh`/`sz`/`bj`），如 `sh000001`、`sz000858`
- **港股**：5 位数字，如 `00700`
- **美股**：行情查询用 `AAPL`、`MSFT`；K 线查询用 `105.AAPL`、`106.BABA`
:::

### 3. 获取全量行情

```typescript
// 获取更详细的行情数据
const fullQuotes = await sdk.getFullQuotes(['sz000858']);

const quote = fullQuotes[0];
console.log(`
股票: ${quote.name} (${quote.code})
最新价: ${quote.price}
涨跌幅: ${quote.changePercent}%
成交量: ${quote.volume} 手
成交额: ${quote.amount} 万
换手率: ${quote.turnoverRate}%
市盈率: ${quote.pe}
总市值: ${quote.totalMarketCap} 亿
`);
```

### 4. 获取历史 K 线

```typescript
// 获取日 K 线（默认前复权）
const klines = await sdk.getHistoryKline('sz000858', {
  period: 'daily',
  startDate: '20240101',
  endDate: '20241231',
});

klines.forEach(k => {
  console.log(`${k.date}: 开 ${k.open} 高 ${k.high} 低 ${k.low} 收 ${k.close}`);
});
```

### 5. 获取带技术指标的 K 线

```typescript
const data = await sdk.getKlineWithIndicators('sz000858', {
  startDate: '20240101',
  endDate: '20241231',
  indicators: {
    ma: { periods: [5, 10, 20, 60] },
    macd: true,
    boll: true,
    kdj: true,
  }
});

data.forEach(k => {
  console.log(`${k.date}: 收盘 ${k.close}`);
  console.log(`  MA5=${k.ma?.ma5}, MA10=${k.ma?.ma10}`);
  console.log(`  MACD: DIF=${k.macd?.dif}, DEA=${k.macd?.dea}`);
  console.log(`  BOLL: 上=${k.boll?.upper}, 中=${k.boll?.mid}, 下=${k.boll?.lower}`);
  console.log(`  KDJ: K=${k.kdj?.k}, D=${k.kdj?.d}, J=${k.kdj?.j}`);
});
```

### 6. 获取资金流向（可选）

```typescript
const flows = await sdk.getFundFlow(['sz000858', 'sh600519']);
flows.forEach(f => {
  console.log(`${f.name}: 主力净流入 ${f.mainNet} 万`);
});
```

### 7. 获取当日分时走势（可选）

```typescript
const timeline = await sdk.getTodayTimeline('sz000001');
console.log(timeline.date, timeline.data[0]);
```

## 港股 & 美股

### 港股行情

```typescript
// 获取港股行情
const hkQuotes = await sdk.getHKQuotes(['00700', '09988']);
console.log(hkQuotes[0].name);  // 腾讯控股

// 获取港股 K 线
const hkKlines = await sdk.getHKHistoryKline('00700', {
  period: 'daily',
  startDate: '20240101',
});
```

### 美股行情

```typescript
// 获取美股行情
const usQuotes = await sdk.getUSQuotes(['AAPL', 'MSFT', 'BABA']);
console.log(usQuotes[0].name);  // 苹果

// 获取美股 K 线（需要使用 {market}.{ticker} 格式）
const usKlines = await sdk.getUSHistoryKline('105.MSFT', {
  period: 'daily',
  startDate: '20240101',
});
```

::: tip 美股代码格式
- `105` = 纳斯达克（如 `105.AAPL`、`105.MSFT`）
- `106` = 纽交所（如 `106.BABA`）
- `107` = 美国其他市场
:::

## 批量获取全市场行情

```typescript
// 获取全部 A 股代码
const codes = await sdk.getAShareCodeList();
console.log(`共 ${codes.length} 只股票`);
// 共 5000+ 只股票

// 获取全市场 A 股行情
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});
console.log(`共获取 ${allQuotes.length} 只股票`);
```

## 下一步

- 查看 [API 文档](/api/) 了解所有可用方法
- 尝试 [在线 Playground](/playground/) 交互式体验
- 了解 [技术指标](/guide/indicators) 的使用方法
