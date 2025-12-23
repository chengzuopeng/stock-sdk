# 美股行情

## getUSQuotes

获取美股行情。

### 签名

```typescript
getUSQuotes(codes: string[]): Promise<USQuote[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 美股代码数组，如 `['AAPL', 'MSFT', 'BABA']` |

### 返回类型

```typescript
interface USQuote {
  marketId: string;              // 市场标识
  name: string;                  // 名称
  code: string;                  // 股票代码
  price: number;                 // 最新价
  prevClose: number;             // 昨收
  open: number;                  // 今开
  volume: number;                // 成交量
  time: string;                  // 时间
  change: number;                // 涨跌额
  changePercent: number;         // 涨跌幅%
  high: number;                  // 最高
  low: number;                   // 最低
  amount: number;                // 成交额
  turnoverRate: number | null;   // 换手率%
  pe: number | null;             // 市盈率
  amplitude: number | null;      // 振幅%
  totalMarketCap: number | null; // 总市值(亿)
  pb: number | null;             // 市净率
  high52w: number | null;        // 52周最高价
  low52w: number | null;         // 52周最低价
  raw: string[];                 // 原始字段数组
}
```

### 示例

```typescript
const quotes = await sdk.getUSQuotes(['AAPL', 'MSFT', 'BABA']);

quotes.forEach(q => {
  console.log(`${q.name}: $${q.price} (${q.changePercent}%)`);
  console.log(`  52周最高: $${q.high52w}, 52周最低: $${q.low52w}`);
});
// 苹果: $180.00 (1.20%)
//   52周最高: $199.62, 52周最低: $164.08
```

---

## 美股代码格式

### 行情查询

查询行情时，直接使用股票代码：

```typescript
const quotes = await sdk.getUSQuotes(['AAPL', 'MSFT', 'GOOGL']);
```

### K 线查询

查询 K 线时，需要使用 `{市场代码}.{股票代码}` 格式：

| 市场 | 代码 | 示例 |
|------|------|------|
| 纳斯达克 | `105` | `105.AAPL`、`105.MSFT`、`105.TSLA` |
| 纽交所 | `106` | `106.BABA` |
| 其他 | `107` | `107.XXX` |

```typescript
// K 线需要指定市场代码
const klines = await sdk.getUSHistoryKline('105.MSFT');
const klines2 = await sdk.getUSHistoryKline('106.BABA');
```

---

## getUSCodeList

获取全部美股代码列表。

### 签名

```typescript
getUSCodeList(includeMarket?: boolean): Promise<string[]>
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `includeMarket` | `boolean` | `true` | 是否包含市场前缀（如 `105.`） |

### 示例

```typescript
// 包含市场前缀（默认）
const codes = await sdk.getUSCodeList();
// ['105.MSFT', '105.AAPL', '106.BABA', ...]

// 不包含市场前缀
const pureCodes = await sdk.getUSCodeList(false);
// ['MSFT', 'AAPL', 'BABA', ...]

console.log(`共 ${codes.length} 只美股`);
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
}): Promise<USQuote[]>
```

### 示例

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

---

## 常见美股代码

| 公司 | 代码 | 市场 |
|------|------|------|
| 苹果 | `AAPL` | 纳斯达克 |
| 微软 | `MSFT` | 纳斯达克 |
| 谷歌 | `GOOGL` | 纳斯达克 |
| 亚马逊 | `AMZN` | 纳斯达克 |
| 特斯拉 | `TSLA` | 纳斯达克 |
| 英伟达 | `NVDA` | 纳斯达克 |
| Meta | `META` | 纳斯达克 |
| 阿里巴巴 | `BABA` | 纽交所 |
| 京东 | `JD` | 纳斯达克 |
| 拼多多 | `PDD` | 纳斯达克 |

