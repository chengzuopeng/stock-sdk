# 从 v1 迁移到 v2

v2 是一次**架构跃迁**而非「再加接口」：在不扩展数据源的前提下，重做了符号模型、数据契约、API 表面、请求层与错误体系。v2 采用**单轨硬切**——不提供 `compat` 兼容入口、不保留旧类型别名。本页帮你把 v1 代码平滑迁移到 v2。

## 概览：v1 → v2 变了什么

| 维度 | v1 | v2 |
|---|---|---|
| API 表面 | 扁平 `sdk.getXxx()`（105 个方法平铺） | 命名空间 `sdk.<ns>.<method>()` |
| 符号入参 | 各方法格式不一，散落处理 | `string` 一等公民 + `SymbolRef`，统一 `normalizeSymbol` |
| 行情类型 | `FullQuote` / `HKQuote` / `USQuote` … 各自独立 | `Quote` 可辨识联合（by `assetType`） |
| 逃生舱 | 返回值带 `raw: string[]` | 移除 `raw`，改 provider 层 `getXxxRaw()` 调试函数 |
| 无效时间 | `timestamp: NaN` | `timestamp: number \| null` |
| 错误 | 透出裸 `TypeError` / `DOMException` / `HttpError` | 统一 `SdkError` 体系（带 `code`） |
| 导出 | 单入口 | 主入口 + subpath（`indicators` / `signals` / `symbols` …） |

## 1. 方法名映射：sdk.getXxx() → sdk.&lt;ns&gt;.&lt;method&gt;()

所有方法迁移到命名空间，**无兼容别名**。下表给出常用映射；完整命名空间见 [API 总览](/api/)。

### quotes（行情）

| v1 | v2 |
|---|---|
| `sdk.getFullQuotes(codes)` | `sdk.quotes.cn(codes)` |
| `sdk.getSimpleQuotes(codes)` | `sdk.quotes.cnSimple(codes)` |
| `sdk.getHKQuotes(codes)` | `sdk.quotes.hk(codes)` |
| `sdk.getUSQuotes(codes)` | `sdk.quotes.us(codes)` |
| `sdk.getFundQuotes(codes)` | `sdk.quotes.fund(codes)` |
| `sdk.getFundFlow(codes)` | `sdk.quotes.fundFlow(codes)`（简版） |
| `sdk.getPanelLargeOrder(codes)` | `sdk.quotes.largeOrder(codes)` |
| `sdk.getTodayTimeline(code)` | `sdk.quotes.timeline(code)` |

### codes / batch（代码列表与批量）

| v1 | v2 |
|---|---|
| `sdk.getAShareCodeList(opts)` | `sdk.codes.cn(opts)` |
| `sdk.getUSCodeList(opts)` | `sdk.codes.us(opts)` |
| `sdk.getHKCodeList()` | `sdk.codes.hk()` |
| `sdk.getFundCodeList()` | `sdk.codes.fund()` |
| `sdk.getAllAShareQuotes(opts)` | `sdk.batch.cn(opts)` |
| `sdk.getAllHKShareQuotes(opts)` | `sdk.batch.hk(opts)` |
| `sdk.getAllUSShareQuotes(opts)` | `sdk.batch.us(opts)` |
| `sdk.getAllQuotesByCodes(codes, opts)` | `sdk.batch.byCodes(codes, opts)` |
| `sdk.batchRaw(params)` | `sdk.batch.raw(params)` |

### kline（K 线）

| v1 | v2 |
|---|---|
| `sdk.getHistoryKline(...)` | `sdk.kline.cn(...)` |
| `sdk.getMinuteKline(...)` | `sdk.kline.cnMinute(...)` |
| `sdk.getHKHistoryKline(...)` | `sdk.kline.hk(...)` |
| `sdk.getHKMinuteKline(...)` | `sdk.kline.hkMinute(...)` |
| `sdk.getUSHistoryKline(...)` | `sdk.kline.us(...)` |
| `sdk.getUSMinuteKline(...)` | `sdk.kline.usMinute(...)` |
| `sdk.getKlineWithIndicators(...)` | `sdk.kline.withIndicators(...)` |

### board / options / futures（二级命名空间）

| v1 | v2 |
|---|---|
| `sdk.getIndustryList()` / `getIndustrySpot(s)` … | `sdk.board.industry.list()` / `.spot(s)` … |
| `sdk.getConceptList()` / `getConceptConstituents(s)` … | `sdk.board.concept.list()` / `.constituents(s)` … |
| `sdk.getIndexOptionSpot(...)` / `getIndexOptionKline(...)` | `sdk.options.index.spot(...)` / `.kline(...)` |
| `sdk.getETFOptionDailyKline(...)` | `sdk.options.etf.dailyKline(...)` |
| `sdk.getETFOption5DayMinute(...)` | `sdk.options.etf.fiveDayMinute(...)` |
| `sdk.getCommodityOptionSpot(...)` | `sdk.options.commodity.spot(...)` |
| `sdk.getCFFEXOptionQuotes(...)` | `sdk.options.cffex.quotes(...)` |
| `sdk.getOptionLHB(symbol, date)` | `sdk.options.lhb(symbol, date)` |
| `sdk.getFuturesKline(...)` | `sdk.futures.kline(...)` |
| `sdk.getGlobalFuturesSpot(...)` | `sdk.futures.globalSpot(...)` |
| `sdk.getComexInventory(...)` | `sdk.futures.comexInventory(...)` |

