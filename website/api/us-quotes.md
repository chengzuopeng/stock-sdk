# 美股行情

本页只说明美股实时行情接口。美股代码列表和全市场批量行情请查看 [代码列表](/api/code-lists) 和 [批量查询](/api/batch)。

## getUSQuotes

```ts
getUSQuotes(codes: string[]): Promise<USQuote[]>
```

### 参数

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `codes` | `string[]` | 美股代码数组，如 `['AAPL', 'MSFT', 'BABA']` |

### 返回类型

```ts
interface USQuote {
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
  turnoverRate: number | null;
  pe: number | null;
  amplitude: number | null;
  totalMarketCap: number | null;
  pb: number | null;
  high52w: number | null;
  low52w: number | null;
  raw: string[];
}
```

### 示例

```ts
const quotes = await sdk.getUSQuotes(['AAPL', 'MSFT', 'BABA']);

quotes.forEach((item) => {
  console.log(`${item.name}: $${item.price} (${item.changePercent}%)`);
});
```

## 代码格式

- 实时行情使用 `AAPL`、`MSFT` 这样的 ticker
- 历史 K 线使用 `{market}.{ticker}`，例如 `105.AAPL`、`106.BABA`

## 相关页面

- [代码列表](/api/code-lists)
- [批量查询](/api/batch)
- [历史 K 线](/api/kline)
