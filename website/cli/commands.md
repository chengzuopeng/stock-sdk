# 命令清单

CLI 有两层命令：**高频别名**（单 token、带增强）与**命名空间直达**（点到任意方法）。本页逐条列出别名用法，并给出全部 84 个命名空间方法的速查表。

> 全局选项（`--format` / `--pretty` / `--timeout` / `--quiet` / `--help` / `--version`）、参数解析规则与退出码见 [CLI 概览](/cli/)。

## 高频别名命令

### `quote` — 实时行情

```bash
stock-sdk quote <code...> [--full] [--market a|hk|us|fund]
```

接受**一个或多个**代码，按市场自动分组、**并发请求、互不阻塞**：

```bash
stock-sdk quote 600519                 # A 股
stock-sdk quote 600519 000858 00700    # 混查 A股 + 港股，自动识别
stock-sdk quote AAPL TSLA              # 美股
stock-sdk quote 600519 --full          # A股全量五档（默认走简版）
stock-sdk quote 159915 --market fund   # 基金须显式 --market fund
```

| 选项 | 说明 |
|---|---|
| `--full` | A 股取全量五档行情（默认简版 `cnSimple`） |
| `--market a/hk/us/fund` | 强制市场；不指定时按代码自动识别（基金不参与自动识别，须显式指定） |

> **部分成功**：多市场混查时，单个市场失败不连累其它——返回所有可用结果，并把失败市场的原因写到 stderr。仅当**全部**失败才以对应退出码报错。

### `kline` — 历史 K 线

```bash
stock-sdk kline <symbol> [--market a|hk|us] [--period daily|weekly|monthly] [--adjust qfq|hfq|none] [--start YYYYMMDD] [--end YYYYMMDD] [--limit N]
```

```bash
stock-sdk kline 600519 --period weekly --adjust hfq
stock-sdk kline AAPL --market us --limit 30
stock-sdk kline 600519 --start 20240101 --end 20240301
```

| 选项 | 说明 |
|---|---|
| `--market a/hk/us` | 强制市场（默认按代码识别 → 选 `kline.cn/hk/us`） |
| `--period daily/weekly/monthly` | K 线周期 |
| `--adjust qfq/hfq/none` | 复权：前复权（默认）/ 后复权 / 不复权 |
| `--start` / `--end` | 起止日期 `YYYYMMDD`（映射 SDK `startDate/endDate`） |
| `--limit N` | 只取前 N 条（输出层截断） |

### `minute` — 分钟 K 线 / 分时

```bash
stock-sdk minute <symbol> [--period 1|5|15|30|60] [--market a|hk|us] [--limit N]
```

```bash
stock-sdk minute 600519 --period 5
stock-sdk minute AAPL --market us --period 15
```

周期取值为 `1` / `5` / `15` / `30` / `60`（分钟），其余选项同 `kline`。

### `indicators` — 带技术指标的 K 线

在 K 线之上叠加技术指标，一条命令取「K 线 + 指标」：

```bash
stock-sdk indicators <symbol> [周期型指标] [布尔型指标] [--period ...] [--adjust ...] [--start/--end]
```

```bash
stock-sdk indicators 600519 --ma 5,10,20 --macd --kdj
stock-sdk indicators AAPL --rsi 6,12 --boll --period daily
stock-sdk indicators 600519 --ma              # 仅 --ma：用该指标默认周期
```

**周期型指标**（接逗号分隔周期，单写 flag 用默认周期）：

| Flag | 指标 |
|---|---|
| `--ma <p,...>` | 移动平均 |
| `--rsi <p,...>` | 相对强弱 |
| `--wr <p,...>` | 威廉指标 |
| `--bias <p,...>` | 乖离率 |

**布尔型指标**（开关启用）：

`--macd` · `--kdj` · `--boll` · `--cci` · `--atr` · `--obv` · `--roc` · `--dmi` · `--sar` · `--kc`

> 同一套指标声明既驱动别名 `indicators`，也驱动命名空间直达 `kline withIndicators`，二者参数完全一致。指标含义见[技术指标与信号](/guide/indicators)。

### `search` — 搜索标的

```bash
stock-sdk search <keyword> [--limit N]
```

```bash
stock-sdk search 贵州茅台
stock-sdk search 茅台 --limit 5 --format table
```

### `timeline` — 当日分时

```bash
stock-sdk timeline <code>
```

### `codes` — 代码列表

```bash
stock-sdk codes <a|hk|us|fund> [--simple] [--board sh|sz|bj|kc|cy]
```

```bash
stock-sdk codes a --board kc        # 科创板代码
stock-sdk codes hk                  # 港股代码列表（本就是 5 位纯代码，无前缀可去）
stock-sdk codes fund
```

| 选项 | 说明 |
|---|---|
| `--simple` | 去掉交易所前缀（如 `sh600519` → `600519`；仅 A 股/美股列表有前缀，对 hk/fund 无效果） |
| `--board sh/sz/bj/kc/cy` | 板块筛选（仅 A 股） |

### `status` — 市场状态

```bash
stock-sdk status [a|hk|us]      # 默认 a
```

### `ztpool` — 涨停股池