### 其余命名空间（一级平铺）

| v1 | v2 |
|---|---|
| `sdk.getIndividualFundFlow(...)` / `getSectorFundFlowRank(...)` … | `sdk.fundFlow.individual(...)` / `.sectorRank(...)` … |
| `sdk.getNorthboundSummary(...)` / `getNorthboundHistory(...)` … | `sdk.northbound.summary(...)` / `.history(...)` … |
| `sdk.getZTPool(...)` / `getStockChanges(...)` | `sdk.marketEvent.ztPool(...)` / `.stockChanges(...)` |
| `sdk.getDragonTigerDetail(...)` / `getDragonTigerInstitution(...)` … | `sdk.dragonTiger.detail(...)` / `.institution(...)` … |
| `sdk.getBlockTradeDetail(...)` / `getBlockTradeDailyStat(...)` | `sdk.blockTrade.detail(...)` / `.dailyStat(...)` |
| `sdk.getMarginAccountInfo(...)` / `getMarginTargetList(...)` | `sdk.margin.accountInfo(...)` / `.targetList(...)` |
| `sdk.getFundNavHistory(...)` / `getFundEstimate(...)` … | `sdk.fund.navHistory(...)` / `.estimate(...)` … |
| `sdk.isTradingDay(...)` / `nextTradingDay(...)` … | `sdk.calendar.isTradingDay(...)` / `.nextTradingDay(...)` … |
| `sdk.getDividendDetail(symbol)` / `getTradingCalendar()` | `sdk.reference.dividendDetail(symbol)` / `.tradingCalendar()` |
| `sdk.search(keyword)` | `sdk.search(keyword)`（顶层保留） |

> 指标计算从主包改为 subpath：`import { calcMACD } from 'stock-sdk/indicators'`；信号层 `import { calcSignals } from 'stock-sdk/signals'`；符号解析 `import { normalizeSymbol } from 'stock-sdk/symbols'`。

## 2. 数据契约变化

### raw 字段移除

v1 中 8 处返回值带 `raw: string[]`（`FullQuote` / `HKQuote` / `USQuote` / `FundQuote` / `FundFlow` …）。v2 **全部移除**，逃生舱改为 provider 层 `getXxxRaw()` 调试函数，不再混入数据对象。

```ts
// v1
const [q] = await sdk.getFullQuotes(['sh600519']);
console.log(q.raw); // ['1', '贵州茅台', ...]

// v2：契约里没有 raw；需要原始字段请用 provider 层调试函数
```

### 单位与口径

- `volume`（成交量）目标口径统一为**股**；
- `amount` / `price` / 市值目标口径统一为**各自计价货币的主单位**（A 股 = 人民币元、港股 = 港元、美股 = 美元，由 `currency` 标明，**不跨币种折算**）；
- 百分比统一为**百分数**（如 `5.2` 表示 5.2%）。

> 这是 v2 的目标数据契约；正式落地后部分数值口径会相对 v1 发生变化，**回测 / 展示逻辑需重新校准**。`currency` 字段现为每条 quote 必填。
>
> ⚠️ 单位换算（手→股 ×100、万→元 ×10000 等）需用真实数据逐源校准，本期暂以各源原始口径输出，校准后落地。以最终实现为准。

### timestamp：NaN → null

无法解析的时间在 v1 用 `NaN` 表达，v2 改为 `null`。同时新增 `tz`（市场时区）字段。

```ts
// v1：判空要查 Number.isNaN
if (Number.isNaN(q.timestamp)) { /* 无效 */ }

// v2：判空用 === null
if (q.timestamp === null) { /* 无效 */ }
```

### Quote 可辨识联合

行情类型从「各自独立的接口」收敛为按 `assetType` 判别的联合类型 `Quote`。旧类型名（`FullQuote` / `HKUSHistoryKline` 等）可能仍以兼容别名保留，但新代码建议统一面向 `Quote`。调用方用 `switch` 收窄：

```ts
import type { Quote } from 'stock-sdk';

function render(q: Quote) {
  switch (q.assetType) {
    case 'stock':
      // 这里 q 被收窄为股票 quote，可访问 pe / bid / ask 等
      console.log(q.price, q.changePercent);
      break;
    case 'fund':
      // 收窄为基金 quote，可访问 nav / accNav
      console.log(q.nav, q.accNav);
      break;
  }
}
```

