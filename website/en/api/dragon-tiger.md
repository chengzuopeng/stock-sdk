# Dragon-Tiger List

A-share Dragon-Tiger List (龙虎榜) data: daily detail, stock stats, institution flow, branch ranking, per-stock seat detail.

## getDragonTigerDetail

Daily detail entries within a date range.

### Signature

```typescript
getDragonTigerDetail(options: {
  startDate: string;   // YYYYMMDD
  endDate: string;     // YYYYMMDD
}): Promise<DragonTigerDetailItem[]>
```

### Return type

```typescript
interface DragonTigerDetailItem {
  code: string;
  name: string;
  date: string;
  close: number | null;
  changePercent: number | null;
  netBuyAmount: number | null;       // Net buy amount on the list
  buyAmount: number | null;
  sellAmount: number | null;
  dealAmount: number | null;
  totalAmount: number | null;        // Market total turnover
  netBuyRatio: number | null;
  dealAmountRatio: number | null;
  turnoverRate: number | null;
  floatMarketValue: number | null;
  reason: string;
  afterChange1d: number | null;
  afterChange2d: number | null;
  afterChange5d: number | null;
  afterChange10d: number | null;
}
```

---

## getDragonTigerStockStats

Per-stock listing statistics over a period.

### Signature

```typescript
getDragonTigerStockStats(period?: '1month' | '3month' | '6month' | '1year'): Promise<DragonTigerStockStatItem[]>
```

### Return type

```typescript
interface DragonTigerStockStatItem {
  code: string;
  name: string;
  latestDate: string;
  close: number | null;
  changePercent: number | null;
  count: number | null;
  totalBuyAmount: number | null;
  totalSellAmount: number | null;
  totalNetAmount: number | null;
  totalDealAmount: number | null;
  buyOrgCount: number | null;
  sellOrgCount: number | null;
}
```

---

## getDragonTigerInstitution

Institution buy/sell statistics within a date range.

### Signature

```typescript
getDragonTigerInstitution(options: {
  startDate: string;
  endDate: string;
}): Promise<DragonTigerInstitutionItem[]>
```

### Return type

```typescript
interface DragonTigerInstitutionItem {
  code: string;
  name: string;
  date: string;
  close: number | null;
  changePercent: number | null;
  buyOrgCount: number | null;
  sellOrgCount: number | null;
  orgBuyAmount: number | null;
  orgSellAmount: number | null;
  orgNetAmount: number | null;
}
```

---

## getDragonTigerBranchRank

Brokerage branch ranking.

### Signature

```typescript
getDragonTigerBranchRank(period?: '1month' | '3month' | '6month' | '1year'): Promise<DragonTigerBranchItem[]>
```

### Return type

```typescript
interface DragonTigerBranchItem {
  code: string;
  name: string;
  totalBuyAmount: number | null;
  totalSellAmount: number | null;
  buyCount: number | null;
  sellCount: number | null;
  totalCount: number | null;
}
```

---

## getDragonTigerStockSeatDetail

Per-stock seat detail (buy + sell sides merged).

### Signature

```typescript
getDragonTigerStockSeatDetail(symbol: string, date: string): Promise<DragonTigerSeatItem[]>
```

### Return type

```typescript
interface DragonTigerSeatItem {
  rank: number | null;
  branchName: string;
  buyAmount: number | null;
  buyAmountRatio: number | null;
  sellAmount: number | null;
  sellAmountRatio: number | null;
  netAmount: number | null;
  side: 'buy' | 'sell';
}
```

### Example

```typescript
const seats = await sdk.getDragonTigerStockSeatDetail('600519', '20240115');

const buySide = seats.filter(s => s.side === 'buy');
const sellSide = seats.filter(s => s.side === 'sell');

console.log(`Buyers (${buySide.length}):`);
buySide.forEach(s => console.log(`  ${s.branchName}: ${s.buyAmount}`));
```
