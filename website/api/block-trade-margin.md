# 大宗交易 / 融资融券

提供大宗交易市场总览、明细、按股汇总，以及融资融券账户统计、标的明细数据。

## 大宗交易

### getBlockTradeMarketStat

获取大宗交易市场每日总览（按日聚合的市场宏观数据）。

```typescript
getBlockTradeMarketStat(): Promise<BlockTradeMarketStatItem[]>

interface BlockTradeMarketStatItem {
  date: string;                       // YYYY-MM-DD
  shClose: number | null;             // 上证收盘
  shChangePercent: number | null;
  totalAmount: number | null;         // 大宗交易总成交额(元)
  premiumAmount: number | null;       // 溢价成交额
  premiumRatio: number | null;
  discountAmount: number | null;      // 折价成交额
  discountRatio: number | null;
}
```

#### 示例

```typescript
const stat = await sdk.getBlockTradeMarketStat();
stat.slice(0, 5).forEach(s => {
  console.log(
    `${s.date} 总额 ${s.totalAmount}，溢价占比 ${s.premiumRatio}%，折价占比 ${s.discountRatio}%`
  );
});
```

---

### getBlockTradeDetail

按日期范围获取大宗交易明细。

```typescript
getBlockTradeDetail(options?: {
  startDate?: string;   // YYYYMMDD 或 YYYY-MM-DD
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
  premiumRate: number | null;       // 溢价率 %（负值表示折价）
  buyBranch: string;                // 买方营业部
  sellBranch: string;               // 卖方营业部
}
```

#### 示例

```typescript
const detail = await sdk.getBlockTradeDetail({
  startDate: '20240101',
  endDate: '20240131',
});
const moutaiDeals = detail.filter(d => d.code === '600519');
moutaiDeals.forEach(d => {
  console.log(
    `${d.date} 茅台大宗 成交价 ${d.dealPrice}，溢价率 ${d.premiumRate}%`
  );
});
```

---

### getBlockTradeDailyStat

按股票汇总的大宗交易每日统计。

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
  dealCount: number | null;          // 成交笔数
  dealTotalAmount: number | null;    // 成交总额
  dealTotalVolume: number | null;    // 成交总量
  premiumAmount: number | null;
  discountAmount: number | null;
}
```

---

## 融资融券

### getMarginAccountInfo

融资融券账户统计（按日，市场宏观数据）。

```typescript
getMarginAccountInfo(): Promise<MarginAccountItem[]>

interface MarginAccountItem {
  date: string;
  finBalance: number | null;             // 融资余额(元)
  loanBalance: number | null;            // 融券余额(元)
  finBuyAmount: number | null;
  loanSellAmount: number | null;
  investorCount: number | null;          // 参与交易的投资者数量
  liabilityInvestorCount: number | null; // 有融资融券负债的投资者数量
  totalGuarantee: number | null;
  avgGuaranteeRatio: number | null;      // 平均维持担保比例 %
}
```

#### 示例

```typescript
const margin = await sdk.getMarginAccountInfo();
const latest = margin[0];
console.log(`最新融资余额: ${latest?.finBalance} 元`);
console.log(`平均维保比例: ${latest?.avgGuaranteeRatio}%`);

// 计算近 30 日融资余额变化
const last30 = margin.slice(0, 30);
const delta = (last30[0]?.finBalance ?? 0) - (last30.at(-1)?.finBalance ?? 0);
console.log(`30 日融资余额变化: ${delta} 元`);
```

---

### getMarginTargetList

融资融券标的明细，可按指定交易日筛选。

```typescript
getMarginTargetList(date?: string): Promise<MarginTargetItem[]>

interface MarginTargetItem {
  code: string;
  name: string;
  date: string;
  finBalance: number | null;        // 融资余额(元)
  finBuyAmount: number | null;      // 融资买入额
  finRepayAmount: number | null;    // 融资偿还额
  loanBalance: number | null;       // 融券余量(股)
  loanSellVolume: number | null;
  loanRepayVolume: number | null;
}
```

#### 示例

```typescript
// 默认服务端最新交易日
const targets = await sdk.getMarginTargetList();
console.log(`两融标的数量: ${targets.length}`);

// 按融资余额排序，找出加杠杆最高的 10 只
const top10 = targets
  .sort((a, b) => (b.finBalance ?? 0) - (a.finBalance ?? 0))
  .slice(0, 10);
top10.forEach((t, idx) => {
  console.log(`#${idx + 1} ${t.name}(${t.code}) 融资余额: ${t.finBalance} 元`);
});

// 查询指定日期
const jan15 = await sdk.getMarginTargetList('2024-01-15');
```
