# MCP 工具表

`stock-sdk` 的 MCP server 把 SDK 的**只读命名空间方法**暴露为 tools。每个 tool 都是显式声明的 `ToolDef`——`name`、`description`、手写 JSON Schema 的 `inputSchema`，以及把参数显式映射到 SDK 调用的 `invoke`，统一收进一份 manifest 作为单一事实源（SSOT），与 CLI 共用。

> **具体工具以实现为准。** 下表是从只读命名空间方法派生的工具概览，工具名、入参字段以最终实现的 manifest 为准。写操作、调试用的 `*Raw` 方法不暴露为工具。

## 工具概览

| 工具（派生自） | 命名空间方法 | 说明 |
|---|---|---|
| 行情 | `sdk.quotes.cn` / `cnSimple` / `hk` / `us` / `fund` | A 股全量/简要、港股、美股、基金行情 |
| 分时与盘口 | `sdk.quotes.timeline` / `largeOrder` / `fundFlow` | 当日分时、盘口大单、资金流简版 |
| 批量行情 | `sdk.batch.cn` / `hk` / `us` / `byCodes` | 全市场或按代码批量取行情 |
| K 线 | `sdk.kline.cn` / `hk` / `us` / `cnMinute` / `hkMinute` / `usMinute` | 历史 K 线与分钟 K 线 |
| 带指标 K 线 | `sdk.kline.withIndicators` | K 线 + 内置技术指标 |
| 指标信号 | `sdk.kline.signals` | 金叉死叉 / 超买超卖 / 突破 / 反转，共 14 类信号识别 |
| 筹码分布 | `sdk.chips.cn` / `hk` / `us` | 获利比例 / 平均成本 / 成本区间与集中度 / 筹码峰 |
| 代码列表 | `sdk.codes.cn` / `us` / `hk` / `fund` | 各市场代码清单 |
| 板块 | `sdk.board.industry.*` / `sdk.board.concept.*` | 行业 / 概念板块列表、行情、成分、K 线 |
| 资金流 | `sdk.fundFlow.individual` / `market` / `rank` / `sectorRank` | 个股 / 大盘 / 排行 / 板块资金流 |
| 北向资金 | `sdk.northbound.minute` / `summary` / `holdingRank` / `individual` | 沪深港通 / 北向资金 |
| 市场异动 | `sdk.marketEvent.ztPool` / `stockChanges` / `boardChanges` | 涨停池 / 盘口异动 / 板块异动 |
| 龙虎榜 | `sdk.dragonTiger.detail` / `stockStats` / `institution` / `branchRank` | 龙虎榜明细与统计 |
| 大宗交易 | `sdk.blockTrade.marketStat` / `detail` / `dailyStat` | 大宗交易统计与明细 |
| 融资融券 | `sdk.margin.accountInfo` / `targetList` | 两融账户信息与标的 |
| 期权 | `sdk.options.index.*` / `etf.*` / `commodity.*` / `cffex.*` / `lhb` | 股指 / ETF / 商品 / 中金所期权 |
| 期货 | `sdk.futures.kline` / `globalSpot` / `globalKline` / `inventory` | 国内/全球期货行情与库存 |
| 基金扩展 | `sdk.fund.dividendList` / `navHistory` / `estimate` / `rankHistory` / `profile` | 公募基金分红 / 净值 / 估值 / 排名 / 深度资料 |
| 交易日历 | `sdk.calendar.isTradingDay` / `nextTradingDay` / `marketStatus` | 交易日判断与市场状态 |
| 参考数据 | `sdk.reference.dividendDetail` / `tradingCalendar` | 分红明细 / A 股交易日历 |
| 搜索 | `sdk.search(keyword)` | 按关键词搜索股票 / 基金 |

## 工具调用语义

- **入参**：符号类参数以 `string` 为一等公民，server 端走 `normalizeSymbol` 容错解析（如 `sh600519` / `600519` / `00700` / `hk00700` / `AAPL` / `105.AAPL`）。`inputSchema` 为手写 JSON Schema 字面量，声明字段名、类型与 `required`。
- **参数映射**：`tools/call` 按 `name` 查 manifest，由 `invoke(sdk, args)` 把命名参数**显式映射**到 SDK 方法的位置参数，不依赖运行时反射。
- **返回**：成功结果包成 `{ content: [{ type: 'text', text: JSON.stringify(result) }] }`，文本即按 v2 数据契约序列化的结果（统一 `Quote` 可辨识联合、`timestamp: number | null`、百分比为百分数、无 `raw` 字段，具体字段以实现为准）。
- **错误语义**：工具执行失败返回 `{ content, isError: true }`，把错误信息交给模型自行处理；只有未知工具 / 协议层错误才用 JSON-RPC `error`。

## 与 CLI 共用 manifest

同一份工具 manifest 同时驱动 MCP 的 `tools/list` / `tools/call` 与 CLI 的子命令，避免两套定义漂移。新增一个只读命名空间方法的工具时，只需在 manifest 里加一条 `ToolDef`，MCP 与 CLI 同步生效。

## 下一步

- [MCP 安装配置](/mcp/installation)：在各 AI 客户端接入。
- [AI Skills](/skills/)：把这些工具组合成更高层的分析技能。
