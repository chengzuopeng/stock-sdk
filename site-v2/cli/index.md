# CLI 命令行

`stock-sdk` 主包自带命令行工具，让你**无需写一行代码**就能在终端取行情、K 线、搜索标的，并一键启动 MCP server。

CLI 与库**共享同一份能力**——它只是一层薄壳：解析参数 → 调用 `StockSDK` → 格式化输出。命名空间 API 能做的，CLI 都能做。

## 安装与运行

CLI 跟随主包发布，不是独立的包，安装 `stock-sdk` 即得。

::: code-group

```bash [npx（免安装）]
# 不安装，一次性运行
npx stock-sdk quote sh600519
```

```bash [全局安装]
# 安装后用 stock-sdk 命令
npm install -g stock-sdk
stock-sdk quote sh600519
```

```bash [项目内]
# 已装进项目，用包管理器跑
npm exec stock-sdk quote sh600519
# 或 yarn stock-sdk / pnpm stock-sdk
```

:::

> 要求 Node.js >= 18。CLI 仅在 Node 端运行（浏览器不涉及），且**零运行时依赖**——参数解析为手写的极小 parser，不引入 commander / yargs。

## 命令总览

下表为命令形态示意，具体子命令与参数以最终实现为准。

| 命令 | 说明 |
|---|---|
| `stock-sdk quote <code...>` | 取一只或多只标的的实时行情 |
| `stock-sdk kline <code>` | 取历史 K 线（`--period` 指定周期） |
| `stock-sdk search <keyword>` | 按关键词搜索标的 |
| `stock-sdk mcp` | 启动内置 MCP server（`stdio`） |
| `stock-sdk --help` | 查看帮助与命令列表 |
| `stock-sdk --version` | 查看版本 |

### 取行情

`quote` 接受一个或多个代码，符号写法与库一致——`string` 是一等公民，容错解析各市场格式：

```bash
# A 股
stock-sdk quote sh600519
stock-sdk quote 600519 000001

# 港股 / 美股
stock-sdk quote 00700
stock-sdk quote AAPL
```

### 取 K 线

```bash
# 日 K 线
stock-sdk kline 600519 --period day

# 指定周期（周期取值以实现为准）
stock-sdk kline AAPL --period week
```

### 搜索标的

```bash
stock-sdk search 贵州茅台
```

### 启动 MCP server

一条命令即把一批只读方法暴露为 MCP 工具，供 Cursor / Claude / Codex 等 AI 工具接入：

```bash
stock-sdk mcp
```

详见 [MCP 概述](/mcp/) 与 [各客户端接入配置](/mcp/installation)。

> 命令清单为示意，并不穷举。完整子命令、参数与默认值以发布版本的 `stock-sdk --help` 为准。

## 输出格式（`--format`）

CLI **默认输出 JSON**，对管道友好，可直接接 `jq` 等工具做后续处理：

```bash
# 默认 JSON
stock-sdk quote sh600519

# 接 jq 取字段
stock-sdk quote sh600519 | jq '.[0].price'
```

可用 `--format` 切换为更易读的形态（如表格）：

```bash
stock-sdk quote sh600519 600519 --format table
```

| 取值 | 说明 |
|---|---|
| `json`（默认） | 紧凑 JSON，适合脚本与管道 |
| `table` | 终端表格，适合人工查看 |

> 具体可用的 `--format` 取值以实现为准。无论何种格式，**底层数据契约与库完全一致**——同样的 `Quote` 联合、同样的单位口径（百分比为百分数、价格/金额为各市场计价货币主单位、成交量单位为股，具体字段以实现为准）。

## 与库共享同一能力

CLI 不是另写一套逻辑，而是直接消费主库的 `StockSDK`：

```text
终端命令 ──▶ 解析 argv ──▶ new StockSDK() ──▶ sdk.<ns>.<method>() ──▶ 格式化输出
```

这意味着：

- **行为一致**：CLI 取到的数据，跟你在代码里调命名空间方法拿到的**一模一样**。
- **能力同步**：库新增一个方法，CLI 也能随之暴露，不会两套漂移。
- **符号同源**：CLI 与库用同一套 `normalizeSymbol` 容错解析，`sh600519` / `600519` / `00700` / `AAPL` 等写法表现一致。

需要把数据嵌进自己的程序，就用[命名空间 API](/api/)；只是临时在终端看一眼，用 CLI 更快。

## 零依赖说明

CLI 不破坏主包的「零依赖」定位：

- **不增加依赖树**：参数解析手写，不引第三方；`npm install stock-sdk` 不会因为 CLI 多拉任何包。
- **不影响 import 体积**：CLI 走**独立入口**（`bin` → `dist/cli.*`），与库主入口隔离。`import { StockSDK } from 'stock-sdk'` 时，CLI 的代码**一字节都不会进你的 bundle**。
- **仅小幅增加包体积**：只有 `dist/cli.*` 这一份编译产物随 npm 包发布，量小。

> 隔离是单向的：CLI 可以 `import` 主库（它是库的消费者），但主库**绝不**反向引用 CLI。

## 下一步

- [MCP 概述](/mcp/)：用一条 `stock-sdk mcp` 接入 AI 工具。
- [API 总览](/api/)：在代码里使用命名空间 API。
- [安装](/guide/installation)：包安装与 subpath 导入。
