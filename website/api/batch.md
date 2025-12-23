# 批量查询

Stock SDK 提供批量获取股票代码和全市场行情的功能，内置并发控制和进度回调。

## getAShareCodeList

获取全部 A 股代码列表（沪市、深市、北交所 5000+ 只股票）。

### 签名

```typescript
getAShareCodeList(includeExchange?: boolean): Promise<string[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `includeExchange` | `boolean` | `true` | 是否包含交易所前缀 |

### 示例

```typescript
// 包含交易所前缀
const codes = await sdk.getAShareCodeList();
// ['sh600000', 'sz000001', 'bj430047', ...]

// 不包含交易所前缀
const pureCodes = await sdk.getAShareCodeList(false);
// ['600000', '000001', '430047', ...]
```

---

## getAllAShareQuotes

获取全市场 A 股实时行情（5000+ 只股票）。

### 签名

```typescript
getAllAShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<FullQuote[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `batchSize` | `number` | `500` | 单次请求股票数量，最大 500 |
| `concurrency` | `number` | `7` | 最大并发数 |
| `onProgress` | `function` | - | 进度回调 |

### 示例

```typescript
const allQuotes = await sdk.getAllAShareQuotes({
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});

console.log(`共获取 ${allQuotes.length} 只股票`);

// 筛选涨幅前 10
const top10 = allQuotes
  .filter(q => q.changePercent !== null)
  .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
  .slice(0, 10);
```

---

## getAllQuotesByCodes

批量获取指定股票的全量行情。

### 签名

```typescript
getAllQuotesByCodes(
  codes: string[],
  options?: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<FullQuote[]>
```

### 示例

```typescript
const myCodes = ['sz000858', 'sh600519', 'sh600000', 'sz000001'];

const quotes = await sdk.getAllQuotesByCodes(myCodes, {
  batchSize: 100,
  concurrency: 2,
});

console.log(`共获取 ${quotes.length} 只股票`);
```

---

## 港股代码和行情

### getHKCodeList

```typescript
const codes = await sdk.getHKCodeList();
// ['00700', '09988', '03690', ...]
```

### getAllHKShareQuotes

```typescript
const allHKQuotes = await sdk.getAllHKShareQuotes({
  batchSize: 300,
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});
```

---

## 美股代码和行情

### getUSCodeList

```typescript
// 包含市场前缀（默认）
const codes = await sdk.getUSCodeList();
// ['105.MSFT', '105.AAPL', '106.BABA', ...]

// 不包含市场前缀
const pureCodes = await sdk.getUSCodeList(false);
// ['MSFT', 'AAPL', 'BABA', ...]
```

### getAllUSShareQuotes

```typescript
const allUSQuotes = await sdk.getAllUSShareQuotes({
  batchSize: 300,
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});
```

---

## 性能优化建议

### 1. 调整参数应对网络问题

```typescript
// 网络不稳定时使用较小的 batchSize 和 concurrency
const quotes = await sdk.getAllAShareQuotes({
  batchSize: 100,
  concurrency: 3,
});
```

### 2. 错误重试

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

```typescript
// Node.js 环境下使用定时任务
import cron from 'node-cron';

// 每分钟更新一次（交易时间）
cron.schedule('* 9-15 * * 1-5', async () => {
  const quotes = await sdk.getAllAShareQuotes();
  await saveToDatabase(quotes);
});
```

---

## batchRaw

批量混合查询，返回原始解析结果。

### 签名

```typescript
batchRaw(params: string): Promise<{ key: string; fields: string[] }[]>
```

### 示例

```typescript
const raw = await sdk.batchRaw('sz000858,s_sh000001');

console.log(raw[0].key);     // sz000858
console.log(raw[0].fields);  // ['51', '五 粮 液', '000858', ...]
```

::: tip 提示
`batchRaw` 返回原始数据，适合需要自定义解析的高级场景。一般情况下建议使用 `getFullQuotes` 或 `getSimpleQuotes`。
:::

