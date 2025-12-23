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
// 获取日 K 线（默认后复权）
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

- 查看 [API 文档](/api/quotes) 了解所有可用方法
- 尝试 [在线 Playground](/playground/) 交互式体验
- 了解 [技术指标](/guide/indicators) 的使用方法

