# screener · 选股与回测

链式选股器 + 轻量回测引擎——纯计算、零网络、零依赖，从 subpath `stock-sdk/screener` 导入。输入任意行情 / K 线数组（通常来自 `sdk.batch.cn()`、`sdk.kline.cn()`），本地完成筛选、排序与策略回测。

```ts
import { screen, backtest } from 'stock-sdk/screener'
```

## 方法表

| 方法 | 说明 |
|---|---|
| `screen(items)` | 创建链式选股器：`where` 过滤 → `sortBy` 排序 → `top(n)` / `toArray()` 取结果 |
| `backtest(options)` | 单标的多头回测，**单 options 对象入参**，返回 `BacktestReport` |

## screen · 链式选股

```ts
const picks = screen(allQuotes)
  .where(q => q.pe != null && q.pe < 20)
  .where(q => q.changePercent > 3)
  .sortBy(q => q.amount)        // 默认降序；.sortBy(sel, 'asc') 升序
  .top(20)
```

- **不改动入参数组**：入口即拷贝，`top` / `toArray` 亦返回新数组。
- **sortBy 数值语义**：字符串数值（原始行情 JSON 常见，如 `'999999'`）会经 `Number()` 归一后参与排序；`null` / `undefined` / `NaN` / 空串 / 非数值字符串统一**沉底**，不参与算术比较。
- **参数校验**：`top(n)` 要求非负整数；`sortBy` 的 `direction` 仅接受 `'asc'` / `'desc'`——非法值抛 `InvalidArgumentError`，不再静默按降序处理。

## backtest · 回测

```ts
const report = backtest({
  klines,                              // 任意含 close 的序列（如 sdk.kline.cn 输出）
  strategy: (bar, i, series) => {      // 每根 K 线返回 'buy' | 'sell' | 'hold'
    // ⚠️ series 是完整数组（含未来 bar），只可读取 series.slice(0, i + 1)
    return i === 0 ? 'buy' : 'hold'
  },
  initialCapital: 100000,              // 默认 100000
  fee: { buy: 0.0003, sell: 0.0013 },  // 数字=买卖同费率；对象可表达 A 股卖侧印花税
  positionSize: 1,                     // 每次买入动用现金比例 (0,1]，默认全仓
  getDate: bar => bar.date,            // 可选；传入后成交记录带 entryDate/exitDate
})
report.totalReturn    // 总收益率(%)
report.buyHoldReturn  // 买入持有基准(%)——没跑赢它就别高兴太早
report.maxDrawdown    // 最大回撤(%)，以初始资金为起始基线
report.trades         // 每笔成交（含 forced 强平标记）
```

### 成交契约（对不上实盘先看这里）

- **同根收盘成交**：第 i 根算出的信号按第 i 根收盘价成交（零延迟）。真实交易只能在下一根成交，这一约定会系统性美化「按收盘价触发」的策略，对比实盘请自行外加滑点。
- **无效价 bar 的信号挂起**：`close` 为 0（停牌编码）/ `NaN` / `null` 的 bar 上发出的 `buy` / `sell` 不会丢失，**挂起到下一根有效价 bar 成交**；若届时策略给出新的非 `hold` 信号，以新信号为准。
- **收尾强平**：数据走完仍持仓，按最后一根**有效**收盘价平仓，`Trade.forced = true` 且 `exitIndex` 指向该有效 bar（价格与下标必然对应同一根）。
- **无手数约束**：允许任意小数股数，不模拟 A 股整手 / 最低佣金——小资金回测高价股请自行审视可行性。

### 参数校验

`initialCapital`（正有限数）、`fee`（每侧 `[0, 1)`）、`positionSize`（`(0, 1]`）非法时抛 `InvalidArgumentError`——不再产出「回撤 0 + 收益符号反转」的静默垃圾报告。

### BacktestReport

| 字段 | 说明 |
|---|---|
| `totalReturn` | 总收益率（%），基于期末权益 / 初始资金 |
| `buyHoldReturn` | 买入持有基准（%）：首根有效收盘 → 末根有效收盘，**不含费** |
| `winRate` | 胜率（%）。按 `returnPercent > 0` 计胜，纯费差平局与强平单均计入分母；过滤强平单可用 `trades.filter(t => !t.forced)` 自行统计 |
| `maxDrawdown` | 最大回撤（%，正数），峰值从**初始资金**起算（首笔买入的手续费回撤也可见） |
| `validBars` | 有效价 bar 数。**为 0 说明所有 bar 都取不到有效收盘价**（最常见：分时数据字段是 `price` 而非 `close`，需自传 `getClose`） |
| `trades` / `tradeCount` | 成交明细：`entryIndex` / `exitIndex` / 价格 / `returnPercent`（含双边费）/ `forced`；传 `getDate` 后带 `entryDate` / `exitDate` |
| `equityCurve` | 每根 K 线收盘后的权益 |
| `finalEquity` / `initialCapital` | 期末权益 / 初始资金 |

::: warning 前视偏差（look-ahead bias）
`strategy(bar, index, series)` 的第三个参数是**完整数组**——读取 `series[index + 1]` 及之后的元素即偷看未来，回测收益会严重虚高且不可复现于实盘。只允许读历史窗口 `series.slice(0, index + 1)`。
:::

## 相关

- [signals](/api/signals) —— 金叉死叉等事件识别，输出可直接作为策略输入
- [indicators](/api/indicators) —— 14 个指标纯函数与 `addIndicators`
- [kline](/api/kline) —— 历史 K 线数据来源
