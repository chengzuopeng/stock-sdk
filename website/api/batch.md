# 批量查询

Stock SDK 提供批量行情查询与混合请求解析，内置并发控制和进度回调。

::: tip 代码列表
如需获取各市场代码列表，请查看 [代码列表](/api/code-lists)。
:::

## getAllAShareQuotes

获取全市场 A 股实时行情（5000+ 只股票）。

### 签名

```typescript
getAllAShareQuotes(options?: {
  market?: AShareMarket;
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<FullQuote[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `market` | `AShareMarket` | - | 筛选特定交易所或板块 |
| `batchSize` | `number` | `500` | 单次请求股票数量，最大 500 |
| `concurrency` | `number` | `7` | 最大并发数 |
| `onProgress` | `function` | - | 进度回调 |

### AShareMarket 类型

| 值 | 说明 | 代码特征 |
|----|------|----------|
| `'sh'` | 上交所 | 6 开头（包含科创板） |
| `'sz'` | 深交所 | 0 和 3 开头（包含创业板） |
| `'bj'` | 北交所 | 92 开头 |
| `'kc'` | 科创板 | 688 开头 |
| `'cy'` | 创业板 | 30 开头 |

::: tip 进度回调
`onProgress(completed, total)` 的计数是 **批次数量**，不是股票数量。
:::

### 示例

```typescript
// 获取全部 A 股行情
const allQuotes = await sdk.getAllAShareQuotes();

// 获取科创板行情
const kcQuotes = await sdk.getAllAShareQuotes({ market: 'kc' });

// 获取创业板行情（带进度回调）
const cyQuotes = await sdk.getAllAShareQuotes({
  market: 'cy',
  batchSize: 300,
  concurrency: 5,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
});

// 筛选涨幅前 10
const top10 = allQuotes
  .filter(q => q.changePercent !== null)
  .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
  .slice(0, 10);
```

---

## getAllQuotesByCodes

批量获取指定 **A 股/指数** 的全量行情。

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

> 港股 / 美股请使用 `getAllHKShareQuotes` / `getAllUSShareQuotes`。

---

## getAllHKShareQuotes

获取全市场港股实时行情。

### 签名

```typescript
getAllHKShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}): Promise<HKQuote[]>
```

### 示例

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

## getAllUSShareQuotes

获取全市场美股实时行情。

### 签名

```typescript
getAllUSShareQuotes(options?: {
  batchSize?: number;
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
  market?: 'NASDAQ' | 'NYSE' | 'AMEX';
}): Promise<USQuote[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `batchSize` | `number` | `500` | 单次请求的股票数量 |
| `concurrency` | `number` | `7` | 最大并发请求数 |
| `onProgress` | `function` | - | 进度回调函数 |
| `market` | `USMarket` | - | 筛选特定市场 |

### 示例

```typescript
// 获取全部美股行情
const allUSQuotes = await sdk.getAllUSShareQuotes();

// 获取纳斯达克股票行情
const nasdaqQuotes = await sdk.getAllUSShareQuotes({ market: 'NASDAQ' });

// 获取纽交所股票行情（带进度回调）
const nyseQuotes = await sdk.getAllUSShareQuotes({
  market: 'NYSE',
  batchSize: 300,
  concurrency: 3,
  onProgress: (completed, total) => {
    console.log(`进度: ${completed}/${total}`);
  },
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
