# northbound · 沪深港通 / 北向资金

`sdk.northbound` 提供北向资金（沪股通 + 深股通）与南向资金（港股通沪 / 深）的分时、汇总、持股排行、历史与个股持仓数据（数据源：东方财富开放数据中心）。

::: tip 浏览器兼容
全部接口直连东方财富开放数据，无 CORS 限制，可在浏览器端直接调用。
:::

多数方法以 `direction` 区分资金方向：`'north'`（北向，默认）/ `'south'`（南向）。

## 方法一览

| 方法 | 说明 |
|---|---|
| `northbound.minute(direction?)` | 当日分时净流入（每分钟一个点） |
| `northbound.summary()` | 沪深港通市场资金流向汇总 |
| `northbound.holdingRank(opts?)` | 北向持股个股排行 |
| `northbound.history(direction?, opts?)` | 北向 / 南向资金按日历史 |
| `northbound.individual(symbol, opts?)` | 个股北向持仓历史 |

> 具体参数与返回字段以最终实现为准；下方字段表反映当前数据契约。**金额单位以各字段注释为准（`minute` 为万元，其余接口为元）；v2 的目标是统一为「元」口径，最终以实现为准。**

---

## northbound.minute

获取北向 / 南向资金当日分时数据（每分钟一个点）。

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const north = await sdk.northbound.minute('north');
const last = north.at(-1);
console.log(`${last?.date} ${last?.time} 北向合计净流入: ${last?.totalNetInflow} 万元`);
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `direction` | `'north' \| 'south'` | 资金方向，默认 `'north'` |

### 返回说明

返回 `NorthboundMinuteItem[]`：

```ts
interface NorthboundMinuteItem {
  date: string;                       // YYYY-MM-DD
  time: string;                       // HH:MM
  shanghaiNetInflow: number | null;   // 沪股通 / 港股通(沪) 净流入（万元）
  shenzhenNetInflow: number | null;   // 深股通 / 港股通(深) 净流入（万元）
  totalNetInflow: number | null;      // 合计净流入（万元）
}
```

---

## northbound.summary

获取沪深港通市场资金流向汇总（北向 + 南向、港股通沪 / 深拆分），通常返回 4 行。

```ts
const summary = await sdk.northbound.summary();
summary.forEach(s => {
  console.log(`${s.boardName}（${s.direction}）净流入: ${s.netInflow} 元`);
});
```

### 返回说明

返回 `NorthboundFlowSummary[]`：

```ts
interface NorthboundFlowSummary {
  date: string;                      // YYYY-MM-DD
  type: string;                      // 类型编号
  boardName: string;                 // 沪股通 / 深股通 / 港股通(沪) / 港股通(深)
  direction: string;                 // 北向资金 / 南向资金
  status: string;                    // 交易状态
  netBuyAmount: number | null;       // 成交净买额（元）
  netInflow: number | null;          // 资金净流入（元）
  remainAmount: number | null;       // 当日资金余额（元）
  upCount: number | null;            // 上涨数
  flatCount: number | null;          // 持平数
  downCount: number | null;          // 下跌数
  indexCode: string;                 // 相关指数代码
  indexName: string;                 // 相关指数名称
  indexChangePercent: number | null; // 指数涨跌幅（百分数）
}
```

---

## northbound.holdingRank

北向 / 沪股通 / 深股通持股个股排行。

```ts
const rank = await sdk.northbound.holdingRank({ market: 'all', period: '5day' });
rank.slice(0, 10).forEach((item, i) => {
  console.log(`#${i + 1} ${item.name}(${item.code}) 持股市值: ${item.holdMarketValue} 元`);
});
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `options.market` | `'all' \| 'shanghai' \| 'shenzhen'` | 持股市场，默认 `'all'` |
| `options.period` | `'today' \| '3day' \| '5day' \| '10day' \| 'month' \| 'quarter' \| 'year'` | 统计周期 |
| `options.date` | `string` | `YYYY-MM-DD`，默认服务端最新交易日 |

### 返回说明

返回 `NorthboundHoldingRankItem[]`：

```ts
interface NorthboundHoldingRankItem {
  date: string;
  code: string;
  name: string;
  close: number | null;                // 今日收盘价
  changePercent: number | null;        // 今日涨跌幅（百分数）
  holdShares: number | null;           // 今日持股股数
  holdMarketValue: number | null;      // 今日持股市值（元）
  holdRatioFloat: number | null;       // 持股占流通股比（百分数）
  holdRatioTotal: number | null;       // 持股占总股本比（百分数）
  addShares: number | null;            // 区间增持估计股数
  addMarketValue: number | null;       // 区间增持估计市值（元）
  addMarketValuePercent: number | null;// 区间增持估计市值增幅（百分数）
  sector: string;                      // 所属板块
}
```

---

## northbound.history

北向 / 南向资金按日历史。

```ts
const history = await sdk.northbound.history('north', {
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});
console.log(`共获取 ${history.length} 个交易日`);
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `direction` | `'north' \| 'south'` | 资金方向，默认 `'north'` |
| `options.startDate` | `string` | 起始日期 `YYYY-MM-DD` |
| `options.endDate` | `string` | 结束日期 `YYYY-MM-DD` |

### 返回说明

返回 `NorthboundHistoryItem[]`：

```ts
interface NorthboundHistoryItem {
  date: string;
  netBuyAmount: number | null;            // 成交净买额（元）
  buyAmount: number | null;               // 买入成交额（元）
  sellAmount: number | null;              // 卖出成交额（元）
  accNetBuyAmount: number | null;         // 历史累计净买额（元）
  netInflow: number | null;               // 当日资金流入（元）
  remainAmount: number | null;            // 当日资金余额（元）
  topStockCode: string | null;            // 领涨股代码
  topStockName: string | null;            // 领涨股名称
  topStockChangePercent: number | null;   // 领涨股涨跌幅（百分数）
}
```

---

## northbound.individual

获取个股的北向持仓历史。

```ts
const moutai = await sdk.northbound.individual('600519', { startDate: '2024-01-01' });
const recent = moutai.slice(-5).map(i => `${i.date}: ${i.holdShares}`);
console.log('近 5 日北向持股：\n' + recent.join('\n'));
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `symbol` | `string \| SymbolRef` | 股票代码 |
| `options.startDate` | `string` | 起始日期 `YYYY-MM-DD` |
| `options.endDate` | `string` | 结束日期 `YYYY-MM-DD` |

### 返回说明

返回 `NorthboundIndividualItem[]`：

```ts
interface NorthboundIndividualItem {
  date: string;
  holdShares: number | null;       // 持股数量
  holdMarketValue: number | null;  // 持股市值（元）
  holdRatioFloat: number | null;   // 持股占流通股比（百分数）
  holdRatioTotal: number | null;   // 持股占总股本比（百分数）
  close: number | null;            // 收盘价
  changePercent: number | null;    // 涨跌幅（百分数）
}
```
