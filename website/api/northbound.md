# 沪深港通 / 北向资金

提供北向资金（沪股通 + 深股通）和南向资金（港股通沪深）的分时、汇总、持股排行、历史与个股持仓数据。

::: tip 浏览器兼容
全部接口均直接调用东方财富开放数据，浏览器无 CORS 限制，可直接前端调用。
:::

## getNorthboundMinute

获取北向 / 南向资金当日分时数据（每分钟一个点）。

### 签名

```typescript
getNorthboundMinute(direction?: 'north' | 'south'): Promise<NorthboundMinuteItem[]>
```

### 返回类型

```typescript
interface NorthboundMinuteItem {
  date: string;                       // YYYY-MM-DD
  time: string;                       // HH:MM
  shanghaiNetInflow: number | null;   // 沪股通 / 港股通(沪) 净流入(万元)
  shenzhenNetInflow: number | null;   // 深股通 / 港股通(深) 净流入(万元)
  totalNetInflow: number | null;      // 合计净流入(万元)
}
```

### 示例

```typescript
const north = await sdk.getNorthboundMinute('north');
const last = north.at(-1);
console.log(`${last?.date} ${last?.time} 北向合计净流入: ${last?.totalNetInflow} 万元`);
```

---

## getNorthboundFlowSummary

获取沪深港通市场资金流向汇总（北向 + 南向 + 港股通拆分），通常返回 4 行。

### 签名

```typescript
getNorthboundFlowSummary(): Promise<NorthboundFlowSummary[]>
```

### 返回类型

```typescript
interface NorthboundFlowSummary {
  date: string;
  type: string;
  boardName: string;             // 沪股通 / 深股通 / 港股通(沪) / 港股通(深)
  direction: string;             // 北向资金 / 南向资金
  status: string;                // 交易状态
  netBuyAmount: number | null;   // 成交净买额
  netInflow: number | null;      // 资金净流入
  remainAmount: number | null;   // 当日资金余额
  upCount: number | null;
  flatCount: number | null;
  downCount: number | null;
  indexCode: string;
  indexName: string;
  indexChangePercent: number | null;
}
```

---

## getNorthboundHoldingRank

北向 / 沪股通 / 深股通持股个股排行。

### 签名

```typescript
getNorthboundHoldingRank(options?: {
  market?: 'all' | 'shanghai' | 'shenzhen';   // 默认 all
  period?: 'today' | '3day' | '5day' | '10day' | 'month' | 'quarter' | 'year';
  date?: string;                              // YYYY-MM-DD（默认服务端最新交易日）
}): Promise<NorthboundHoldingRankItem[]>
```

### 示例

```typescript
const rank = await sdk.getNorthboundHoldingRank({
  market: 'all',
  period: '5day',
});
rank.slice(0, 10).forEach((item, idx) => {
  console.log(
    `#${idx + 1} ${item.name}(${item.code}) 持股市值: ${item.holdMarketValue}`
  );
});
```

---

## getNorthboundHistory

北向 / 南向资金按日历史。

### 签名

```typescript
getNorthboundHistory(
  direction?: 'north' | 'south',
  options?: { startDate?: string; endDate?: string }
): Promise<NorthboundHistoryItem[]>
```

### 返回类型

```typescript
interface NorthboundHistoryItem {
  date: string;
  netBuyAmount: number | null;
  buyAmount: number | null;
  sellAmount: number | null;
  accNetBuyAmount: number | null;     // 历史累计净买额
  netInflow: number | null;
  remainAmount: number | null;
  topStockCode: string | null;
  topStockName: string | null;
  topStockChangePercent: number | null;
}
```

### 示例

```typescript
const history = await sdk.getNorthboundHistory('north', {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
console.log(`共获取 ${history.length} 个交易日`);
```

---

## getNorthboundIndividual

获取个股的北向持仓历史。

### 签名

```typescript
getNorthboundIndividual(
  symbol: string,
  options?: { startDate?: string; endDate?: string }
): Promise<NorthboundIndividualItem[]>
```

### 返回类型

```typescript
interface NorthboundIndividualItem {
  date: string;
  holdShares: number | null;          // 持股数量
  holdMarketValue: number | null;     // 持股市值(元)
  holdRatioFloat: number | null;      // 持股占流通股比 %
  holdRatioTotal: number | null;      // 持股占总股本比 %
  close: number | null;
  changePercent: number | null;
}
```

### 示例

```typescript
const moutai = await sdk.getNorthboundIndividual('600519', {
  startDate: '2024-01-01',
});
const trend = moutai.slice(-5).map(i => `${i.date}: ${i.holdShares}`);
console.log('近 5 日北向持股：\n' + trend.join('\n'));
```
