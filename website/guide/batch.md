# 批量查询

Stock SDK 支持批量获取股票代码列表和全市场行情数据，内置并发控制和进度回调。

## 获取股票代码列表

### A 股代码

```typescript
// 包含交易所前缀（默认）
const codes = await sdk.getAShareCodeList();
// ['sh600000', 'sz000001', 'bj430047', ...]

// 不包含交易所前缀
const pureCodes = await sdk.getAShareCodeList(false);
// ['600000', '000001', '430047', ...]

console.log(`共 ${codes.length} 只 A 股`);
// 共 5000+ 只 A 股
```

### 港股代码

```typescript
const codes = await sdk.getHKCodeList();
// ['00700', '09988', '03690', ...]

console.log(`共 ${codes.length} 只港股`);
```

### 美股代码

```typescript
// 包含市场前缀（默认）
const codes = await sdk.getUSCodeList();
// ['105.MSFT', '105.AAPL', '106.BABA', ...]

// 不包含市场前缀
const pureCodes = await sdk.getUSCodeList(false);
// ['MSFT', 'AAPL', 'BABA', ...]

console.log(`共 ${codes.length} 只美股`);
```

::: tip 市场代码说明
- `105` = 纳斯达克
- `106` = 纽交所
- `107` = 其他
:::

## 批量获取全市场行情

### 全市场 A 股行情

```typescript
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,     // 单次请求股票数量，默认 500
  concurrency: 5,     // 最大并发数，默认 7
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});

console.log(`共获取 ${allQuotes.length} 只股票`);

// 筛选涨幅前 10 的股票
const top10 = allQuotes
  .filter(q => q.changePercent !== null)
  .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
  .slice(0, 10);

top10.forEach(q => {
  console.log(`${q.name}: ${q.changePercent}%`);
});
```

### 全市场港股行情

```typescript
const allHKQuotes = await sdk.getAllHKShareQuotes({
  batchSize: 300,
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});

console.log(`共获取 ${allHKQuotes.length} 只港股`);
```

### 全市场美股行情

```typescript
const allUSQuotes = await sdk.getAllUSShareQuotes({
  batchSize: 300,
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});

console.log(`共获取 ${allUSQuotes.length} 只美股`);
```

## 批量获取指定股票

如果只需要获取指定 **A 股/指数** 列表的行情，可以使用 `getAllQuotesByCodes`：

```typescript
const myCodes = ['sz000858', 'sh600519', 'sh600000', 'sz000001', /* ... */];

const quotes = await sdk.getAllQuotesByCodes(myCodes, {
  batchSize: 100,
  concurrency: 2,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});

console.log(`共获取 ${quotes.length} 只股票`);
```

> 港股 / 美股请使用 `getAllHKShareQuotes` / `getAllUSShareQuotes`。

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `batchSize` | `number` | `500` | 单次请求股票数量，最大 500 |
| `concurrency` | `number` | `7` | 最大并发请求数 |
| `onProgress` | `(completed, total) => void` | - | 进度回调函数（按批次回调） |

## 性能优化建议

### 1. 调整批量大小

如果遇到超时或报错，可以减小 `batchSize`：

```typescript
const quotes = await sdk.getAllAShareQuotes({
  batchSize: 100,  // 减小批量大小
  concurrency: 3,  // 减少并发数
});
```

### 2. 错误重试

对于网络不稳定的环境，建议添加错误重试逻辑：

```typescript
async function getQuotesWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sdk.getAllAShareQuotes();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`第 ${i + 1} 次重试...`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

### 3. 定时更新

Node.js 环境下可以使用定时任务定期更新行情：

```typescript
import cron from 'node-cron';

// 每分钟更新一次（交易时间）
cron.schedule('* 9-15 * * 1-5', async () => {
  const quotes = await sdk.getAllAShareQuotes();
  // 保存到数据库或缓存
  await saveToDatabase(quotes);
});
```
