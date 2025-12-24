# 港股行情

## getHKQuotes

获取港股行情。

### 签名

```typescript
getHKQuotes(codes: string[]): Promise<HKQuote[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 港股代码数组，如 `['09988', '00700']` |

### 返回类型

```typescript
interface HKQuote {
  marketId: string;                    // 市场标识
  name: string;                        // 名称
  code: string;                        // 股票代码
  price: number;                       // 最新价
  prevClose: number;                   // 昨收
  open: number;                        // 今开
  volume: number;                      // 成交量
  time: string;                        // 时间
  change: number;                      // 涨跌额
  changePercent: number;               // 涨跌幅%
  high: number;                        // 最高
  low: number;                         // 最低
  amount: number;                      // 成交额
  lotSize: number | null;              // 每手股数
  circulatingMarketCap: number | null; // 流通市值(亿)
  totalMarketCap: number | null;       // 总市值(亿)
  currency: string;                    // 币种（如 HKD）
  raw: string[];                       // 原始字段数组
}
```

### 示例

```typescript
const quotes = await sdk.getHKQuotes(['00700', '09988']);

quotes.forEach(q => {
  console.log(`${q.name}: ${q.price} ${q.currency} (${q.changePercent}%)`);
});
// 腾讯控股: 380.00 HKD (1.50%)
// 阿里巴巴-W: 88.00 HKD (2.30%)
```

---

## 港股代码格式

港股代码为 5 位数字，前面补零：

| 股票 | 代码 |
|------|------|
| 腾讯控股 | `00700` |
| 阿里巴巴-W | `09988` |
| 美团-W | `03690` |
| 小米集团-W | `01810` |
| 香港交易所 | `00388` |
| 汇丰控股 | `00005` |
| 中国平安 | `02318` |

---

## getHKCodeList

获取全部港股代码列表。

### 签名

```typescript
getHKCodeList(): Promise<string[]>
```

### 示例

```typescript
const codes = await sdk.getHKCodeList();
// ['00700', '09988', '03690', ...]

console.log(`共 ${codes.length} 只港股`);
```

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

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `batchSize` | `number` | `500` | 单次请求股票数量 |
| `concurrency` | `number` | `7` | 最大并发数 |
| `onProgress` | `function` | - | 进度回调 |

### 示例

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
