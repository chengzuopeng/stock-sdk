# 技术指标与信号

stock-sdk 的指标与信号层是**纯计算、零网络**的。你把 K 线序列喂进去，得到结构化的指标值或信号事件，全程不发请求。这两层通过独立的 subpath 导出，按需引入即可——只用指标的人不会把 `RequestClient` 和所有 provider 拖进 bundle。

```ts
import { calcMACD, addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'
```

整体分三层：

- **指标计算函数**（`stock-sdk/indicators`）——14 个 `calc*` 函数，输入数值序列或 K 线，输出结构化指标对象。
- **批量贴指标**（`addIndicators` / `sdk.kline.withIndicators`）——把多种指标一次性算好并贴到每根 K 线上。
- **信号层**（`stock-sdk/signals`）——在带指标的 K 线之上识别金叉 / 死叉 / 超买 / 超卖等事件。

## 14 个指标计算函数

所有计算函数从 `stock-sdk/indicators` 导出，返回**结构化对象**（而非裸数组），便于直接取用各分量。

| 函数 | 说明 |
|---|---|
| `calcMA` | 简单移动平均线（可指定多个周期，如 5 / 10 / 20 / 60） |
| `calcMACD` | 指数平滑异同移动平均，返回 `dif` / `dea` / `macd` 三线 |
| `calcBOLL` | 布林带，返回 `mid` / `upper` / `lower` / `bandwidth` |
| `calcKDJ` | 随机指标，返回 `k` / `d` / `j` 三线 |
| `calcRSI` | 相对强弱指标（可指定周期） |
| `calcWR` | 威廉指标（Williams %R） |
| `calcBIAS` | 乖离率 |
| `calcCCI` | 顺势指标 |
| `calcATR` | 真实波幅均值 |
| `calcOBV` | 能量潮（依赖成交量） |
| `calcROC` | 变动率指标 |
| `calcDMI` | 动向指标（含 `+DI` / `-DI` / `ADX`） |
| `calcSAR` | 抛物线转向，返回 `sar` 值与 `trend` 趋势方向 |
| `calcKC` | 肯特纳通道（Keltner Channel） |

::: tip 返回字段
各函数的具体入参与返回字段（如周期默认值、对齐方式、空值占位）以最终实现为准。下方示例展示典型用法，字段名称在实现中以 JSDoc 与类型定义为准。
:::

### 单指标计算

```ts
import { calcMA, calcMACD, calcKDJ } from 'stock-sdk/indicators'
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()
const kline = await sdk.kline.cn('600519') // 默认前复权日 K

// 收盘价序列
const closes = kline.map(k => k.close)

const ma = calcMA(closes, [5, 10, 20])   // 多周期均线
const macd = calcMACD(closes)            // { dif, dea, macd }
const kdj = calcKDJ(kline)               // { k, d, j }，需要高/低/收
```

OBV 依赖成交量，CCI / ATR / DMI / SAR / KDJ / WR 等依赖高、低、收，因此通常把整段 K 线传进去，由函数自取所需字段。MA / MACD / RSI / BIAS / ROC 这类只看收盘价的，传收盘价数组即可。

::: warning 成交量口径
`calcOBV` 等依赖 `volume` 的指标，其数值取决于 K 线中 `volume` 的口径。v2 的目标口径是「股」，但单位换算本期暂缓，运行时 `volume` 仍可能是各数据源的原始口径（如 A 股「手」）。做横向比较或迁移 v1 回测结果时需留意这一点。
:::

## addIndicators：批量贴指标

`addIndicators` 把多种指标一次性算好，并贴回每根 K 线，得到 `KlineWithIndicators<T>`。适合「一次拿全、统一遍历」的场景。

```ts
import { addIndicators } from 'stock-sdk/indicators'

const enriched = addIndicators(kline, {
  ma: [5, 10, 20],
  macd: true,
  boll: true,
  kdj: true,
  rsi: { period: 14 },
})

// 每根 K 线在原字段之上多出对应指标分量
enriched.forEach(bar => {
  console.log(bar.time, bar.close, bar.ma5, bar.macd?.dif, bar.kdj?.k)
})
```

