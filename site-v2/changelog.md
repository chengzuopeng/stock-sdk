---
pageClass: changelog-page
---

# 更新日志

本页记录 Stock SDK 的版本更新历史。最新的 v2.0.0 是一次**架构跃迁**——在不扩展数据源的前提下，重做了符号模型、数据契约、API 表面、请求层与错误体系，并新增 CLI / MCP 与 subpath 导出。

## v2.0.0-beta.1

> 本版汇总当前 `feature-v2` 尚未推送到远端的 v2 稳定化工作：完成命名空间单轨 API，修复多处请求 / 时间 / 符号 / provider 正确性问题，统一 CLI 与 MCP 的方法描述来源，并补齐 v2 文档站与 Playground。

### 破坏性变更

- **移除 v1 扁平门面方法**：删除 80 个 `sdk.getXxx()` / `sdk.xxx()` 兼容方法，仅保留 `sdk.<namespace>.<method>()` 与顶层 `sdk.search(keyword)`。调用方需按迁移指南改到命名空间 API。
- **CLI / MCP 参数契约收敛到共享 spec**：命令与 MCP 工具由 `src/spec/methods.ts` 派生，枚举、默认值和参数形态按同一事实源校验；不再维护两套手写映射。

### SDK 正确性

- **请求取消与超时分类更稳**：修复外部 `AbortSignal`、超时、`fetchImpl` 自定义实现、失败记账与熔断半开恢复的边界行为，避免把主动取消、真实超时和上游失败混成同一种错误。
- **时间与日期处理修复**：修正 `wallTimeToUTC` 在 DST 切换日的 1 小时偏差；统一日期归一与校验，减少 provider / SDK / CLI 之间的日期格式漂移。
- **符号解析收口**：`normalizeSymbol` 处理 hint 优先级、点分 secid、港美股 / 北交所 / 期货等歧义；修复跨市场 hint 被静默忽略导致取到错误市场数据的问题。
- **provider 韧性增强**：补上上游空响应、分页异常、direction 参数、负缓存、分红类型、东财 secid 等边界防护，减少空壳数据和裸异常泄漏。
- **指标与 K 线稳定性提升**：`kline.withIndicators` 支持更稳的暖机与 refetch 策略；修复递归型指标切片漂移；`addIndicators` 支持 `{ ma: [5, 20] }`、`{ rsi: { period: 14 } }` 等文档简写。

### CLI 与 MCP

- **`stock-sdk call` 修复**：修正命名空间方法 `this` 绑定问题，并用共享 walker / 白名单机制限制可调用路径。
- **MCP 工具派生化**：全量工具列表改为从共享 spec 派生，保留 `kline.withIndicators` 的嵌套指标配置手写适配。
- **MCP 入参边界更严格**：未知字段、类型不符、optional object 传 `null` 会返回 `INVALID_ARGUMENT`，不再流入 SDK 变成 `UNKNOWN`。
- **stdio 传输更稳**：补强 EPIPE / transport 边界处理，减少 MCP client 断开时的噪音错误。

### 性能与内部结构

- **指标计算优化**：SMA / BOLL / KDJ / 信号线等滑窗计算改为 rolling 实现，并用对拍测试钉住位级一致性。
- **K 线取数减少无效工作**：分钟 K 线尽量服务端裁剪；`withIndicators` 在可短路场景避免双请求；指标计算改为先裁剪后计算。
- **热路径小额分配优化**：减少 formatter key、逐 bar 对象重建、quote 双解析、`sortBy` 拷贝等热点开销。
- **平行实现收编**：统一符号 / 时间 / 解析 helper，合并三套路径 walker，抽出东财分钟 K 线工厂与日期 helper。

### 文档站与 Playground

- **v2 文档站升级**：新增红盘主题、首页实时行情 Hero、导航与视觉打磨。
- **完整 Playground**：新增 `site-v2` Playground 组件、方法分类、代码生成、运行器、参数覆盖与中英文页面。
- **CLI 文档补齐**：新增中英文 CLI commands 页面，覆盖命令、参数、输出格式和常见用法。
- **docs 校验接入 v2**：`docs:meta` / `docs:check` / GitHub Pages 构建链路支持 `site-v2`，并把旧错误示例加入 forbidden token 防回归。
- **文档示例对齐实现**：修正旧的 K 线周期写法、字符串数组指标、实例选股器、单次 signal、`--simple` 等与实现不一致的示例。

### Beta 阶段说明

- 单位统一仍是 v2 的目标契约；当前 beta 运行值暂以各 provider 原始口径为准，单位换算会在逐源真实数据校准后落地。
- 部分旧字段 / 旧类型名在 beta 阶段可能暂留以保护迁移；新代码建议面向命名空间 API、`Quote` 联合类型和 subpath 纯计算入口。

## v2.0.0-beta.0

> 🧪 **首个公开 Beta**（`npm i stock-sdk@beta`）：v2.0.0 的 API 表面已稳定，欢迎试用并反馈；正式版前仍可能有小幅调整。下列为相对 v1 的破坏性变更与新增能力。
>
> v2 采用**单轨硬切**——不提供 `compat` 兼容入口、不保留 v1 旧方法别名。从 v1 迁移请配合阅读 [v1 → v2 迁移指南](/guide/migration-v1-to-v2)。

### 破坏性变更

