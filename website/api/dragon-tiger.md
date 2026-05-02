# 龙虎榜

提供 A 股龙虎榜数据：每日详情、个股统计、机构买卖、营业部排行、个股席位明细。

## getDragonTigerDetail

按日期范围获取龙虎榜详情。

### 签名

```typescript
getDragonTigerDetail(options: {
  startDate: string;   // YYYYMMDD
  endDate: string;     // YYYYMMDD
}): Promise<DragonTigerDetailItem[]>
```

### 返回类型

```typescript
interface DragonTigerDetailItem {
  code: string;
  name: string;
  date: string;
  close: number | null;
  changePercent: number | null;
  netBuyAmount: number | null;       // 龙虎榜净买额(元)
  buyAmount: number | null;
  sellAmount: number | null;
  dealAmount: number | null;
  totalAmount: number | null;        // 市场总成交额
  netBuyRatio: number | null;        // 净买额占总成交比 %
  dealAmountRatio: number | null;
  turnoverRate: number | null;
  floatMarketValue: number | null;
  reason: string;                    // 上榜原因
  afterChange1d: number | null;      // 上榜后 1 日涨跌幅 %
  afterChange2d: number | null;
  afterChange5d: number | null;
  afterChange10d: number | null;
}
```

### 示例

```typescript
const details = await sdk.getDragonTigerDetail({
  startDate: '20240101',
  endDate: '20240131',
});
console.log(`1 月共上榜 ${details.length} 次`);

// 按净买额排序
const topNet = details
  .sort((a, b) => (b.netBuyAmount ?? 0) - (a.netBuyAmount ?? 0))
  .slice(0, 10);
topNet.forEach(d => {
  console.log(`${d.date} ${d.name}(${d.code}) 净买入: ${d.netBuyAmount} 元`);
});
```

---

## getDragonTigerStockStats

按个股汇总的上榜统计。

### 签名

```typescript
getDragonTigerStockStats(period?: '1month' | '3month' | '6month' | '1year'): Promise<DragonTigerStockStatItem[]>
```

### 返回类型

```typescript
interface DragonTigerStockStatItem {
  code: string;
  name: string;
  latestDate: string;
  close: number | null;
  changePercent: number | null;
  count: number | null;                // 上榜次数
  totalBuyAmount: number | null;
  totalSellAmount: number | null;
  totalNetAmount: number | null;
  totalDealAmount: number | null;
  buyOrgCount: number | null;          // 累计买方机构次数
  sellOrgCount: number | null;
}
```

### 示例

```typescript
const stats = await sdk.getDragonTigerStockStats('3month');
const hotStocks = stats
  .filter(s => (s.count ?? 0) >= 5)
  .sort((a, b) => (b.totalNetAmount ?? 0) - (a.totalNetAmount ?? 0));
console.log(`近 3 月上榜 5 次以上的有 ${hotStocks.length} 只`);
```

---

## getDragonTigerInstitution

按日期范围获取机构买卖统计。

### 签名

```typescript
getDragonTigerInstitution(options: {
  startDate: string;
  endDate: string;
}): Promise<DragonTigerInstitutionItem[]>
```

### 返回类型

```typescript
interface DragonTigerInstitutionItem {
  code: string;
  name: string;
  date: string;
  close: number | null;
  changePercent: number | null;
  buyOrgCount: number | null;        // 买方机构数
  sellOrgCount: number | null;
  orgBuyAmount: number | null;
  orgSellAmount: number | null;
  orgNetAmount: number | null;
}
```

---

## getDragonTigerBranchRank

获取营业部排行榜。

### 签名

```typescript
getDragonTigerBranchRank(period?: '1month' | '3month' | '6month' | '1year'): Promise<DragonTigerBranchItem[]>
```

### 返回类型

```typescript
interface DragonTigerBranchItem {
  code: string;
  name: string;                      // 营业部名称
  totalBuyAmount: number | null;
  totalSellAmount: number | null;
  buyCount: number | null;
  sellCount: number | null;
  totalCount: number | null;
}
```

---

## getDragonTigerStockSeatDetail

获取个股某日上榜的席位明细（买入榜 + 卖出榜合并返回）。

### 签名

```typescript
getDragonTigerStockSeatDetail(symbol: string, date: string): Promise<DragonTigerSeatItem[]>
```

### 返回类型

```typescript
interface DragonTigerSeatItem {
  rank: number | null;
  branchName: string;
  buyAmount: number | null;
  buyAmountRatio: number | null;
  sellAmount: number | null;
  sellAmountRatio: number | null;
  netAmount: number | null;
  side: 'buy' | 'sell';              // 'buy' = 买入榜, 'sell' = 卖出榜
}
```

### 示例

```typescript
const seats = await sdk.getDragonTigerStockSeatDetail('600519', '20240115');

const buySide = seats.filter(s => s.side === 'buy');
const sellSide = seats.filter(s => s.side === 'sell');

console.log(`买方席位 (${buySide.length}):`);
buySide.forEach(s => console.log(`  ${s.branchName}: 买入 ${s.buyAmount} 元`));

console.log(`卖方席位 (${sellSide.length}):`);
sellSide.forEach(s => console.log(`  ${s.branchName}: 卖出 ${s.sellAmount} 元`));
```
