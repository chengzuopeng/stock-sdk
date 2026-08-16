# marketEvent · 涨停板 / 盘口异动

`sdk.marketEvent` 提供 6 大涨停股池、22 种盘口异动、板块异动详情,以及**个股维度**的当日与近 N 天异动历史（数据源：东方财富 push2ex 接口）。

## 方法一览

| 方法 | 说明 |
|---|---|
| `marketEvent.ztPool(type?, date?)` | 涨停板专题股池（6 个池子） |
| `marketEvent.stockChanges(type?)` | 全市场盘口异动（22 种类型;支持数组多类型 / `'all'` 一次拉全） |
| `marketEvent.boardChanges()` | 当日板块异动详情 |
| `marketEvent.individualChanges(symbol, opts?)` | 个股某交易日的异动事件流（全类型） |
| `marketEvent.individualChangesHistory(symbol, opts?)` | 个股近 N 天异动历史（逐交易日聚合 + 覆盖标注 + 类型计数） |

> 具体参数与返回字段以最终实现为准；下方字段表反映当前数据契约。

::: tip 市场异动是盘中实时数据
与龙虎榜 / 资金流等**盘后**数据不同，涨停池与盘口异动**盘中实时更新**：交易时段内查当天即可拿到当前已涨停 / 已触发异动的标的，随行情滚动变化。

因此同一天在不同时点查询，结果条数会不同（早盘少、尾盘多），这是正常现象；要「当日最终结果」请在**收盘后**查询。
:::

---

## marketEvent.ztPool

获取涨停板专题股池数据，共 6 个池子。部分字段仅特定池子返回（例如 `continuousBoardCount` 仅涨停股池有，`sealAmount` 仅跌停池有）。

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

// 今日涨停股池
const ztPool = await sdk.marketEvent.ztPool('zt');
console.log(`今日涨停 ${ztPool.length} 只`);

// 筛出 3 连板及以上
ztPool
  .filter(s => (s.continuousBoardCount ?? 0) >= 3)
  .forEach(s => console.log(`${s.name}(${s.code}) ${s.continuousBoardCount} 连板 - ${s.industry}`));

// 指定日期跌停池
const dtPool = await sdk.marketEvent.ztPool('dt', '20240115');
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `type` | `ZTPoolType` | 池子类型，默认 `'zt'`（见下表） |
| `date` | `string` | `YYYYMMDD` 或 `YYYY-MM-DD`，默认今天 |

#### 池子类型 `ZTPoolType`

| 值 | 说明 |
|---|---|
| `'zt'` | 涨停股池（默认） |
| `'yesterday'` | 昨日涨停股池 |
| `'strong'` | 强势股池（60 日新高 / 多次涨停） |
| `'sub_new'` | 次新股池（上市 1 年内首次中断一字板） |
| `'broken'` | 炸板股池（当日触及涨停未封板） |
| `'dt'` | 跌停股池 |

### 返回说明

返回 `ZTPoolItem[]`（统一字段，部分类型某些字段为 `null`）：

```ts
interface ZTPoolItem {
  code: string;
  name: string;
  price: number | null;                  // 最新价
  changePercent: number | null;          // 涨跌幅（百分数）
  limitPrice: number | null;             // 涨停价（部分池子返回）
  amount: number | null;                 // 成交额（元）
  floatMarketValue: number | null;       // 流通市值（元）
  totalMarketValue: number | null;       // 总市值（元）
  turnoverRate: number | null;           // 换手率（百分数）
  continuousBoardCount: number | null;   // 连板数（仅涨停股池）
  firstBoardTime: string | null;         // 首次封板时间 HHMMSS（涨停 / 炸板池）
  lastBoardTime: string | null;          // 最后封板时间 HHMMSS（涨停池）
  boardAmount: number | null;            // 封板资金（涨停池）
  sealAmount: number | null;             // 封单资金（跌停池）
  failedCount: number | null;            // 炸板次数
  industry: string;                      // 所属行业
  ztStatistics: string;                  // 涨停统计（如 '3/5' = 5 天内涨停 3 次）
  amplitude: number | null;              // 振幅（百分数，部分池子返回）
  speed: number | null;                  // 涨速（部分池子返回）
}
```

