# Block Trade / Margin Trading

Block trade market summary, detail, per-stock aggregates, and margin trading account stats and target securities.

## Block Trade

### getBlockTradeMarketStat

Daily market overview of block trades.

```typescript
getBlockTradeMarketStat(): Promise<BlockTradeMarketStatItem[]>

interface BlockTradeMarketStatItem {
  date: string;
  shClose: number | null;
  shChangePercent: number | null;
  totalAmount: number | null;
  premiumAmount: number | null;
  premiumRatio: number | null;
  discountAmount: number | null;
  discountRatio: number | null;
}
```

---

### getBlockTradeDetail

Block trade entries within a date range.

```typescript
getBlockTradeDetail(options?: {
  startDate?: string;   // YYYYMMDD or YYYY-MM-DD
  endDate?: string;
}): Promise<BlockTradeDetailItem[]>

interface BlockTradeDetailItem {
  code: string;
  name: string;
  date: string;
  close: number | null;
  changePercent: number | null;
  dealPrice: number | null;
  dealVolume: number | null;
  dealAmount: number | null;
  premiumRate: number | null;       // negative = discount
  buyBranch: string;
  sellBranch: string;
}
```

#### Example

```typescript
const detail = await sdk.getBlockTradeDetail({
  startDate: '20240101',
  endDate: '20240131',
});
const moutaiDeals = detail.filter(d => d.code === '600519');
moutaiDeals.forEach(d => {
  console.log(
    `${d.date} Moutai block: price ${d.dealPrice}, premium ${d.premiumRate}%`
  );
});
```

---

### getBlockTradeDailyStat

Daily statistics aggregated by stock.

```typescript
getBlockTradeDailyStat(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<BlockTradeDailyStatItem[]>

interface BlockTradeDailyStatItem {
  code: string;
  name: string;
  date: string;
  changePercent: number | null;
  close: number | null;
  dealCount: number | null;
  dealTotalAmount: number | null;
  dealTotalVolume: number | null;
  premiumAmount: number | null;
  discountAmount: number | null;
}
```

---

## Margin Trading

### getMarginAccountInfo

Daily margin trading account statistics (market-wide aggregate).

```typescript
getMarginAccountInfo(): Promise<MarginAccountItem[]>

interface MarginAccountItem {
  date: string;
  finBalance: number | null;
  loanBalance: number | null;
  finBuyAmount: number | null;
  loanSellAmount: number | null;
  investorCount: number | null;
  liabilityInvestorCount: number | null;
  totalGuarantee: number | null;
  avgGuaranteeRatio: number | null;
}
```

---

### getMarginTargetList

Margin trading target securities, optionally filtered by date.

```typescript
getMarginTargetList(date?: string): Promise<MarginTargetItem[]>

interface MarginTargetItem {
  code: string;
  name: string;
  date: string;
  finBalance: number | null;
  finBuyAmount: number | null;
  finRepayAmount: number | null;
  loanBalance: number | null;
  loanSellVolume: number | null;
  loanRepayVolume: number | null;
}
```

#### Example

```typescript
const targets = await sdk.getMarginTargetList();
console.log(`Margin targets: ${targets.length}`);

const top10 = targets
  .sort((a, b) => (b.finBalance ?? 0) - (a.finBalance ?? 0))
  .slice(0, 10);
top10.forEach((t, idx) => {
  console.log(`#${idx + 1} ${t.name}(${t.code}) fin balance: ${t.finBalance}`);
});
```
