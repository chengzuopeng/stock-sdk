---
pageClass: changelog-page
---

# 更新日志

本页记录 Stock SDK 的版本更新历史。v2.0.0 是一次**架构跃迁**——在不扩展数据源的前提下，重做了符号模型、数据契约、API 表面、请求层与错误体系，并新增 CLI / MCP 与 subpath 导出。

## v2.4.0

> 发布时间：待发布

本版本落地 2026-07 全工程 review 的 Top15 修复（R7-1 ~ R7-15）：符号契约、数据健壮性、浏览器并发安全、缓存治理与翻页性能。

### 修复

- **符号前缀不再吞真实美股 ticker（R7-1）**：`normalizeSymbol('USB')` 此前被剥成 `US/B`（静默返回 Barnes Group 的数据）、`'HKD'` 被剥成 `HK/0000D`。字母 rest 现在只认两种无歧义形态——小写前缀 + 大写开头（`usAAPL` / `hkHSI` / `usBRK.A`）、全小写且 rest ≥ 3（`usaapl`）；数字 rest 任意大小写照剥。`externalLinks` 的本地预剥离一并收编，`USB` 类修复直达链接生成。
- **行情 codes 入口"带不带前缀均可"落地（R7-2/R7-3）**：`quotes.cn/cnSimple/hk/us/fundFlow/largeOrder` 全部经 `tryToTencentSymbols` 容错归一——裸代码（`'600036'`）此前必空、带前缀（`'hk00700'` / `'usBABA'`）此前被双拼成 `hkhk00700` / `ususBABA` 必空。无法映射的代码（如中证特殊指数码）逐码跳过，不影响批量调用的其它代码。
- **美股 K 线支持裸 ticker（R7-4）**：`kline.us / usMinute / chips.us` 及 CLI / MCP 自动路由的 `'AAPL'` 此前直传非法 secid，全线静默"无数据"。现在按"代码表 → 105/106/107 探测"解析交易所前缀，命中缓存 7 天、未收录负缓存 1 小时；转板（NYSE↔NASDAQ）/ 退市极罕见，靠命中 TTL 到期自然重解析覆盖。
- **搜索并发安全（R7-5）**：浏览器端 `sdk.search()` 收编到 `core/jsVars`——此前手写注入无互斥（并发搜索互相覆盖 `v_hint`，拿到对方关键词的结果或空）也无超时（脚本挂起 promise 永不 resolve）；`v_hint` 走专属互斥队列，不再被基金大文件下载排队拖慢。
- **jsVars 残留变量防护（R7-10）**：顶层 `var` 全局不可 delete，此前请求 A 的残留数据会被归属到脚本未定义该变量的请求 B（基金数据张冠李戴）。注入前预置 `undefined` + 读取侧 `undefined` 门 + 超时二次清扫。
- **ATR 暖机期脏数据恢复（R7-6）**：暖机期内一根 null bar 此前让整条序列 ATR（连带 KC）永远 null；现在窗口滑过脏点后恢复播种。干净数据输出逐位不变。
- **SAR 前导无效 bar 播种（R7-7）**：首根 K 线 high/low 为 null 时此前以 0 价播种（长段非 null 垃圾、趋势冻结）；现在跳过前导无效 bar，输出与"裁掉前导后重算"逐位等价。干净数据输出逐位不变。
- **基金净值 / 排名历史脏行防御（R7-8）**：上游一行非有限时间戳此前抛 `RangeError` 毁掉整个结果、`x` 缺失会静默产出"今天"的幽灵行——现在逐行过滤；`accNav` / `percentile` 不再裸 cast 直通字符串。
- **腾讯行情截断行不再伪造零值（R7-9）**：行过滤阈值与解析器最高访问下标机械绑定（此前 `>5` 放行截断行，`safeNumber(undefined)=0` 把涨跌幅/高低/成交额伪造成 0）；港股 `currency` 加 3 位大写字母语义校验。
- **datacenter 系接口 symbol 全形态归一（R7-12）**：`dividend.detail` 此前对 `'SH600519'` 静默返回空（去前缀正则漏 `/i`）；`'600519.SH'` / `'1.600519'` 形态在 dividend / dragonTiger / northbound 三处此前全部静默空。
- **缓存跨实例串数据（R7-11）**：代码表 / 交易日历 / 板块名称映射此前是仅按名字键控的模块级全局缓存——mock / 代理 fetchImpl 实例取回的数据会串给其它 `StockSDK` 实例最长 6-12 小时。现按实例隔离。
- **`evictLRU` 空字符串键淘汰失效**：`''` 为 LRU 时此前淘汰永久失效（缓存无界增长）。

