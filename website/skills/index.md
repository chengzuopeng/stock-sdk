# AI Skills 概述

MCP 工具是「原子能力」——单次取一类数据，由模型按需自动调用。**Skills** 则是面向场景的高层技能：把「调哪些工具、怎么算、怎么归纳」编排成一段专家写好的模板，通过 MCP 协议的 **Prompts** 能力暴露，让用户在客户端里一键触发一条完整分析链路。

Skills 落地为真正的 MCP Prompts（`prompts/list` + `prompts/get`），server 在 `initialize` 声明 `capabilities.prompts`。支持 Prompts 的客户端（Claude Desktop、Claude Code、Cursor、Cline 等）会把技能渲染成 **斜杠命令 / 模板选项**。

## 技能是怎么工作的

关键认知：**server 不执行技能**。`prompts/get` 只是把一段插值好参数的「任务说明书」交给客户端的模型，说明书里点名该调哪些真实工具。真正的多步执行由客户端模型 + `tools/call` 循环完成。

一次 `analyze_stock` 的完整交互：

1. **发现**：客户端连上 server 后发 `prompts/list`，把技能渲染成 UI 里的斜杠命令 / 模板。
2. **选择 + 填参**：用户选 `analyze_stock`，按参数填 `symbol`（必填）、`period`（可选，默认 daily）。
3. **取模板**：客户端发 `prompts/get`，server 插值出任务说明书，回一条 `user` message。
4. **注入**：说明书作为用户轮的起始内容进入对话——server 到此退场。
5. **模型自跑**：模型按说明书依次 `tools/call`（`search` → `get_kline_with_indicators` → `get_kline_signals`）。
6. **产出**：模型按模板规定的结构作答，且**用用户的语言**（模板末尾统一指示「respond in the user's language」，指令体是英文但你中文提问仍得中文分析）。

所以 Skill 的价值不在「解锁能力」，而在**标准化编排 + 降低模型漏调/错调 + 给非专家用户一键入口 + 统一免责与安全纪律**。

## 内置了哪些技能

默认选择 `core` 的 4 个技能，`full` 再选入 3 个进阶技能。客户端只会发现依赖工具齐全的已选技能。

- **core**：`analyze_stock` 个股技术分析、`screen_stocks` 智能选股、`market_overview` 市场概览、`monitor_watchlist` 自选监控
- **full**：`analyze_capital_flow` 资金面、`analyze_fund` 基金分析、`diagnose_stock` 综合诊断

每个技能的参数、底层工具与提问示例见 **[技能清单](/skills/catalog)**。

## 启用与触发

所有 MCP 客户端走同一个入口 `npx -y stock-sdk mcp`，只有配置文件路径和 UI 入口不同。以 Claude Desktop 为例（`claude_desktop_config.json`）：

```jsonc
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk", "mcp"],
      "env": {
        "STOCK_SDK_MCP_TOOLS": "full",     // 工具集范围（已有）
        "STOCK_SDK_MCP_PROMPTS": "full"    // 技能集范围（缺省 core）
      }
    }
  }
}
```

- 在 **Claude Code** 中运行 `claude mcp add stock-sdk -e STOCK_SDK_MCP_TOOLS=full -e STOCK_SDK_MCP_PROMPTS=full -- npx -y stock-sdk mcp`，即可通过 `/mcp__stock-sdk__analyze_stock` 等斜杠命令调用技能。
- **Cursor / Cline**：粘贴同一段 `mcpServers` JSON 到 `.cursor/mcp.json` 或扩展的 MCP 设置。

`STOCK_SDK_MCP_PROMPTS` 接受 `core`（默认）、`full` 或逗号分隔的技能名单。

要使用全部 7 个技能，同时将 `STOCK_SDK_MCP_TOOLS` 和 `STOCK_SDK_MCP_PROMPTS` 设为 `full`。自定义工具名单时，可按[技能清单](/skills/catalog)保留所需工具。缺少工具的技能会从 `prompts/list` 隐藏，启动日志会列出具体缺项，直接调用 `prompts/get` 也会提示缺少的工具。

## 只读安全

所有技能底层全是**只读**工具，且每个模板结尾统一声明「仅取数与分析，不下单、不移动资金；数据缺失就如实说明」。相对同类「能下单」的金融 MCP，这是明确的安全边界。

## 下一步

- [技能清单](/skills/catalog)：7 个技能的参数、底层工具与示例。
- [MCP 概述](/mcp/)：协议与零依赖实现。
- [MCP 工具表](/mcp/tools)：技能底层用到的原子工具（含 `get_kline_signals` 信号工具）。
- [技术指标](/guide/indicators)：指标与信号层的计算能力。
