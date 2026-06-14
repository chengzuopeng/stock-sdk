# CLI 命令行

`stock-sdk` 主包自带命令行工具，让你**无需写一行代码**就能在终端取行情、K 线、指标、搜索标的，并一键启动 MCP server。

CLI 与库**共享同一份能力**——它只是一层薄壳：解析 argv → `new StockSDK()` → 调命名空间方法 → 格式化输出。命名空间 API 能做的，CLI 都能做，数据口径与库**逐字节一致**。

```text
终端命令 ──▶ 解析 argv ──▶ new StockSDK() ──▶ sdk.<ns>.<method>() ──▶ 格式化输出 ──▶ 退出码
```

> 本页讲**安装、调用模型、全局选项、解析规则、输出与退出码**；逐条命令与参数见 [命令清单](/cli/commands)。

## 安装与运行

CLI 跟随主包发布，不是独立的包，安装 `stock-sdk` 即得（`package.json` 的 `bin` 指向 `dist/cli.js`）。

::: code-group

```bash [npx（免安装）]
# 不安装，一次性运行
npx stock-sdk quote sh600519
```

```bash [全局安装]
npm install -g stock-sdk
stock-sdk quote sh600519
```

```bash [项目内]
npm exec stock-sdk quote sh600519
# 或 yarn stock-sdk / pnpm stock-sdk
```

:::

> 要求 Node.js >= 18。CLI 仅在 Node 端运行，且**零运行时依赖**——argv 解析为手写的极小 parser，不引入 commander / yargs。版本号在构建期注入，`stock-sdk --version` 直接读取。

## 两种调用方式

CLI 有两层入口，覆盖「日常速查」与「完整能力」两种诉求：

### ① 高频别名（带增强）

最常用的操作浓缩成单 token 别名，并附带 CLI 专属增强（自动识别市场、按代码分组并发、`--limit` 截断等）：

```bash
stock-sdk quote 600519 000858 00700   # 一条命令混查 A股 + 港股，自动识别市场
stock-sdk kline 600519 --period weekly --adjust hfq --limit 30
stock-sdk indicators 600519 --ma 5,10,20 --macd --kdj
```

