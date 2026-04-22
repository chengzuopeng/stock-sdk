# 港股行情

本页只说明港股实时行情接口。港股代码列表和全市场批量行情请分别查看 [代码列表](/api/code-lists) 和 [批量查询](/api/batch)。

## getHKQuotes

```ts
getHKQuotes(codes: string[]): Promise<HKQuote[]>
```

### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `codes` | `string[]` | 港股代码数组，如 `['00700', '09988']` |

### 返回类型

```ts
interface HKQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  prevClose: number;
  open: number;
  volume: number;
  time: string;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  amount: number;
  lotSize: number | null;
  circulatingMarketCap: number | null;
  totalMarketCap: number | null;
  currency: string;
  raw: string[];
}
```

### 示例

```ts
const quotes = await sdk.getHKQuotes(['00700', '09988']);

quotes.forEach((item) => {
  console.log(`${item.name}: ${item.price} ${item.currency}`);
});
```

## 代码格式

- 港股代码使用 5 位数字，例如 `00700`
- SDK 不要求你手动补交易所前缀

## 相关页面

- [代码列表](/api/code-lists)
- [批量查询](/api/batch)
- [港股 K 线](/api/kline)
