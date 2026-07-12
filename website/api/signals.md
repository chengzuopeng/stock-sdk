# signals · 信号层

信号层在[技术指标](/api/indicators)之上做**事件识别**——金叉 / 死叉、超买 / 超卖、布林突破、SAR 反转。同样是纯计算、零网络、零依赖，从 subpath `stock-sdk/signals` 导入。

```ts
import { calcSignals } from 'stock-sdk/signals'
```

核心只有一个函数 `calcSignals`：输入一段**已经算好指标**的 K 线（`KlineWithIndicators[]`），输出一个按时间升序的信号事件数组。

## 方法表

| 方法 | 说明 |
|---|---|
| `calcSignals(klines, options?)` | 从带指标的 K 线序列识别信号，返回 `Signal[]` |

## 前置条件

`calcSignals` **不自己算指标**，它读取 K 线上已有的 `ma` / `macd` / `kdj` / `rsi` / `boll` / `sar` 字段。所以先用 [`addIndicators`](/api/indicators#addindicators)（或 [`sdk.kline.withIndicators`](/api/kline)）把指标贴上去，再传进来。

> 重要：信号侧的周期必须与指标侧实际算出的键一致。例如要识别 5/20 MA 金叉，`addIndicators` 必须算了 `ma5` 与 `ma20`；RSI 同理（信号默认读 `rsi6`）。周期不匹配会抛 `InvalidArgumentError`（而非静默返回空数组）。

## 信号类型

`SignalType` 共 14 种，覆盖六类形态：

| 类别 | 信号类型 | 触发条件 |
|---|---|---|
| MA 金叉 / 死叉 | `ma_golden_cross` / `ma_death_cross` | 快线 `maFast` 上穿 / 下穿 慢线 `maSlow` |
| MACD 金叉 / 死叉 | `macd_golden_cross` / `macd_death_cross` | `dif` 上穿 / 下穿 `dea` |
| KDJ 金叉 / 死叉 | `kdj_golden_cross` / `kdj_death_cross` | `k` 上穿 / 下穿 `d` |
| KDJ 超买 / 超卖 | `kdj_overbought` / `kdj_oversold` | `k` > 超买阈值（默认 80）/ < 超卖阈值（默认 20） |
| RSI 超买 / 超卖 | `rsi_overbought` / `rsi_oversold` | `rsi` > 超买阈值（默认 70）/ < 超卖阈值（默认 30） |
| BOLL 突破 | `boll_break_upper` / `boll_break_lower` | 收盘价突破布林上轨 / 跌破下轨 |
| SAR 反转 | `sar_reversal_up` / `sar_reversal_down` | SAR 趋势方向由跌转涨 / 由涨转跌 |

## options

只为传入的指标计算信号——不传的位不产生对应信号：

```ts
interface SignalOptions {
  /** MA 金叉/死叉：fast 上穿/下穿 slow */
  ma?: { fast: number; slow: number }
  /** MACD 金叉/死叉：DIF 上穿/下穿 DEA */
  macd?: boolean
  /** KDJ 金叉死叉 + 超买超卖（阈值默认 80 / 20） */
  kdj?: { overbought?: number; oversold?: number }
  /** RSI 超买超卖（默认 period=6，阈值 70 / 30） */
  rsi?: { period?: number; overbought?: number; oversold?: number }
  /** BOLL 收盘突破上/下轨 */
  boll?: boolean
  /** SAR 趋势反转 */
  sar?: boolean
}
```

> `kdj` 传 `{}` 即用默认阈值，也可覆写 `overbought` / `oversold`。`rsi` 的 `period` 必须与指标侧算出的 RSI 周期对应。

## 调用示例

```ts
import { addIndicators } from 'stock-sdk/indicators'
import { calcSignals } from 'stock-sdk/signals'

// 1. 取 K 线（回测口径建议后复权）
const klines = await sdk.kline.cn('600519', { adjust: 'hfq' })

// 2. 计算需要的指标（注意 MA/RSI 周期要和信号侧对齐）
const enriched = addIndicators(klines, {
  ma: { periods: [5, 20] },
  macd: true,
  kdj: true,
  rsi: { periods: [6] },
  boll: true,
  sar: true,
})

// 3. 识别信号
const signals = calcSignals(enriched, {
  ma: { fast: 5, slow: 20 },
  macd: true,
  kdj: { overbought: 80, oversold: 20 },
  rsi: { period: 6, overbought: 70, oversold: 30 },
  boll: true,
  sar: true,
})

// 只取最近一根 K 线上的金叉
const lastIdx = enriched.length - 1
const todayGolden = signals.filter(
  s => s.index === lastIdx && s.type.endsWith('golden_cross'),
)
```

## 返回说明

`calcSignals` 返回 `Signal[]`，按 K 线顺序排列：

```ts
interface Signal {
  /** 信号类型，见上表 */
  type: SignalType
  /** 对应 K 线的 timestamp（UTC ms，恒非空） */
  at: number
  /** 对应 K 线在输入数组中的下标 */
  index: number
  /** 附加信息，如金叉的快慢周期、超买超卖的指标值 */
  detail?: Record<string, number>
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `type` | `SignalType` | 14 种信号之一 |
| `at` | `number` | 触发 K 线的 `timestamp`（UTC 毫秒）；**恒非空** |
| `index` | `number` | 触发 K 线在输入数组中的下标，可回查整根 K 线 |
| `detail` | `Record<string, number>?` | 上下文，如 `{ fast: 5, slow: 20 }` 或 `{ rsi: 72.4 }` |

**时间锚点一致性**：v2 把 K 线 `timestamp` 改为 `number | null`，但 `Signal.at` 恒为 `number`——`calcSignals` 会**跳过 `timestamp` 为 `null` 的 K 线**（无有效时间锚点不产信号），保证信号与时间轴类型一致。

> 纯计算、零网络、零依赖、浏览器 + Node 双端可用。**具体字段以实现为准。**

## 相关

- [indicators](/api/indicators) —— 信号的输入：14 个 `calc*` 与 `addIndicators`
- [kline](/api/kline) —— `kline.withIndicators` 一步拿到带指标的 K 线；`kline.signals` 更进一步，取数 + 识别信号一步到位（同时作为 MCP 工具 `get_kline_signals` 暴露）
- [技术指标与信号指南](/guide/indicators)
