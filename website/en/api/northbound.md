# Northbound / Stock Connect

Northbound (Shanghai-Connect + Shenzhen-Connect) and Southbound (HK Connect through Shanghai/Shenzhen) data: minute, summary, holding rank, history, individual.

::: tip Browser-friendly
All endpoints call Eastmoney public APIs directly with no CORS restrictions; usable from the browser.
:::

## getNorthboundMinute

Today's per-minute northbound / southbound flow data.

### Signature

```typescript
getNorthboundMinute(direction?: 'north' | 'south'): Promise<NorthboundMinuteItem[]>
```

### Return type

```typescript
interface NorthboundMinuteItem {
  date: string;
  time: string;                       // HH:MM
  shanghaiNetInflow: number | null;   // SH-Connect / HK(SH) net inflow (10k yuan)
  shenzhenNetInflow: number | null;
  totalNetInflow: number | null;
}
```

### Example

```typescript
const north = await sdk.getNorthboundMinute('north');
const last = north.at(-1);
console.log(`${last?.date} ${last?.time} total: ${last?.totalNetInflow} (10k)`);
```

---

## getNorthboundFlowSummary

Stock Connect market flow summary (north + south + HK(SH)/HK(SZ) breakdown).

### Signature

```typescript
getNorthboundFlowSummary(): Promise<NorthboundFlowSummary[]>
```

### Return type

```typescript
interface NorthboundFlowSummary {
  date: string;
  type: string;
  boardName: string;
  direction: string;
  status: string;
  netBuyAmount: number | null;
  netInflow: number | null;
  remainAmount: number | null;
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

Northbound / SH-Connect / SZ-Connect holding rank by stock.

### Signature

```typescript
getNorthboundHoldingRank(options?: {
  market?: 'all' | 'shanghai' | 'shenzhen';   // default 'all'
  period?: 'today' | '3day' | '5day' | '10day' | 'month' | 'quarter' | 'year';
  date?: string;                              // YYYY-MM-DD
}): Promise<NorthboundHoldingRankItem[]>
```

---

## getNorthboundHistory

Northbound / Southbound capital daily history.

### Signature

```typescript
getNorthboundHistory(
  direction?: 'north' | 'south',
  options?: { startDate?: string; endDate?: string }
): Promise<NorthboundHistoryItem[]>
```

### Return type

```typescript
interface NorthboundHistoryItem {
  date: string;
  netBuyAmount: number | null;
  buyAmount: number | null;
  sellAmount: number | null;
  accNetBuyAmount: number | null;
  netInflow: number | null;
  remainAmount: number | null;
  topStockCode: string | null;
  topStockName: string | null;
  topStockChangePercent: number | null;
}
```

---

## getNorthboundIndividual

Per-stock northbound holding history.

### Signature

```typescript
getNorthboundIndividual(
  symbol: string,
  options?: { startDate?: string; endDate?: string }
): Promise<NorthboundIndividualItem[]>
```

### Return type

```typescript
interface NorthboundIndividualItem {
  date: string;
  holdShares: number | null;
  holdMarketValue: number | null;
  holdRatioFloat: number | null;
  holdRatioTotal: number | null;
  close: number | null;
  changePercent: number | null;
}
```