### 行为变更（升级请注意）

- **`FundNavPoint.nav`：`number` → `number | null`**。上游该行净值缺失 / 非数值时为 `null`，与 `accNav` / `dailyReturn` 口径一致。迁移：对 `nav` 做算术前判空（此前这类行会让整个调用抛 `RangeError` 或悄悄携带脏值，并非可用数据）。
- **美股 K 线无效 ticker：静默空数组 → 抛 `NotFoundError`**。迁移：捕获 `NotFoundError` 或先校验代码。
- **腾讯行情截断行：伪造 0 值 → 整行丢弃**（结果条数可能少于此前，少的是脏数据）。
- **dividend / dragonTiger / northbound 的垃圾 symbol：静默空数组 → 抛 `InvalidSymbolError`**。
- **`clearSharedCaches()` 不再覆盖实例级缓存**（代码表 / 交易日历 / 板块映射 / us-secid）——强刷请用新增的 `sdk.clearCaches()`。
- **`getSharedCache(ns, options)` 命中已存在 namespace 且 options 不等价时输出一次 `console.warn`**（此前静默忽略）；运行时调整用新增的 `configureSharedCache()`。
- **datacenter 系接口翻页并发化（R7-14）**：默认 3 路波次并发（`DatacenterQuery.concurrency` 可调，设 1 退化串行）。全市场资金流排名等多页接口墙钟显著下降；坏页仍是"前缀截断"语义，不会出现中部空洞。注意默认部署没有 RateLimiter（仅显式配置时创建），如对上游频控敏感请配置 `rateLimit`（顶层选项，对所有 provider 生效）。
- **全大写前缀 + 字母的形态不再剥前缀**（R7-1 的已知取舍）：`'USAAPL'` 现在按完整 ticker 解析为 `US/USAAPL`（此前剥成 `AAPL`）。迁移：用规范形 `'usAAPL'`、点分 `'AAPL.US'` 或 `market` hint。

### 新增

- `StockSDK.clearCaches()`：清空本实例全部内部缓存（代码表 / 交易日历 / 板块映射 / us-secid）。
- `configureSharedCache(namespace, options)`：运行时重配共享缓存（新 TTL 只影响后续写入，maxSize 收缩立即淘汰）。
- `tryToTencentSymbols(codes, market)`（`stock-sdk/symbols`）：行情键批量容错归一，返回 `{ keys, invalid }`。
- `DatacenterQuery.concurrency`：datacenter 系接口翻页并发波次大小。
- **大宗交易 / 融资融券的 5 个 MCP 工具**：`get_block_trade_market_stat` / `get_block_trade_detail` / `get_block_trade_daily_stat` / `get_margin_account_info` / `get_margin_target_list`。此前这两个数据域仅 CLI / SDK 可用、MCP 未暴露；现在 LLM 也能查大宗交易总览/明细/每日统计与两融账户/标的（能力早已在 SDK，本次仅补 MCP 派生）。
- **MCP Skills（Prompts）——7 个场景化分析技能**：server 声明 `capabilities.prompts`，实现 `prompts/list` + `prompts/get`，把此前只是文档概念的「内置技能」落地为 MCP 协议真正的 Prompts 能力，支持的客户端（Claude Desktop / Claude Code / Cursor / Cline）可在斜杠命令 / 模板里一键触发。内置 core 4（`analyze_stock` / `screen_stocks` / `market_overview` / `monitor_watchlist`）+ full 3（`analyze_capital_flow` / `analyze_fund` / `diagnose_stock`）；`STOCK_SDK_MCP_PROMPTS`（core / full / 名单）控制范围，与工具集独立过滤。编排指令为英文、模板末尾统一指示模型「用用户语言作答」。server 只下发「任务说明书」，多步执行由客户端模型 + `tools/call` 循环完成，全程只读、不下单不移动资金。见 [AI Skills](/mcp/skills)。
- **`get_kline_signals` MCP 工具 + `sdk.kline.signals(symbol, options)`**：识别 14 类技术指标信号（MA / MACD / KDJ 金叉死叉、KDJ / RSI 超买超卖、BOLL 突破、SAR 反转），内部串 `withIndicators` + `calcSignals` 并对齐指标/信号周期，返回每条信号的类型 / 日期 / 收盘价。`maFast` / `maSlow`（默认 5 / 20）可调交叉周期。兑现 skills.md 一直宣称、但此前 MCP 拿不到的 signals 能力（`calcSignals` 原仅在 `stock-sdk/signals` subpath），也是技术类技能的取数闭环。
- spec ↔ SDK 全量 contract 测试（R7-15）：方法路径与 MCP options 键集机械钉住，重命名不再静默漂移。技能侧同风格新增 `prompts-contract`：技能引用的工具必须真实存在、core 技能不越级引用 full 工具、模板确实点了名。