---

## marketEvent.stockChanges

获取全市场盘口异动，共 22 种异动类型;`type` 支持单类型、数组（一次请求多类型）与 `'all'`（全部 22 类,总量超单页 5000 时自动翻页收全）。

```ts
// 监控大笔买入
const largeBuys = await sdk.marketEvent.stockChanges('large_buy');
largeBuys.slice(0, 10).forEach(c => {
  console.log(`${c.time} ${c.name}(${c.code}) ${c.changeTypeLabel} ${c.info}`);
});

// 一次拉多类型(封涨停 + 封跌停),按响应 t 码区分实际类型
const seals = await sdk.marketEvent.stockChanges(['limit_up_seal', 'limit_down_seal']);

// 全部 22 类(交易日总量可达上万条,自动翻页)
const all = await sdk.marketEvent.stockChanges('all');
console.log(`今日异动事件共 ${all.length} 条`);
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `type` | `StockChangeType \| StockChangeType[] \| 'all'` | 异动类型，默认 `'large_buy'`（见下表）;数组一次请求多类型,`'all'` 拉全部 |

#### 异动类型 `StockChangeType`

| 类型 | 中文标签 | 类型 | 中文标签 |
|---|---|---|---|
| `rocket_launch` | 火箭发射 | `large_sell` | 大笔卖出 |
| `quick_rebound` | 快速反弹 | `accelerate_down` | 加速下跌 |
| `large_buy` | 大笔买入（默认） | `high_dive` | 高台跳水 |
| `limit_up_seal` | 封涨停板 | `limit_down_seal` | 封跌停板 |
| `limit_down_open` | 打开跌停板 | `limit_up_open` | 打开涨停板 |
| `big_buy_order` | 有大买盘 | `big_sell_order` | 有大卖盘 |
| `auction_up` | 竞价上涨 | `auction_down` | 竞价下跌 |
| `high_open_5d` | 高开 5 日线 | `low_open_5d` | 低开 5 日线 |
| `gap_up` | 向上缺口 | `gap_down` | 向下缺口 |
| `high_60d` | 60 日新高 | `low_60d` | 60 日新低 |
| `surge_60d` | 60 日大幅上涨 | `drop_60d` | 60 日大幅下跌 |

### 返回说明

返回 `StockChangeItem[]`：

```ts
interface StockChangeItem {
  time: string;                             // 发生时间 HH:MM:SS
  code: string;
  name: string;
  changeType: StockChangeType | 'unknown';  // 异动类型(服务端新增的未知码为 'unknown')
  typeCode: string;                         // 原始类型码(服务端 t 字段)
  changeTypeLabel: string;                  // 中文标签(未知码为空串)
  info: string;                             // 相关信息（来自原始接口）
}
```

---

## marketEvent.individualChanges

获取**单只 A 股**某个交易日的盘口异动事件流（全部类型一次返回,最新在前;含 22 类之外的服务端新类型码,按 `'unknown'` + 原始码容错）。

```ts
// 今天的异动事件流
const events = await sdk.marketEvent.individualChanges('603087');
events.forEach(e => {
  console.log(`${e.time} ${e.changeTypeLabel || e.typeCode} @${e.price} (${e.changePercent}%)`);
});

