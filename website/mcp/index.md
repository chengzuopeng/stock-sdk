# MCP 概述

`stock-sdk` 与 `stock-node-sdk` 均内置 MCP（Model Context Protocol）server，一条命令即可启动，把只读财经数据能力暴露给 Cursor / Claude Desktop / Codex / Gemini 等 AI 工具。

::: tip AI 场景推荐使用 `stock-node-sdk mcp`
使用 Node.js 18.17+ 时，可以通过 **`npx -y stock-node-sdk@beta mcp`**（104 个全量工具），可同时获得多源自动容错、A/港/美股财报三大表、7×24 快讯、三地官方公告（东财/巨潮 + 港交所披露易 + SEC EDGAR）与 `--cache-dir` / `--proxy` / `--source` / `--overseas=false` 启动参数；若偏好零依赖极简版则使用 `npx -y stock-sdk mcp`（93 个工具）。
:::

```bash
npx -y stock-node-sdk@beta mcp   # Node 增强版（104 工具 + 多源自动容错）
npx -y stock-sdk mcp        # 零依赖基础版（93 工具）
```

## 一键启动

MCP server 随主包一起发布，无需额外安装协议库。常见的两种用法：

```bash
# 通过 npx 一次性启动（AI 客户端配置里最常用）
npx -y stock-sdk mcp

# 或全局安装后直接调用
npm install -g stock-sdk
stock-sdk mcp
```

server 启动后通过 **stdio**（标准输入输出）与客户端通信，不监听任何网络端口。具体到各 AI 客户端的配置写法，见 [MCP 安装配置](/mcp/installation)。

## 设计要点

### 零依赖自实现协议

MCP 本质是 **JSON-RPC 2.0 over 换行分隔（NDJSON）的 stdin/stdout**。`stock-sdk` 没有引入 `@modelcontextprotocol/sdk`，而是**自行手写了协议的最小子集**，从而守住主包「零运行时依赖」的定位。

服务器通过 `stdio` 提供只读行情工具和分析模板。客户端在 `initialize` 中协商能力，用 `tools/list` 和 `tools/call` 发现及调用工具，用 `prompts/list` 和 `prompts/get` 发现及读取工具齐全的模板。

### 不影响主包体积与零依赖

CLI 与 MCP 都走**独立入口**（`stock-sdk/mcp`），与主库严格单向隔离：

- `import { StockSDK } from 'stock-sdk'` 时，MCP 的代码**一字节都不会进用户 bundle**。
- MCP 自身**零第三方依赖**，既不进用户 bundle，也不增加主包 `node_modules`。
- 仅编译产物 `dist/mcp.*` 随 npm 包发布，小幅增加 tarball 体积。

### 工具从只读命名空间方法派生

server 暴露的每个 tool 对应一个 SDK 的**只读命名空间方法**（如 `quotes` / `kline` / `search`）。每个工具都是一份显式声明 —— `name`、`description`、手写 JSON Schema 的 `inputSchema`，以及把参数显式映射到 SDK 调用的 `invoke`，收进一份 manifest 作为单一事实源（SSOT），与 CLI 共用。工具概览见 [MCP 工具表](/mcp/tools)。

## 协议版本

server 维护一个**支持版本数组**，在 `initialize` 阶段与客户端协商并回退到双方都支持的版本，对应当前 MCP 规范的 stable 版本，并向后兼容上一稳定版。具体取值以实现与 MCP 规范当前版本为准。

## 下一步

- [MCP 安装配置](/mcp/installation)：Cursor / Claude Desktop / Codex / Gemini 接入。
- [MCP 工具表](/mcp/tools)：可用工具一览。
- [AI Skills](/skills/)：技术分析 / 智能选股 / 市场概览 / 实时监控等内置技能。