`addIndicators` 的可配置项与具体贴回的字段名以实现为准；其内部正是对上面 14 个 `calc*` 函数的编排。

## sdk.kline.withIndicators：取数即带指标

如果你想「拉 K 线的同时就带上指标」，用 `sdk.kline.withIndicators`——它在 SDK 内部先取 K 线，再走 `addIndicators`，省掉手动两步。

```ts
import { StockSDK } from 'stock-sdk'

const sdk = new StockSDK()

const kline = await sdk.kline.withIndicators('600519', {
  ma: [5, 20],
  macd: true,
  boll: true,
})
// kline 已是 KlineWithIndicators，每根含指标分量
```

::: tip 取数 vs 纯计算
`sdk.kline.withIndicators` 会发请求取数（属于 SDK 主入口）；`addIndicators` / `calc*` 是纯函数，从 `stock-sdk/indicators` 单独引入时不会拖入网络层。若你已有 K 线数据，优先用纯函数以保持 bundle 纤薄。
:::

## 信号层：calcSignals

信号层在「带指标的 K 线」之上做**事件识别**，输出一串 `Signal`。它同样是纯计算，从 `stock-sdk/signals` 导出。

```ts
import { calcSignals } from 'stock-sdk/signals'
import { addIndicators } from 'stock-sdk/indicators'

const enriched = addIndicators(kline, { ma: [5, 20], macd: true, kdj: true })

const signals = calcSignals(enriched, {
  ma: { fast: 5, slow: 20 },   // 均线金叉 / 死叉
  macd: true,                  // MACD 金叉 / 死叉
  kdj: { overbought: 80, oversold: 20 },
  rsi: { period: 14, overbought: 70, oversold: 30 },
  boll: true,                  // 突破上 / 下轨
  sar: true,                   // SAR 反转
})
```

### 信号类型

`calcSignals` 可识别的事件覆盖以下几类：

| 类别 | 信号 | 判定 |
|---|---|---|
| 均线 | `ma_golden_cross` / `ma_death_cross` | 快线上穿 / 下穿慢线 |
| MACD | `macd_golden_cross` / `macd_death_cross` | `dif` 上穿 / 下穿 `dea` |
| KDJ | `kdj_golden_cross` / `kdj_death_cross` / `kdj_overbought` / `kdj_oversold` | K/D 交叉、`k` 越过阈值 |
| RSI | `rsi_overbought` / `rsi_oversold` | RSI 越过超买 / 超卖阈值 |
| BOLL | `boll_break_upper` / `boll_break_lower` | 收盘突破上 / 下轨 |
| SAR | `sar_reversal_up` / `sar_reversal_down` | SAR 趋势方向翻转 |

### 返回结构

每个 `Signal` 描述「在哪根 K 线、触发了什么、附带哪些参数」：

```ts
interface Signal {
  type: SignalType          // 如 'ma_golden_cross'
  at: number                // 触发 K 线的 timestamp（恒非空）
  index: number             // 触发 K 线的下标
  detail?: Record<string, number> // 如 { fast: 5, slow: 20 }
}
```

::: warning timestamp 一致性
v2 把 K 线 `timestamp` 收敛为 `number | null`，但 `Signal.at` 恒为 `number`——`calcSignals` 会**跳过 `timestamp` 为 `null` 的 K 线**（无有效时间锚点不产信号），保证信号与时间轴类型一致。
:::

具体阈值默认值、可配置项与 `detail` 字段以实现为准。

## 何时用哪一层

- 只要某一两个指标的原始数值 → 直接调对应 `calc*`。
- 要把一批指标统一贴到 K 线上遍历 → `addIndicators`，或取数即带的 `sdk.kline.withIndicators`。
- 要识别金叉 / 死叉 / 超买 / 超卖等**事件**（如做提醒、做选股条件、喂给回测策略）→ `calcSignals`。

信号层的输出可直接作为[选股器](/api/signals)与回测策略的输入，把「指标 → 事件 → 决策」串成一条纯本地、可复现的链路。
