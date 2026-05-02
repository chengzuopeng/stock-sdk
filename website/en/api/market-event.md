# Limit-Up Pool / Stock Changes

Six limit-up stock pools, 22 stock change types and board change details. Source: Eastmoney push2ex endpoints.

## getZTPool

Six pools available via the `type` parameter:

| `type` | Description |
|--------|-------------|
| `'zt'`        | Limit-up pool (default) |
| `'yesterday'` | Yesterday's limit-up |
| `'strong'`    | Strong stocks (60-day high or multiple recent limit-ups) |
| `'sub_new'`   | Sub-new stocks (listed within 1 year, broke straight limit-up) |
| `'broken'`    | Broken-board pool (touched limit-up, not currently sealed) |
| `'dt'`        | Limit-down pool |

### Signature

```typescript
getZTPool(type?: ZTPoolType, date?: string): Promise<ZTPoolItem[]>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | `ZTPoolType` | Default `'zt'` |
| `date` | `string` | `YYYYMMDD` or `YYYY-MM-DD`; default = today |

### Return type

```typescript
interface ZTPoolItem {
  code: string;
  name: string;
  price: number | null;                  // Already / 1000 scaled
  changePercent: number | null;
  limitPrice: number | null;
  amount: number | null;
  floatMarketValue: number | null;
  totalMarketValue: number | null;
  turnoverRate: number | null;
  continuousBoardCount: number | null;   // 'zt' pool only
  firstBoardTime: string | null;         // HH:MM:SS
  lastBoardTime: string | null;
  boardAmount: number | null;            // Sealed amount (limit-up pool)
  sealAmount: number | null;             // Sealed order amount (limit-down pool)
  failedCount: number | null;            // Broken-board count
  industry: string;
  ztStatistics: string;                  // '3/5' = 3 limit-ups in 5 days
  amplitude: number | null;
  speed: number | null;
}
```

### Example

```typescript
const ztPool = await sdk.getZTPool('zt');
console.log(`Limit-up today: ${ztPool.length}`);

const strong = ztPool.filter(s => (s.continuousBoardCount ?? 0) >= 3);
strong.forEach(s => {
  console.log(
    `${s.name}(${s.code}) ${s.continuousBoardCount}-day streak - ${s.industry}`
  );
});
```

---

## getStockChanges

Per-stock intraday changes across 22 categories.

### Signature

```typescript
getStockChanges(type?: StockChangeType): Promise<StockChangeItem[]>
```

### Change types

| Type | Label | Type | Label |
|------|-------|------|-------|
| `rocket_launch` | 火箭发射 | `large_sell` | 大笔卖出 |
| `quick_rebound` | 快速反弹 | `accelerate_down` | 加速下跌 |
| `large_buy` | 大笔买入 (default) | `high_dive` | 高台跳水 |
| `limit_up_seal` | 封涨停板 | `limit_down_seal` | 封跌停板 |
| `limit_down_open` | 打开跌停板 | `limit_up_open` | 打开涨停板 |
| `big_buy_order` | 有大买盘 | `big_sell_order` | 有大卖盘 |
| `auction_up` | 竞价上涨 | `auction_down` | 竞价下跌 |
| `high_open_5d` | 高开 5 日线 | `low_open_5d` | 低开 5 日线 |
| `gap_up` | 向上缺口 | `gap_down` | 向下缺口 |
| `high_60d` | 60 日新高 | `low_60d` | 60 日新低 |
| `surge_60d` | 60 日大幅上涨 | `drop_60d` | 60 日大幅下跌 |

### Return type

```typescript
interface StockChangeItem {
  time: string;                  // HH:MM:SS
  code: string;
  name: string;
  changeType: StockChangeType;
  changeTypeLabel: string;       // Chinese label
  info: string;
}
```

---

## getBoardChanges

Daily board change details.

### Signature

```typescript
getBoardChanges(): Promise<BoardChangeItem[]>
```

### Return type

```typescript
interface BoardChangeItem {
  name: string;
  changePercent: number | null;
  mainNetInflow: number | null;
  totalChangeCount: number | null;
  topStockCode: string;
  topStockName: string;
  topStockDirection: string;                  // 'large buy' / 'large sell'
  changeTypeDistribution: Record<string, number>;
}
```