现有别名：`quote` / `kline` / `minute` / `indicators` / `search` / `timeline` / `codes` / `status` / `ztpool` / `call`，外加特殊的 `mcp`。详见 [命令清单 · 高频别名](/cli/commands#高频别名命令)。

### ② 命名空间直达

库里 **84 个命名空间方法**（外加顶层 `search`）都能用 `<namespace> <method>` 直接点到，无需为每个都做别名：

```bash
stock-sdk board industry list --format table
stock-sdk options etf dailyKline 10004336
stock-sdk dragonTiger detail --start 20240101 --end 20240131
stock-sdk northbound history north --start 20240101 --end 20240201
```

形如 `sdk.board.industry.list()` ↔ `stock-sdk board industry list`，路径逐段对应。完整方法地图见 [命令清单 · 命名空间直达](/cli/commands#命名空间直达)。

### 匹配优先级

当别名与命名空间路径可能冲突时（如别名 `kline` vs 命名空间 `kline cn`），CLI 的匹配规则是：

1. **≥2 段的命名空间路径优先**——`kline cn 600519` 命中 `sdk.kline.cn`，不会被别名 `kline` 抢占。
2. 其次匹配**单 token 别名**——`kline 600519` 命中增强别名（自动识别市场）。
3. 最后匹配**单段命名空间方法**——如顶层 `search`。

## 全局选项

下列选项与命令无关，对所有命令统一生效：

| 选项 | 说明 |
|---|---|
| `-f, --format <fmt>` | 输出格式 `json`（默认）/ `table` / `csv` |
| `--pretty` | JSON 缩进美化（仅 `json` 格式） |
| `--timeout <ms>` | 请求超时毫秒数（正整数，注入 `new StockSDK({ timeout })`） |
| `-q, --quiet` | 静默：空结果时不再向 stderr 打印「无数据」提示 |
| `-h, --help` | 显示帮助；`stock-sdk <command> --help` 显示单条命令用法 |
| `-V, --version` | 显示版本号 |

```bash
stock-sdk quote 600519 --format table
stock-sdk quote 600519 --pretty
stock-sdk batch cn --timeout 8000 --quiet
stock-sdk kline --help          # 查看 kline 的全部参数
```

## 参数解析规则

零依赖 parser 支持以下写法（与主流 CLI 习惯一致）：

| 写法 | 含义 |
|---|---|
| `--key value` | 长选项带值 |
| `--key=value` | 长选项带值（等号形式） |
| `--flag` | 布尔开关（已知布尔 flag 不吞掉下一个 token） |
| `-f value` / `-f` | 短选项（如 `-f table`、`-q`） |
| `--` | 终止选项解析，其后全部当位置参数 |
| 重复 `--key a --key b` | 收集成数组（如 `--ma 5 --ma 10`） |
| `-5` / `-3.14` | 负数被当作值/位置参数，而非短选项 |

```bash
stock-sdk kline 600519 --period=weekly        # 等号形式
stock-sdk quote 600519 -f csv                 # 短选项
stock-sdk search -- --weird-keyword           # -- 之后不再解析选项
```

> 约定：`--start` / `--end` 会自动映射成 SDK 的 `startDate` / `endDate`；`--limit N` 是 **CLI 输出层**的截断（对结果数组取前 N 条），不透传给 SDK，对所有命令统一生效。

## 输出格式

CLI **默认输出单行 JSON**，对管道友好，可直接接 `jq`：

```bash
# 默认 JSON（紧凑单行）
stock-sdk quote sh600519

# 接 jq 取字段
stock-sdk quote sh600519 | jq '.[0].price'

# --pretty 缩进
stock-sdk quote sh600519 --pretty
```

切换为人类友好格式：

```bash
# 终端表格（零依赖列对齐，CJK 按 2 宽度，数字列右对齐）
stock-sdk quote 600519 000858 --format table

# CSV（RFC4180 转义，可重定向到 .csv）
stock-sdk batch cn --format csv > a-share.csv
```

| 取值 | 适用场景 |
|---|---|
| `json`（默认） | 脚本与管道；`--pretty` 可读化 |
| `table` | 终端人工查看；自动列对齐 |
| `csv` | 导出到表格软件 / 数据管道 |

> 无论何种格式，**底层数据契约与库完全一致**——同样的 `Quote` 联合、同样的字段口径。百分比为百分数；价格 / 金额 / 成交量的目标单位与库一致，但当前 beta 的运行值仍以各 provider 原始口径为准。
>
> 当结果为空（`null` / `undefined` / 空数组）时，CLI 会向 **stderr**（不污染 stdout 数据）打印一行「无数据」提示，`--quiet` 可关闭。

## 退出码

CLI 把 v2 错误体系映射成稳定的进程退出码，便于脚本判断失败类别：

| 退出码 | 含义 | 对应错误 |
|---|---|---|
| `0` | 成功 | — |
| `1` | 通用错误 | 未归类异常 |
| `2` | 用法 / 参数错误 | `CliUsageError`、`INVALID_ARGUMENT`、`INVALID_SYMBOL`、`NOT_FOUND` |
| `3` | 网络 / 超时 | `NETWORK_ERROR`、`TIMEOUT`、`ABORTED` |
| `4` | 上游 / 解析 | `UPSTREAM_ERROR`、`UPSTREAM_EMPTY`、`PARSE_ERROR`、`HTTP_ERROR` |
| `5` | 限流 / 熔断 | `RATE_LIMITED`、`CIRCUIT_OPEN` |

```bash
stock-sdk quote 600519 || echo "查询失败，退出码 $?"
```

## 错误输出

错误一律写入 **stderr**，stdout 只保留正常数据，因此管道里的数据流不会被错误污染。

- **文本格式**（默认/table/csv）：`stock-sdk: <CODE>: <message>`，用法错误另附一行提示。
- **JSON 格式**（`--format json`）：结构化 `{ "error": { "code": "...", "message": "..." } }`，便于程序解析。

```bash
stock-sdk quote 999999 --format json 2>err.json; cat err.json
# {"error":{"code":"INVALID_SYMBOL","message":"..."}}
```

## 与库共享同一能力

CLI 不是另写一套逻辑，而是直接消费主库的 `StockSDK`，因此：

- **行为一致**：CLI 取到的数据，跟你在代码里调命名空间方法拿到的**一模一样**。
- **能力同步**：库新增一个方法，命名空间直达即可暴露，不会两套漂移。
- **符号同源**：CLI 与库用同一套 `normalizeSymbol` 容错解析，`sh600519` / `600519` / `00700` / `AAPL` 等写法表现一致。

需要把数据嵌进自己的程序，就用[命名空间 API](/api/)；只是临时在终端看一眼，用 CLI 更快。

## 零依赖与入口隔离

CLI 不破坏主包的「零依赖」定位：

- **不增加依赖树**：argv 解析手写，不引第三方；`npm install stock-sdk` 不会因 CLI 多拉任何包。
- **不影响 import 体积**：CLI 走**独立入口**（`bin` → `dist/cli.*`），与库主入口隔离。`import { StockSDK } from 'stock-sdk'` 时，CLI 代码**一字节都不会进你的 bundle**。
- **单向依赖**：CLI 可以 `import` 主库（它是库的消费者），但主库**绝不**反向引用 CLI。

## 下一步

- [命令清单](/cli/commands)：逐条命令、全部参数、完整命名空间方法表。
- [MCP 概述](/mcp/)：用一条 `stock-sdk mcp` 把只读方法接入 AI 工具。
- [API 总览](/api/)：在代码里使用命名空间 API。