> 联合的具体判别维度与各分支字段以最终实现为准；迁移范式（`switch(q.assetType)`）稳定。

## 3. 错误体系

v2 对外**只抛 `SdkError`**，不再透出裸 `TypeError` / `DOMException` / `RangeError`。所有错误带统一 `code`，可从 `stock-sdk/errors` 导入。

可用错误码（`SdkErrorCode`）：

```
NETWORK_ERROR · TIMEOUT · ABORTED · HTTP_ERROR · RATE_LIMITED
CIRCUIT_OPEN · UPSTREAM_EMPTY · UPSTREAM_ERROR · PARSE_ERROR
INVALID_SYMBOL · INVALID_ARGUMENT · NOT_FOUND
```

其中 `ABORTED`（外部 signal 主动取消，区别于 `TIMEOUT`）与 `UPSTREAM_ERROR`（上游返回结构化错误，区别于空数据 `UPSTREAM_EMPTY`）为 v2 新增。

错误子类：`HttpError` / `UpstreamEmptyError` / `UpstreamError` / `AbortedError` / `NotFoundError` / `InvalidArgumentError` / `InvalidSymbolError`。

```ts
// v1：可能拿到 DOMException / TypeError / HttpError
try {
  await sdk.getSimpleQuotes(['sh000001']);
} catch (e) {
  if (e instanceof DOMException && e.name === 'AbortError') { /* 超时 */ }
}

// v2：统一 SdkError，用 code 分类
import { SdkError, getSdkErrorCode } from 'stock-sdk/errors';

try {
  await sdk.quotes.cnSimple(['sh000001']);
} catch (e) {
  if (e instanceof SdkError) {
    switch (e.code) {
      case 'TIMEOUT':   /* 超时 */ break;
      case 'ABORTED':   /* 外部取消 */ break;
      case 'HTTP_ERROR': /* 非 2xx */ break;
    }
  }
  console.log(getSdkErrorCode(e));
}
```

详见[错误处理与重试](/guide/retry)。

## 4. 完整 before / after

```ts
// ============ v1 ============
import { StockSDK } from 'stock-sdk';
import { calcMACD } from 'stock-sdk'; // 主包导出

const sdk = new StockSDK();

const quotes = await sdk.getFullQuotes(['sh600519']);
const kline = await sdk.getETFOptionDailyKline('10004336');
const dividends = await sdk.getDividendDetail('600519');

console.log(quotes[0].raw);

try {
  await sdk.getSimpleQuotes(['bad']);
} catch (e) {
  if (e instanceof DOMException) { /* ... */ }
}
```

```ts
// ============ v2 ============
import { StockSDK } from 'stock-sdk';
import { calcMACD } from 'stock-sdk/indicators'; // subpath 导出
import { SdkError } from 'stock-sdk/errors';

const sdk = new StockSDK();

const quotes = await sdk.quotes.cn(['sh600519']); // 或 ['600519']
const kline = await sdk.options.etf.dailyKline('10004336');
const dividends = await sdk.reference.dividendDetail('600519');

// 不再有 raw；timestamp 无效值为 null
if (quotes[0].timestamp === null) { /* 无有效时间 */ }

try {
  await sdk.quotes.cnSimple(['bad']);
} catch (e) {
  if (e instanceof SdkError) {
    console.log(e.code); // 统一错误码
  }
}
```

## 5. 其它清理项

- v1 扁平方法已移除；部分旧字段 / 旧类型名可能仍以兼容别名保留，最终以类型定义为准。
- 删除旧的 `boolean` 签名：`getAShareCodeList(boolean)` / `getUSCodeList(boolean)` 仅保留 options 对象签名（对应 v2 `codes.cn(opts)` / `codes.us(opts)`）。
- Node baseline 维持 `>=18`（`AbortSignal.any` 带运行时降级）。
- 新增 subpath 导出：`stock-sdk/{indicators,symbols,signals,screener,cache,errors}`。

## 迁移建议步骤

1. **替换方法名**：按上面映射表把所有 `sdk.getXxx()` 改为 `sdk.<ns>.<method>()`。
2. **改 import 路径**：指标 / 信号 / 符号 / 错误改用对应 subpath。
3. **去掉 `raw` 用法**：契约里不再有 `raw` 字段。
4. **改时间判空**：`Number.isNaN(timestamp)` → `timestamp === null`。
5. **改错误处理**：统一 `instanceof SdkError` + `e.code`，去掉对裸 `DOMException` / `TypeError` 的判断。
6. **重新校准数值口径**：成交量 / 成交额 / 百分比口径变化，回测与展示逻辑需复核。
7. **收窄 Quote 联合**：用 `switch(q.assetType)` 替代对旧具体类型的依赖。

> 方法映射与契约变化为稳定约定；个别方法的精确参数 / 返回字段以最终实现为准。
