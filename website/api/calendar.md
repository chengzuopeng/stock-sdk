# calendar · 交易日历与市场状态

`sdk.calendar` 命名空间在底层交易日历之上提供更高层的便利方法：判断是否交易日、跳转最近交易日、查询市场实时状态。

A 股交易日相关方法基于上游交易日历数据（腾讯，带 12 小时缓存）；港股 / 美股没有官方日历数据源，`marketStatus('HK' | 'US')` 退化为「周一-周五 + 已知交易时段」近似判断，**不识别法定假日**。

## 方法一览

| 方法 | 说明 |
|---|---|
| `sdk.calendar.isTradingDay(date?)` | 判断给定日期是否为 A 股交易日 |
| `sdk.calendar.nextTradingDay(date?)` | 返回 A 股下一个交易日 |
| `sdk.calendar.prevTradingDay(date?)` | 返回 A 股上一个交易日 |
| `sdk.calendar.marketStatus(market?)` | 同步返回当前市场状态（盘前 / 交易中 / 午休 / 盘后 / 休市） |

> 日期入参支持 `'YYYY-MM-DD'` / `'YYYYMMDD'` / `Date` 对象；不传则取「现在 `Asia/Shanghai` 的当日」。

## sdk.calendar.isTradingDay

判断给定日期是否为 A 股交易日。

数据源为底层交易日历（带 12 小时缓存），首次调用会拉取全量交易日列表，后续命中缓存。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `date` | `string \| Date` | 否 | `'YYYY-MM-DD'` / `'YYYYMMDD'` / `Date`；缺省取今日（Asia/Shanghai） |

### 调用示例

```ts
import { StockSDK } from 'stock-sdk';

const sdk = new StockSDK();

await sdk.calendar.isTradingDay();             // 今天是否交易日
await sdk.calendar.isTradingDay('2026-01-01'); // false（元旦）
await sdk.calendar.isTradingDay('20260105');   // 支持紧凑日期格式
```

### 返回说明

返回 `Promise<boolean>`：`true` 表示是交易日，`false` 表示节假日 / 周末。

## sdk.calendar.nextTradingDay

返回 A 股下一个交易日（`'YYYY-MM-DD'`）。

- 若 `date` 本身是交易日，返回它**之后**的下一个交易日；
- 若 `date` 是节假日，返回大于它的第一个交易日；
- 若超出已知日历范围，抛 `InvalidArgumentError`（属 `SdkError`，见 [错误处理](../guide/retry.md)）。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `date` | `string \| Date` | 否 | 基准日期，缺省取今日（Asia/Shanghai） |

### 调用示例

```ts
// 春节前最后一个交易日的下一交易日
await sdk.calendar.nextTradingDay('2026-02-13'); // → 节后首个交易日

// 不传则从今天起算下一个交易日
const next = await sdk.calendar.nextTradingDay();
```

### 返回说明

返回 `Promise<string>`，格式 `'YYYY-MM-DD'`。

## sdk.calendar.prevTradingDay

返回 A 股上一个交易日（`'YYYY-MM-DD'`）。

- 若 `date` 本身是交易日，返回它**之前**的上一个交易日；
- 若 `date` 是节假日，返回小于它的最后一个交易日；
- 若超出已知日历范围，抛 `InvalidArgumentError`。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `date` | `string \| Date` | 否 | 基准日期，缺省取今日（Asia/Shanghai） |

### 调用示例

```ts
await sdk.calendar.prevTradingDay('2026-02-17'); // → 节前最后一个交易日
const prev = await sdk.calendar.prevTradingDay();
```

### 返回说明

返回 `Promise<string>`，格式 `'YYYY-MM-DD'`。

## sdk.calendar.marketStatus

返回当前市场实时状态（**同步，不发请求**）。

- **A 股**：仅按交易时段判断，**不识别法定假日**（SDK 不会为此发请求）。返回 `'closed'` 表示「周末或非交易时段」，可能是节假日 / 凌晨 / 深夜。如需精确判断「今天是否真的是交易日」，请用 `await sdk.calendar.isTradingDay()`。
- **港股 / 美股**：按「周一-周五 + 已知交易时段」判断，同样不识别假日。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `market` | `'A' \| 'HK' \| 'US'` | 否 | 目标市场，默认 `'A'` |

### 返回状态枚举

```ts
type MarketStatus =
  | 'pre_market'   // 盘前（含集合竞价）
  | 'open'         // 连续竞价交易中
  | 'lunch_break'  // 午间休市（A 股 11:30-13:00 / 港股 12:00-13:00；美股无）
  | 'after_hours'  // 盘后
  | 'closed';      // 非交易日 / 周末 / 远离交易时段
```

各市场交易时段（市场本地时间）：

| 市场 | 连续竞价时段 | 午休 |
|---|---|---|
| A 股 | 09:30–11:30、13:00–15:00 | 11:30–13:00 |
| 港股 | 09:30–12:00、13:00–16:00 | 12:00–13:00 |
| 美股 | 09:30–16:00（仅常规时段，不含盘前盘后） | 无 |

### 调用示例

```ts
sdk.calendar.marketStatus();      // A 股，如 'open' / 'lunch_break' / 'closed'
sdk.calendar.marketStatus('HK');  // 港股
sdk.calendar.marketStatus('US');  // 美股

// 精确判断 A 股「今天是否开市」：先看日历，再看时段
if (await sdk.calendar.isTradingDay() && sdk.calendar.marketStatus() === 'open') {
  // 正在交易
}
```

### 返回说明

返回 `MarketStatus` 字符串（同步返回，非 Promise）。

## 注意事项

1. **A 股交易日相关方法依赖上游日历**：`isTradingDay` / `nextTradingDay` / `prevTradingDay` 首次调用会拉取全量交易日列表（带 12 小时缓存），属异步方法。
2. **`marketStatus` 是纯本地计算**：同步返回，不发请求、不识别假日，仅按时段与星期判断；要识别 A 股假日须配合 `isTradingDay`。
3. **港股 / 美股无官方日历**：`nextTradingDay` / `prevTradingDay` / `isTradingDay` 仅覆盖 A 股；港股 / 美股仅 `marketStatus` 提供按时段的近似判断。
4. 底层完整交易日数组可经 [`sdk.reference.tradingCalendar()`](./reference.md) 获取。