// 指定日期
const friday = await sdk.marketEvent.individualChanges('603087', { date: '20260703' });
```

::: warning 服务端保留窗口
个股接口仅保留**约最近数周**的数据（实测 1 个月左右,且**不保证连续**——存在个别日期空洞）:无数据日期与"当日无异动"都返回空数组。需要区分两者请用 `individualChangesHistory`（逐日携带 `available` 标记）,永远以返回的 `available` 为准,不要按固定天数推断。
:::

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `symbol` | `string` | 股票代码，如 `'600519'` / `'sh600519'` |
| `options.date` | `string` | 交易日 `YYYYMMDD` 或 `YYYY-MM-DD`，默认今天 |

### 返回说明

返回 `IndividualStockChangeItem[]`：

```ts
interface IndividualStockChangeItem {
  time: string;                             // 发生时间 HH:MM:SS
  typeCode: string;                         // 原始类型码(可能超出 22 类,如 8219)
  changeType: StockChangeType | 'unknown';  // 异动类型(未知码为 'unknown')
  changeTypeLabel: string;                  // 中文标签(未知码为空串)
  price: number | null;                     // 触发价（元）
  changePercent: number | null;             // 触发时涨跌幅（百分数）
  info: string;                             // 相关信息(CSV,格式因类型而异)
  v: number | null;                         // 上游未文档化字段(疑似量级),原样透传
}
```

---

## marketEvent.individualChangesHistory

聚合单只 A 股**最近 N 个自然日**的盘口异动:按 A 股交易日历枚举窗口内交易日,并发逐日请求后合并。issue 场景"看该个股过去 7 / 15 / 30 天的异动"由本方法覆盖。

```ts
const his = await sdk.marketEvent.individualChangesHistory('603087', { days: 15 });

// 覆盖情况:服务端无数据的日期 available=false(保留约数周且可能有空洞)
console.log(his.coverage);
// { from: '2026-06-22', to: '2026-07-06', availableFrom: '2026-06-23' }

// 类型计数概览(键为原始类型码,稳定可比;中文标签在值里)
console.log(his.stats);
// { '4': { count: 12, label: '封涨停板' }, '16': { count: 9, label: '打开涨停板' }, ... }

// 逐日事件
for (const day of his.days) {
  if (!day.available) { console.log(`${day.date} 服务端无该日数据`); continue; }
  console.log(`${day.date} 共 ${day.changes.length} 条异动`);
}
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `symbol` | `string` | 股票代码 |
| `options.days` | `number` | 最近 N 个自然日，`1~60`，默认 `7` |

::: tip 失败语义
任一交易日的请求在内置重试后仍失败时,整个调用抛错、**不返回部分结果**(fail-fast);逐日的 `available: false` 只表示"服务端无该日数据",不会用于掩盖请求失败。
:::

### 返回说明

返回 `IndividualChangesHistory`：

```ts
interface IndividualChangesHistory {
  code: string;
  name: string;
  requestedDays: number;                  // 请求的自然日跨度
  coverage: {
    from: string;                         // 窗口起点 YYYY-MM-DD
    to: string;                           // 窗口终点(北京时间今天)
    availableFrom: string | null;         // 首个有数据的交易日(其后仍可能有空洞);全无为 null
  };
  days: Array<{                           // 按交易日升序
    date: string;
    available: boolean;                   // false = 服务端该日无数据
    code: string;
    name: string;
    changes: IndividualStockChangeItem[];
  }>;
  stats: Record<string, { count: number; label: string }>; // 键为原始类型码;label 为中文标签(未知码为空串)
}
```

> **30 天完整视角**:tick 级异动受服务端窗口限制;窗口外的日度视角可组合 `fundFlow.individual`（主力资金日史）、本地 K 线涨停判定与 `dragonTiger.detail`,见[指南:个股 30 天异动全景](/guide/stock-changes-panorama)。

---

## marketEvent.boardChanges

获取当日板块异动详情，含异动类型分布与最活跃个股。

```ts
const boards = await sdk.marketEvent.boardChanges();
boards
  .sort((a, b) => (b.totalChangeCount ?? 0) - (a.totalChangeCount ?? 0))
  .slice(0, 5)
  .forEach(b => {
    console.log(`${b.name}: 异动 ${b.totalChangeCount} 次，最活跃 ${b.topStockName}（${b.topStockDirection}）`);
  });
```

### 返回说明

返回 `BoardChangeItem[]`：

```ts
interface BoardChangeItem {
  name: string;                              // 板块名称
  changePercent: number | null;             // 涨跌幅（百分数）
  mainNetInflow: number | null;             // 主力净流入（元）
  totalChangeCount: number | null;          // 异动总次数
  topStockCode: string;                     // 异动最频繁个股代码
  topStockName: string;                     // 异动最频繁个股名称
  topStockDirection: string;                // '大笔买入' | '大笔卖出'
  changeTypeDistribution: Record<string, number>; // 异动类型分布（key 为类型代码，value 为次数）
}
```
