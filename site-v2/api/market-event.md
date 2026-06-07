# marketEvent · 涨停板 / 盘口异动

`sdk.marketEvent` 提供 6 大涨停股池、22 种盘口异动与板块异动详情（数据源：东方财富 push2ex 接口）。

## 方法一览

| 方法 | 说明 |
|---|---|
| `marketEvent.ztPool(type?, date?)` | 涨停板专题股池（6 个池子） |
| `marketEvent.stockChanges(type?)` | 个股盘口异动（22 种异动类型） |
| `marketEvent.boardChanges()` | 当日板块异动详情 |

> 具体参数与返回字段以最终实现为准；下方字段表反映当前数据契约。

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

获取个股盘口异动，共 22 种异动类型。

```ts
// 监控大笔买入
const largeBuys = await sdk.marketEvent.stockChanges('large_buy');
largeBuys.slice(0, 10).forEach(c => {
  console.log(`${c.time} ${c.name}(${c.code}) ${c.changeTypeLabel} ${c.info}`);
});

// 监控封涨停
const sealUp = await sdk.marketEvent.stockChanges('limit_up_seal');
console.log(`当前封涨停: ${sealUp.length} 只`);
```

### 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `type` | `StockChangeType` | 异动类型，默认 `'large_buy'`（见下表） |

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
  time: string;                  // 发生时间 HH:MM:SS
  code: string;
  name: string;
  changeType: StockChangeType;   // 异动类型
  changeTypeLabel: string;       // 异动类型中文标签
  info: string;                  // 相关信息（来自原始接口）
}
```

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