```bash
stock-sdk ztpool [type] [--date YYYYMMDD]
```

`type` 可选：`zt`（涨停）/ `yesterday`（昨日涨停）/ `strong`（强势）/ `sub_new`（次新）/ `broken`（炸板）/ `dt`（跌停）。

```bash
stock-sdk ztpool zt --date 20240301
```

### `call` — 原始直通

当某个方法没有对应别名、或想用代码里完全一致的实参调用时，用 `call` 直接点到任意命名空间方法，`--args` 传 JSON 实参数组：

```bash
stock-sdk call <ns.method> --args '<JSON 数组>'
```

```bash
stock-sdk call quotes.cn --args '[["sh600519","sz000858"]]'
stock-sdk call kline.cn --args '["600519",{"period":"weekly"}]'
```

> `--args` 是**完整实参数组**：数组每一项依次对应方法的一个形参。已内置原型链防护，禁止 `__proto__` / `constructor` 等危险键。

### `mcp` — 启动 MCP server

```bash
stock-sdk mcp
```

把一批只读方法暴露为 MCP 工具（stdio transport），供 Cursor / Claude / Codex 等接入。可用环境变量 `STOCK_SDK_MCP_TOOLS` 控制暴露的工具集：

| 取值 | 含义 |
|---|---|
| `core`（默认） | 核心高频工具 |
| `full` | 全部工具 |
| `<逗号分隔工具名>` | 自定义白名单 |

详见 [MCP 概述](/mcp/) 与 [安装配置](/mcp/installation)。

## 命名空间直达

库里的命名空间方法都能用 `<namespace> <method> [args] [--flags]` 直接调用，路径与 `sdk.<ns>.<method>` 逐段对应：

```bash
stock-sdk quotes cn 600519 000858
stock-sdk board industry constituents 银行
stock-sdk options etf dailyKline 10004336
stock-sdk dragonTiger detail --start 20240101 --end 20240131
```

**参数形态**：每个方法按其签名归入 6 种 argShape 之一，决定 argv 如何映射成实参：

| argShape | 形态 | 示例 |
|---|---|---|
| `codes[]` | `(codes: string[])` | `stock-sdk quotes cn 600519 000858` |
| `codes+options` | `(codes: string[], options?)` | `stock-sdk batch byCodes 600519 --batchSize 100` |
| `symbol+options` | `(symbol, options?)` | `stock-sdk kline cn 600519 --period weekly` |
| `options` | `(options?)` | `stock-sdk codes cn --simple` |
| `positional` | `(a, b?, ...)` | `stock-sdk options etf expireDay 50ETF 2406` |
| `none` | `()` | `stock-sdk futures inventorySymbols` |

> 命名空间命令对**已声明选项**做严格校验（未知选项 / 非法 enum / 缺值 / 类型不符即报错）；未声明选项则透传给 SDK。`--start/--end`、`--limit` 的约定同别名命令。

### 命名空间方法速查

下表覆盖全部 **84 个**命名空间方法（外加顶层 `search`）。方法语义与返回字段以 [API 文档](/api/)为准——这里只给可直达的命令 token。

| 命名空间 | 方法（`stock-sdk <ns> <method>`） |
|---|---|
| `quotes`（8） | `cn` · `cnSimple` · `hk` · `us` · `fund` · `fundFlow` · `largeOrder` · `timeline` |
| `codes`（4） | `cn` · `us` · `hk` · `fund` |
| `batch`（5） | `cn` · `hk` · `us` · `byCodes` · `raw` |
| `kline`（7） | `cn` · `cnMinute` · `hk` · `hkMinute` · `us` · `usMinute` · `withIndicators` |
| `board`（10） | `industry list/spot/constituents/kline/minuteKline` · `concept list/spot/constituents/kline/minuteKline` |
| `options`（11） | `index spot/kline` · `etf months/expireDay/minute/dailyKline/fiveDayMinute` · `commodity spot/kline` · `cffex quotes` · `lhb` |
| `futures`（6） | `kline` · `globalSpot` · `globalKline` · `inventorySymbols` · `inventory` · `comexInventory` |
| `fundFlow`（5） | `individual` · `market` · `rank` · `sectorRank` · `sectorHistory` |
| `northbound`（5） | `minute` · `summary` · `holdingRank` · `history` · `individual` |
| `marketEvent`（3） | `ztPool` · `stockChanges` · `boardChanges` |
| `dragonTiger`（5） | `detail` · `stockStats` · `institution` · `branchRank` · `seatDetail` |
| `blockTrade`（3） | `marketStat` · `detail` · `dailyStat` |
| `margin`（2） | `accountInfo` · `targetList` |
| `fund`（4） | `dividendList` · `navHistory` · `estimate` · `rankHistory` |
| `calendar`（4） | `isTradingDay` · `nextTradingDay` · `prevTradingDay` · `marketStatus` |
| `reference`（2） | `dividendDetail` · `tradingCalendar` |
| 顶层 | `search <keyword>` |

> 不确定某方法的参数？运行 `stock-sdk <ns> <method> --help` 查看它的位置参数与可用选项（帮助文本由 manifest 自动派生，始终与实现同步）。
