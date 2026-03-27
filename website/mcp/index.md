# MCP 与 AI 能力

## 什么是 MCP？

**MCP（Model Context Protocol）** 是由 Anthropic 提出的开放协议，用于连接 AI 模型与外部数据源和工具。通过 MCP，AI 助手可以安全地访问实时数据、调用外部服务，而不需要硬编码 API 调用。

Stock SDK 配套的 MCP Server — [stock-sdk-mcp](https://www.npmjs.com/package/stock-sdk-mcp)，让你的 AI 助手瞬间获得专业的股票行情数据能力。

## 架构概览

```
┌─────────────────────────────────────────────────┐
│              AI 客户端（Cursor / Claude 等）       │
│                                                 │
│  "分析一下腾讯最近的 MACD 走势"                    │
└────────────────────┬────────────────────────────┘
                     │ MCP 协议（JSON-RPC / stdio）
                     ▼
┌─────────────────────────────────────────────────┐
│              stock-sdk-mcp Server               │
│                                                 │
│  32 个 Tools + 7 个 Resources + 4 个 Skills     │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │           stock-sdk (核心 SDK)             │  │
│  │  实时行情 / K 线 / 指标 / 期货 / 期权 ...   │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 核心能力

### 32 个 MCP Tools

覆盖 stock-sdk 的全部核心功能，包括：

- **实时行情**：A 股 / 港股 / 美股 / 基金（支持按名称智能搜索）
- **K 线数据**：日 / 周 / 月 K 线，分钟 K 线，带技术指标的 K 线
- **板块数据**：行业板块 / 概念板块的行情、成分股、K 线
- **代码列表**：全市场 A / 港 / 美 / 基金代码
- **扩展数据**：资金流向、大单占比、交易日历、分红详情

👉 [查看完整工具列表](/mcp/tools)

### 7 个 MCP Resources

AI 可主动读取的静态数据资源，包括交易日历、各市场代码列表、板块列表等。

👉 [查看完整资源列表](/mcp/tools#resources)

### 4 个 AI Skills

Skills 是对底层 Tools 的**场景化封装**，通过预定义的思维链（CoT）指导 AI 完成专业分析任务：

| Skill | 说明 |
|-------|------|
| 股票技术分析专家 | 深度 K 线形态与指标分析，给出买卖建议 |
| 智能股票筛选器 | 全市场 2 万+ 标的的条件筛选与排序 |
| 市场深度概览 | 指数 / 行业 / 概念 / 情绪的全景扫描 |
| 自选股实时监控 | 持仓跟踪、异动检测、盈亏计算 |

👉 [查看 Skills 详情](/mcp/skills)

## 支持的 AI 工具

| AI 工具 | 类型 | 支持状态 |
|---------|------|---------|
| [Cursor](https://cursor.sh) | IDE | ✅ 完整支持 |
| [Claude Desktop](https://claude.ai/download) | 桌面应用 | ✅ 完整支持 |
| [OpenClaw](https://github.com/anthropics/clawdbot) | MCP 网关 | ✅ 完整支持（推荐） |
| [Antigravity](https://code.visualstudio.com/) | VS Code 插件 | ✅ 完整支持 |
| [Codex CLI](https://github.com/openai/codex) | 终端工具 | ✅ 完整支持 |
| [Gemini CLI](https://github.com/google/gemini-cli) | 终端工具 | ✅ 完整支持 |

👉 [查看详细配置指南](/mcp/installation)

## 快速体验

只需两步即可让 AI 获得股票数据能力：

**第 1 步**：在 AI 工具的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk-mcp"]
    }
  }
}
```

**第 2 步**：重启 AI 工具，开始对话：

```
> 分析一下腾讯控股最近的 MACD 走势，是否出现金叉？
> 帮我找出今天科创板涨幅前 10 的股票
> 查看人工智能概念板块有哪些成分股
```

AI 会自动调用 stock-sdk-mcp 提供的工具获取实时数据并进行分析。
