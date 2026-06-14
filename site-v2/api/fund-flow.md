# fundFlow · 资金流向（深度）

`sdk.fundFlow` 提供**个股 / 大盘 / 排名 / 板块**四个维度的资金流向数据（数据源：东方财富数据中心）。返回的是历史序列、排名榜与板块汇总，区别于 `sdk.quotes.fundFlow`（腾讯简版、按代码批量返回单日资金流）。

::: tip 命名空间区分
- `sdk.quotes.fundFlow(codes)` —— **简版**，按代码批量返回当日资金流快照。
- `sdk.fundFlow.*` —— **深度版**，本页内容，提供历史、排名与板块维度。
:::

资金流字段统一采用「**主力 / 超大单 / 大单 / 中单 / 小单**」五档结构，每档同时给出净额（计价货币主单位）与净占比（百分数，如 `5.2` 表示 5.2%）。

## 方法一览

| 方法 | 说明 |
|---|---|
| `fundFlow.individual(symbol, opts?)` | 个股资金流历史（日 / 周 / 月线） |
| `fundFlow.market()` | 大盘资金流历史（上证 + 深证） |
| `fundFlow.rank(opts?)` | 个股资金流排名（按主力净流入排序） |
| `fundFlow.sectorRank(opts?)` | 板块资金流排名（行业 / 概念 / 地域） |
| `fundFlow.sectorHistory(symbol, opts?)` | 单个板块的历史资金流 |

> 具体参数与返回字段以最终实现为准；下方字段表反映当前数据契约。

---

## fundFlow.individual

获取个股的资金流历史（日 / 周 / 月线）。

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

const flow = await sdk.fundFlow.individual('600519', { period: 'daily' });
const latest = flow.at(-1);
console.log(`${latest?.date} 主力净流入: ${latest?.mainNetInflow} 元`);
```

`symbol` 传裸字符串（如 `'sh600519'` / `'600519'`），由 `normalizeSymbol` 容错解析。

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `symbol` | `string` | 股票代码 |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | 周期，默认 `'daily'` |

### 返回说明

返回 `StockFundFlowDaily[]`，按日期升序排列：

```ts
interface StockFundFlowDaily {
  date: string;                          // YYYY-MM-DD
  close: number | null;                  // 收盘价
  changePercent: number | null;          // 涨跌幅（百分数）
  mainNetInflow: number | null;          // 主力净流入-净额（元）
  mainNetInflowPercent: number | null;   // 主力净流入-净占比（百分数）
  superLargeNetInflow: number | null;    // 超大单净流入-净额
  superLargeNetInflowPercent: number | null;
  largeNetInflow: number | null;         // 大单净流入-净额
  largeNetInflowPercent: number | null;
  mediumNetInflow: number | null;        // 中单净流入-净额
  mediumNetInflowPercent: number | null;
  smallNetInflow: number | null;         // 小单净流入-净额
  smallNetInflowPercent: number | null;
}
```

---

## fundFlow.market

获取大盘资金流历史，同一条记录同时包含上证指数与深证成指。

```ts
const market = await sdk.fundFlow.market();
const today = market.at(-1);
console.log(`上证 ${today?.shClose} (${today?.shChangePercent}%)`);
console.log(`主力净流入 ${today?.mainNetInflow} 元`);
```

### 返回说明

返回 `MarketFundFlow[]`：

```ts
interface MarketFundFlow {
  date: string;
  shClose: number | null;          // 上证指数收盘价
  shChangePercent: number | null;  // 上证指数涨跌幅（百分数）
  szClose: number | null;          // 深证成指收盘价
  szChangePercent: number | null;  // 深证成指涨跌幅（百分数）
  mainNetInflow: number | null;
  mainNetInflowPercent: number | null;
  // 超大单 / 大单 / 中单 / 小单 同 individual 结构（净额 + 净占比）
}
```

---

## fundFlow.rank

按主力净流入排序的个股资金流排名。`changePercent` 与各档净流入对应所选周期（例如 `5day` 即 5 日数据）。

```ts
const rank = await sdk.fundFlow.rank({ indicator: '5day' });
rank.slice(0, 10).forEach((item, i) => {
  console.log(`#${i + 1} ${item.name}(${item.code}) 主力净流入 ${item.mainNetInflow} 元`);
});
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `options.indicator` | `'today' \| '3day' \| '5day' \| '10day'` | 统计周期，默认 `'today'` |

### 返回说明

返回 `FundFlowRankItem[]`：

```ts
interface FundFlowRankItem {
  code: string;
  name: string;
  price: number | null;                  // 最新价
  changePercent: number | null;          // 对应周期涨跌幅（百分数）
  mainNetInflow: number | null;          // 主力净流入-净额（元）
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

---

## fundFlow.sectorRank

板块资金流排名，支持行业 / 概念 / 地域三种维度。

```ts
const sectors = await sdk.fundFlow.sectorRank({
  indicator: 'today',
  sectorType: 'industry',
});
sectors.slice(0, 5).forEach(s => {
  console.log(`${s.name}: 净流入 ${s.mainNetInflow} 元，领涨 ${s.topStockName}`);
});
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `options.indicator` | `'today' \| '3day' \| '5day' \| '10day'` | 统计周期，默认 `'today'` |
| `options.sectorType` | `'industry' \| 'concept' \| 'region'` | 板块维度，默认 `'industry'` |

### 返回说明

返回 `SectorFundFlowItem[]`：

```ts
interface SectorFundFlowItem {
  code: string;                  // 板块代码（东方财富 BK 编号，如 BK0475）
  name: string;                  // 板块名称
  changePercent: number | null;  // 百分数
  mainNetInflow: number | null;  // 主力净流入-净额（元）
  mainNetInflowPercent: number | null;
  superLargeNetInflow: number | null;
  largeNetInflow: number | null;
  mediumNetInflow: number | null;
  smallNetInflow: number | null;
  topStockName?: string;         // 主力净流入最大股名称
  topStockCode?: string;         // 主力净流入最大股代码
}
```

---

## fundFlow.sectorHistory

获取单个板块的历史资金流。`symbol` 接受 BK 编号（如 `BK0475`）或带前缀的东财 secid（如 `90.BK0475`）。

```ts
const banking = await sdk.fundFlow.sectorHistory('BK0475');
console.log(`银行板块历史数据 ${banking.length} 条`);
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `symbol` | `string` | 板块代码（BK 编号或东财 secid） |
| `options.period` | `'daily' \| 'weekly' \| 'monthly'` | 周期，默认 `'daily'` |

### 返回说明

返回 `StockFundFlowDaily[]`，结构与 [`fundFlow.individual`](#fundflow-individual) 一致（此处 `close` / `changePercent` 对应板块本身）。