- **命名空间化 API**：105 个方法从扁平的 `sdk.getXxx()` 迁移到命名空间 `sdk.<ns>.<method>()`（如 `sdk.getFullQuotes()` → `sdk.quotes.cn()`、`sdk.getETFOptionDailyKline()` → `sdk.options.etf.dailyKline()`）。**无兼容别名**，完整映射见[迁移指南](/guide/migration-v1-to-v2)与 [API 总览](/api/)。
- **`Quote` 可辨识联合**：行情类型从各自独立的接口（`FullQuote` / `HKQuote` / `USQuote` / `FundQuote` …）收敛为按 `assetType` 判别的联合类型 `Quote`。旧类型名在 beta 阶段可能暂留以保护迁移；新代码建议统一面向 `Quote` 并用 `switch(q.assetType)` 收窄。
- **移除 `raw` 字段**：8 处返回值上的 `raw: string[]`（泄漏实现细节）全部删除。逃生舱改为 provider 层 `getXxxRaw()` 调试函数，不再混入数据对象。
- **单位与口径统一（目标契约）**：`volume`（成交量）目标口径统一为**股**；`amount` / `price` / 市值目标口径统一为**各自计价货币的主单位**（A 股 = 人民币元、港股 = 港元、美股 = 美元，由 `currency` 标明，**不跨币种折算**）；百分比统一为**百分数**（如 `5.2` 表示 5.2%）。正式落地后，部分数值口径会相对 v1 发生变化，回测 / 展示逻辑需重新校准。
  > ⚠️ 单位换算（手→股 ×100、万→元 ×10000 等）需用真实数据逐源校准，本期暂以各源原始口径输出，校准后落地——以最终实现为准。
- **`timestamp`：`NaN` → `null`**：无法解析的时间由 `NaN` 改为 `number | null`，判空从 `Number.isNaN(...)` 改为 `=== null`。同时为日期类记录补齐 `tz`（市场时区）字段。
- **清理旧入口与旧签名**：删除 v1 扁平方法与旧的 `boolean` 签名 `getAShareCodeList(boolean)` / `getUSCodeList(boolean)`，仅保留命名空间 API 与 options 对象签名。部分旧字段 / 旧类型名会在 beta 阶段暂留以保护迁移，最终以类型定义和迁移指南为准。
- **错误统一为 `SdkError`**：对外**只抛 `SdkError`**，不再透出裸 `TypeError` / `DOMException` / `RangeError`。所有错误带统一 `code`，新增 `ABORTED`（外部 signal 主动取消，区别于 `TIMEOUT`）与 `UPSTREAM_ERROR`（上游返回结构化错误，区别于空数据 `UPSTREAM_EMPTY`）两个错误码。可从 `stock-sdk/errors` 导入。

### 新增能力

- **统一符号模型**：`string` 一等公民 + 可选 `SymbolRef`；`normalizeSymbol` 容错解析（`sh600519` / `600519` / `600519.SH` / `00700` / `hk00700` / `AAPL` / `105.AAPL` / `rb2510` / `CFFEX.IF2412` 等）。详见[符号与代码规则](/guide/symbols)。
- **CLI**：`stock-sdk <command>` 在终端直接取行情 / K 线 / 搜索（`quote` / `kline` / `search` / `mcp` …），零依赖手写参数解析，默认 JSON 输出。
- **MCP server**：`stock-sdk mcp` 一条命令启动 MCP 服务，供 Cursor / Claude / Codex 等 AI 工具接入。**零依赖手写最小 MCP**（`stdio + tools` 子集），不引入 `@modelcontextprotocol/sdk`。
- **subpath 导出**：新增 `stock-sdk/indicators`、`stock-sdk/signals`、`stock-sdk/symbols`、`stock-sdk/screener`、`stock-sdk/cache`、`stock-sdk/errors` 子入口。只用纯计算（指标 / 符号 / 信号）的用户，bundle 不再拖入 `RequestClient` 与所有 provider。
- **请求层可组合化**：`RequestClientOptions` / `GetOptions` 新增 `fetchImpl`（注入自定义 fetch）与 `signal`（外部取消信号）；client 级新增生命周期 `hooks`。详见[请求治理](/guide/request-governance)。
- **信号层**：`calcSignals`（金叉 / 死叉 / 超买 / 超卖等事件识别），纯计算、零网络，从 `stock-sdk/signals` 导出。
- **选股器 + 回测**：`screen()` 本地筛选 + `backtest()` 策略回测，从 `stock-sdk/screener` 导出。
- **统一缓存层**：导出低层缓存原语（`MemoryCache` / `getSharedCache` / `cacheThrough`，经 `stock-sdk/cache` 子路径），SDK 内部用于交易日历、代码列表、板块映射的进程级缓存（TTL 分级）。注意：缓存目前为模块级共享（跨实例），「构造时注入 CacheStore 并按接口分级配置」尚未实现，列入 2.0.0 正式版 roadmap。

### 兼容性与基线

- **零运行时依赖**维持（CLI 与 MCP 均零依赖）；浏览器 + Node 18+ 双端；ESM + CJS 双格式。
- Node baseline 维持 `>=18`（`AbortSignal.any` 带运行时降级）。
- **单轨硬切**：v1 代码需按[迁移指南](/guide/migration-v1-to-v2)整体迁移，无平滑过渡路径。

---

> v1.x 的历史更新日志保留在 v1 文档站。本页自 v2.0.0 起记录。
