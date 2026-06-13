---
pageClass: changelog-page
---

# 更新日志

本页记录 Stock SDK 的版本更新历史。最新的 v2.0.0 是一次**架构跃迁**——在不扩展数据源的前提下，重做了符号模型、数据契约、API 表面、请求层与错误体系，并新增 CLI / MCP 与 subpath 导出。

## 2.0.0-beta.0

> 🧪 **首个公开 Beta**（`npm i stock-sdk@beta`）：v2.0.0 的 API 表面已稳定，欢迎试用并反馈；正式版前仍可能有小幅调整。下列为相对 v1 的破坏性变更与新增能力。
>
> v2 采用**单轨硬切**——不提供 `compat` 兼容入口、不保留旧类型别名。从 v1 迁移请配合阅读 [v1 → v2 迁移指南](/guide/migration-v1-to-v2)。

### 破坏性变更

- **命名空间化 API**：105 个方法从扁平的 `sdk.getXxx()` 迁移到命名空间 `sdk.<ns>.<method>()`（如 `sdk.getFullQuotes()` → `sdk.quotes.cn()`、`sdk.getETFOptionDailyKline()` → `sdk.options.etf.dailyKline()`）。**无兼容别名**，完整映射见[迁移指南](/guide/migration-v1-to-v2)与 [API 总览](/api/)。
- **`Quote` 可辨识联合**：行情类型从各自独立的接口（`FullQuote` / `HKQuote` / `USQuote` / `FundQuote` …）收敛为按 `assetType` 判别的联合类型 `Quote`。旧类型名（`FullQuote` / `HKUSHistoryKline` 等）移除，调用方用 `switch(q.assetType)` 收窄。
- **移除 `raw` 字段**：8 处返回值上的 `raw: string[]`（泄漏实现细节）全部删除。逃生舱改为 provider 层 `getXxxRaw()` 调试函数，不再混入数据对象。
- **单位与口径统一**：`volume`（成交量）目标口径统一为**股**；`amount` / `price` / 市值统一为**各自计价货币的主单位**（A 股 = 人民币元、港股 = 港元、美股 = 美元，由 `currency` 标明，**不跨币种折算**）；百分比统一为**百分数**（如 `5.2` 表示 5.2%）。**数值口径相对 v1 发生变化，回测 / 展示逻辑需重新校准。**
  > ⚠️ 单位换算（手→股 ×100、万→元 ×10000 等）需用真实数据逐源校准，本期暂以各源原始口径输出，校准后落地——以最终实现为准。
- **`timestamp`：`NaN` → `null`**：无法解析的时间由 `NaN` 改为 `number | null`，判空从 `Number.isNaN(...)` 改为 `=== null`。同时为日期类记录补齐 `tz`（市场时区）字段。
- **清除全部 `@deprecated`**：删除 16 处遗留的 `@deprecated` 字段（如 `tradeDate` 别名、`OptionLHBItem` 旧字段、`ComexInventory.inventory`、`FullQuote.volume2` 等）；删除旧的 `boolean` 签名 `getAShareCodeList(boolean)` / `getUSCodeList(boolean)`，仅保留 options 对象签名。
- **错误统一为 `SdkError`**：对外**只抛 `SdkError`**，不再透出裸 `TypeError` / `DOMException` / `RangeError`。所有错误带统一 `code`，新增 `ABORTED`（外部 signal 主动取消，区别于 `TIMEOUT`）与 `UPSTREAM_ERROR`（上游返回结构化错误，区别于空数据 `UPSTREAM_EMPTY`）两个错误码。可从 `stock-sdk/errors` 导入。

### 新增能力

- **统一符号模型**：`string` 一等公民 + 可选 `SymbolRef`；`normalizeSymbol` 容错解析（`sh600519` / `600519` / `600519.SH` / `00700` / `hk00700` / `AAPL` / `105.AAPL` / `rb2510` / `CFFEX.IF2412` 等）。详见[符号与代码规则](/guide/symbols)。
- **CLI**：`stock-sdk <command>` 在终端直接取行情 / K 线 / 搜索（`quote` / `kline` / `search` / `mcp` …），零依赖手写参数解析，默认 JSON 输出。
- **MCP server**：`stock-sdk mcp` 一条命令启动 MCP 服务，供 Cursor / Claude / Codex 等 AI 工具接入。**零依赖手写最小 MCP**（`stdio + tools` 子集），不引入 `@modelcontextprotocol/sdk`。
- **subpath 导出**：新增 `stock-sdk/indicators`、`stock-sdk/signals`、`stock-sdk/symbols`、`stock-sdk/screener`、`stock-sdk/cache`、`stock-sdk/errors` 子入口。只用纯计算（指标 / 符号 / 信号）的用户，bundle 不再拖入 `RequestClient` 与所有 provider。
- **请求层可组合化**：`RequestClientOptions` / `GetOptions` 新增 `fetchImpl`（注入自定义 fetch）与 `signal`（外部取消信号）；client 级新增生命周期 `hooks`。详见[请求治理](/guide/request-governance)。
- **信号层**：`calcSignals`（金叉 / 死叉 / 超买 / 超卖等事件识别），纯计算、零网络，从 `stock-sdk/signals` 导出。
- **选股器 + 回测**：链式 `sdk.screener()` 本地筛选 + `backtest()` 策略回测，从 `stock-sdk/screener` 导出。
- **统一缓存层**：导出低层缓存原语（`MemoryCache` / `getSharedCache` / `cacheThrough`，经 `stock-sdk/cache` 子路径），SDK 内部用于交易日历、代码列表、板块映射的进程级缓存（TTL 分级）。注意：缓存目前为模块级共享（跨实例），「构造时注入 CacheStore 并按接口分级配置」尚未实现，列入 2.0.0 正式版 roadmap。

### 兼容性与基线

- **零运行时依赖**维持（CLI 与 MCP 均零依赖）；浏览器 + Node 18+ 双端；ESM + CJS 双格式。
- Node baseline 维持 `>=18`（`AbortSignal.any` 带运行时降级）。
- **单轨硬切**：v1 代码需按[迁移指南](/guide/migration-v1-to-v2)整体迁移，无平滑过渡路径。

---

> v1.x 的历史更新日志保留在 v1 文档站。本页自 v2.0.0 起记录。
