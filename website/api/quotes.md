# A 股行情

## getFullQuotes

获取 A 股/指数全量行情数据。

### 签名

```typescript
getFullQuotes(codes: string[]): Promise<FullQuote[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 股票代码数组，如 `['sz000858', 'sh600519']` |

### 返回类型

```typescript
interface FullQuote {
  marketId: string;       // 市场标识
  name: string;           // 名称
  code: string;           // 股票代码
  price: number;          // 最新价
  prevClose: number;      // 昨收
  open: number;           // 今开
  high: number;           // 最高
  low: number;            // 最低
  volume: number;         // 成交量（手）
  outerVolume: number;    // 外盘
  innerVolume: number;    // 内盘
  bid: { price: number; volume: number }[];  // 买一~买五
  ask: { price: number; volume: number }[];  // 卖一~卖五
  time: string;           // 时间戳 yyyyMMddHHmmss
  change: number;         // 涨跌额
  changePercent: number;  // 涨跌幅 %
  volume2: number;        // 成交量（手，字段36）
  amount: number;         // 成交额（万）
  turnoverRate: number | null;   // 换手率 %
  pe: number | null;             // 市盈率（TTM）
  amplitude: number | null;      // 振幅 %
  circulatingMarketCap: number | null; // 流通市值（亿）
  totalMarketCap: number | null; // 总市值（亿）
  pb: number | null;             // 市净率
  limitUp: number | null;        // 涨停价
  limitDown: number | null;      // 跌停价
  volumeRatio: number | null;    // 量比
  avgPrice: number | null;       // 均价
  peStatic: number | null;       // 市盈率（静）
  peDynamic: number | null;      // 市盈率（动）
  high52w: number | null;        // 52周最高价
  low52w: number | null;         // 52周最低价
  circulatingShares: number | null; // 流通股本（股）
  totalShares: number | null;    // 总股本（股）
  raw: string[];                 // 原始字段数组（供扩展使用）
}
```

### 示例

```typescript
const quotes = await sdk.getFullQuotes(['sz000858']);

console.log(quotes[0].name);   // 五 粮 液
console.log(quotes[0].price);  // 111.70
console.log(quotes[0].changePercent);  // 2.35
console.log(quotes[0].pe);     // 25.5
console.log(quotes[0].totalMarketCap);  // 4500 (亿)
```

---

## getSimpleQuotes

获取简要行情（股票/指数）。

### 签名

```typescript
getSimpleQuotes(codes: string[]): Promise<SimpleQuote[]>
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `codes` | `string[]` | 代码数组，如 `['sz000858', 'sh000001']` |

### 返回类型

```typescript
interface SimpleQuote {
  marketId: string;
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  marketCap: number | null;
  marketType: string;
}
```

### 示例

```typescript
const quotes = await sdk.getSimpleQuotes(['sh000001', 'sz000858']);

quotes.forEach(q => {
  console.log(`${q.name}: ${q.price} (${q.changePercent}%)`);
});
// 上证指数: 3200.00 (0.50%)
// 五 粮 液: 150.00 (2.35%)
```

---

## 股票代码格式

| 交易所 | 前缀 | 示例 |
|--------|------|------|
| 上海 | `sh` | `sh600519`（贵州茅台） |
| 深圳 | `sz` | `sz000858`（五粮液） |
| 北交所 | `bj` | `bj430047` |

### 指数代码

| 指数 | 代码 |
|------|------|
| 上证指数 | `sh000001` |
| 深证成指 | `sz399001` |
| 创业板指 | `sz399006` |
| 沪深300 | `sh000300` |
| 中证500 | `sh000905` |