::: tip 长驻进程建议复用单例 SDK
v2.4.0 起实例级缓存按 `StockSDK` 实例隔离（修复跨实例串数据）。"每请求 `new StockSDK()`"的写法会让每个实例冷启缓存（代码表 6h 缓存失效为每请求一次）——长驻服务请复用单例。
:::

## v2.3.0

> 发布时间：2026-07-06

### 新增

- **筹码分布 `sdk.chips.cn / hk / us`**（[#57](https://github.com/chengzuopeng/stock-sdk/issues/57)，感谢 [@hawx1993](https://github.com/hawx1993) 的需求反馈）：基于日 K 线 + 换手率**本地计算**（东方财富前端 CYQ 算法的 TypeScript 移植，零新增数据源），输出每日获利比例、平均成本、90 / 70 成本区间与集中度，`includeHistogram` 可附带 150 价格档的**筹码峰直方图**。单测与东财原版 JS 逐日逐字段黄金对拍。
  - 纯函数 `calcChipDistribution(klines, options)` 从 `stock-sdk/indicators` 导出，可喂自备 K 线；`tail` 选项避免全量累计口径下的 O(N²) 计算
  - 口径说明：`range` 默认 `120`（东财 App 显示口径），`{ range: 0, adjust: '' }` 可复现 akshare `stock_cyq_em` 输出；详见 [chips 文档](/api/chips)
  - CLI `stock-sdk chips cn 600519` 与 MCP 工具 `get_chip_distribution`（core 工具集）/ `get_hk_chip_distribution` / `get_us_chip_distribution` 同步派生
- **个股盘口异动 `marketEvent.individualChanges` / `individualChangesHistory`**（[#54](https://github.com/chengzuopeng/stock-sdk/issues/54)，感谢 [@hawx1993](https://github.com/hawx1993) 的需求反馈）：单只 A 股某交易日的全类型异动事件流（时间 / 类型 / 触发价 / 涨跌幅），以及近 N 天（1~60，默认 7）按交易日历聚合的异动历史——逐日 `available` 标注、`coverage` 覆盖范围、`stats` 按类型码计数（含中文标签）。
  - 数据源为东财 push2ex 个股接口（akshare 未收录）；服务端仅保留约最近数周且**存在个别日期空洞**，请以逐日 `available` 为准
  - 30 天完整视角的组合方案见新指南[「个股 30 天异动全景」](/guide/stock-changes-panorama)
  - MCP 工具 `get_individual_stock_changes` / `get_individual_stock_changes_history` 与 CLI 命令同步派生
- **`marketEvent.stockChanges` 支持多类型与全量**：`type` 参数放宽为 `StockChangeType | StockChangeType[] | 'all'`，`'all'` 一次拉取全部 22 类并按服务端总数自动翻页收全（交易日全类型总量可达上万条）。

### 行为变更

- **`StockChangeItem` 字段扩展**：新增 `typeCode`（服务端原始类型码）；`changeType` 类型由 `StockChangeType` 拓宽为 `StockChangeType | 'unknown'`（服务端新增未知类型码时不再丢数据）。对 `changeType` 做穷举 switch 的消费端需补 `'unknown'` 分支。

## v2.2.2

> 发布时间：2026-07-04

### 新增

- **指标输出精度选项 `decimals`**：舍入型指标（ma / macd / boll / kdj / rsi / wr / bias / cci / atr）的 options 新增 `decimals?: number`，按需指定输出小数位（如 `calcMA(closes, { periods: [5], decimals: 2 })`），SDK / `kline.withIndicators` / MCP 全链路可用。

### 行为变更

- **指标输出默认精度 2 位 → 3 位小数**（基于 [#55](https://github.com/chengzuopeng/stock-sdk/pull/55)，感谢 [@Ahaochan](https://github.com/Ahaochan)）：低价标的（如 3 元 ETF）的均线曲线不再因精度不足呈阶梯状。注意这不只是"多一位小数"：MACD / BOLL / BIAS 消费内部已舍入的 EMA/SMA 中间值，重舍回 2 位后部分数值在**第 2 位**即与旧版不同（实测约半数 MACD 柱值受影响，金叉/死叉可能偏移 ±1 根），KC 亦随内部 EMA/ATR 精度联动；依赖指标数值快照/缓存的回测请重新校准。9 份重复的 `round()` 已收编为共享模块（`decimals` 默认值单点维护）。
- obv / roc / dmi / sar / kc 输出维持裸浮点（不舍入），与既有行为一致。

## v2.2.1

> 发布时间：2026-07-03

### 新增

- **东方财富特殊指数支持**（基于 [#51](https://github.com/chengzuopeng/stock-sdk/pull/51) 重构，感谢 [@wubh2012](https://github.com/wubh2012)）：中证指数按码形识别（`93xxxx` / `H`+5 位，如 `930955`、`H30533`，secid 前缀 `2.`，经 `kline.cn` 使用）；具名指数 `HSHCI`（恒生医疗保健指数，`124.`，经 `kline.hk`）与 `GDAXI`（德国 DAX，`100.`，经 `kline.us('100.GDAXI')` raw-secid 直通）。对应 secid 形（`2.930955` 等）成为合法输入且产出可回读。

### 修复

- 中证指数此前被按「9 开头 → 沪市」推断拼出 `1.930955` 类 secid，K 线静默返回空数组；按码形识别后全家族（含未来新码）一次修复。

### 行为变更

- 特殊指数码形为**语法确定**分类：矛盾 hint 与前缀 / 后缀断言（`sh930955`、`hkHSHCI` 等）抛 `InvalidSymbolError` 并给出指引；`usGDAXI`、`1.930955` 等显式断言保持原语义。`marketOf('HSHCI')` 变为 `'HK'`，`marketOf('GDAXI')` 变为 `'GLOBAL'`。
- 不支持场景统一 fail-fast（此前静默空数组或必空查询）：`toTencentSymbol` / CLI `quote` / `fundFlow.individual` 对特殊指数报错，自动路由入口对 `GLOBAL` 符号给出 raw-secid 指引。已知限制见[符号指南](/guide/symbols)。

## v2.2.0

> 发布时间：2026-06-27

### 新增

- **主题基金 API `sdk.fund.theme.*`**：按行业 / 概念主题维度浏览基金，并同步派生到 CLI 与 MCP（`get_theme_list` / `get_theme_funds`）。
  - `getThemeList(options?)` —— 全部主题列表（行业 / 概念，含日涨幅与近 1 周 / 1 月 / 3 月 / 6 月 / 1 年 / 3 年 / 5 年各阶段收益率，支持排序分页）
  - `getThemeFunds(themeCode, options?)` —— 指定主题下的基金排行（含基金类型、各阶段收益率、最新净值）

## v2.1.0

> 发布时间：2026-06-23

### 新增

- **`sdk.fund.profile(code)`**：一次请求获取基金深度资料（东方财富 pingzhongdata 全量字段）——前十大重仓股、前五大债券、季度资产配置、每日股票仓位测算、基金经理（含星级与能力评分）、业绩评价、持有人结构、规模变动、申购赎回、阶段收益率（近 1 / 3 / 6 月、近 1 年）、同类基金。与 `navHistory` / `rankHistory` 同源（同一份 pingzhongdata 文件），并同步派生到 CLI（`fund profile`）与 MCP（`get_fund_profile`）。

### 修复

- **基金日期口径修正**：`fund.navHistory` / `fund.rankHistory` / `fund.profile` 返回的日期此前按 UTC 日期切片，比真实交易日早一天（pingzhongdata 的时间戳是北京时间零点）；改按北京时区取日期，已用天天基金权威净值日期（`jzrq`）校验。
- **`fetchJsVars` 单引号兼容**：Node 端对单引号 JS 字面量（如 `swithSameType`）增加兜底解析，与浏览器 `<script>` 注入路径对齐，避免该类字段在 Node 端解析失败而丢失。

## v2.0.0

> 发布时间：2026-06-18
>
> v2.0.0 是 v2 的首个稳定版本，汇总了 beta 阶段以来的所有改动。详尽变更与破坏性说明见下方 `v2.0.0-beta.1` 条目；从 v1 升级请先阅读 [v1 → v2 迁移指南](/guide/migration-v1-to-v2)。

### 自 beta.1 以来

- 文档站接管主域 `stock-sdk.linkdiary.cn`；v1 文档归档至 [v1.stock-sdk.linkdiary.cn](https://v1.stock-sdk.linkdiary.cn)
- 接入 Grafana Faro 监控独立 collect 通道（app: `stock-sdk-docs-v2`），生产构建上传 sourcemap
- 首页红盘主题 + 实时行情 Hero + 完整 Playground 重做
- npm dist-tag：`stock-sdk` 的 `latest` 指向 v2.0.0；v1 稳定版以 `stock-sdk@legacy`（1.10.1）继续可装

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
