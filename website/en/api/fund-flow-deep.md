# Fund Flow (Deep)

Provides 4 dimensions of fund flow data: individual stocks / market / ranking / sectors. Sources: Eastmoney push2his and push2 endpoints.

::: tip
These methods complement the existing `getFundFlow`. `getFundFlow` returns single-day data for a batch of codes; the methods here return historical series, ranking lists and sector aggregates.
:::

## getIndividualFundFlow

Get fund-flow history for a single stock (daily / weekly / monthly).

### Signature

```typescript
getIndividualFundFlow(
  symbol: string,
  options?: { period?: 'daily' | 'weekly' | 'monthly' }
): Promise<StockFundFlowDaily[]>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `symbol` | `string` | Stock code (with or without `sh/sz/bj` prefix) |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | Default `'daily'` |

### Return type

```typescript
interface StockFundFlowDaily {
  date: string;
  close: number | null;
  changePercent: number | null;
  mainNetInflow: number | null;
  mainNetInflowPercent: number | null;
  superLargeNetInflow: number | null;
  superLargeNetInflowPercent: number | null;
  largeNetInflow: number | null;
  largeNetInflowPercent: number | null;
  mediumNetInflow: number | null;
  mediumNetInflowPercent: number | null;
  smallNetInflow: number | null;
  smallNetInflowPercent: number | null;
}
```

### Example

```typescript
const flow = await sdk.getIndividualFundFlow('sh600519', { period: 'daily' });
console.log(`Bars: ${flow.length}`);
console.log(`Last main net inflow: ${flow.at(-1)?.mainNetInflow}`);
```

---

## getMarketFundFlow

Market fund flow including both Shanghai Composite and Shenzhen Component indices.

### Signature

```typescript
getMarketFundFlow(): Promise<MarketFundFlow[]>
```

### Return type

```typescript
interface MarketFundFlow {
  date: string;
  shClose: number | null;
  shChangePercent: number | null;
  szClose: number | null;
  szChangePercent: number | null;
  mainNetInflow: number | null;
  mainNetInflowPercent: number | null;
  // ... super-large / large / medium / small same shape
}
```

---

## getFundFlowRank

Stock fund-flow ranking, sorted by main capital net inflow.

### Signature

```typescript
getFundFlowRank(options?: {
  indicator?: 'today' | '3day' | '5day' | '10day';
}): Promise<FundFlowRankItem[]>
```

### Example

```typescript
const rank = await sdk.getFundFlowRank({ indicator: '5day' });
rank.slice(0, 10).forEach((item, idx) => {
  console.log(
    `#${idx + 1} ${item.name}(${item.code}) main inflow: ${item.mainNetInflow}`
  );
});
```

---

## getSectorFundFlowRank

Sector fund-flow ranking with three dimensions: industry / concept / region.

### Signature

```typescript
getSectorFundFlowRank(options?: {
  indicator?: 'today' | '3day' | '5day' | '10day';
  sectorType?: 'industry' | 'concept' | 'region';
}): Promise<SectorFundFlowItem[]>
```

### Return type

```typescript
interface SectorFundFlowItem {
  code: string;                // BK code (e.g. BK0438)
  name: string;
  changePercent: number | null;
  mainNetInflow: number | null;
  mainNetInflowPercent: number | null;
  superLargeNetInflow: number | null;
  largeNetInflow: number | null;
  mediumNetInflow: number | null;
  smallNetInflow: number | null;
  topStockCode?: string;       // Top inflow stock code
  topStockName?: string;
}
```

---

## getSectorFundFlowHistory

Historical fund flow for a single sector. `symbol` accepts BK code (e.g. `BK0438`) or fully-prefixed format (e.g. `90.BK0438`).

### Signature

```typescript
getSectorFundFlowHistory(
  symbol: string,
  options?: { period?: 'daily' | 'weekly' | 'monthly' }
): Promise<StockFundFlowDaily[]>
```
