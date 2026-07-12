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

分 `core`（默认 4 个）与 `full`（进阶 3 个）两级，与工具集独立过滤：

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

- **Claude Code**：`claude mcp add stock-sdk -e STOCK_SDK_MCP_PROMPTS=full -- npx -y stock-sdk mcp`，技能作为斜杠命令 `/mcp__stock-sdk__analyze_stock` 出现。
- **Cursor / Cline**：粘贴同一段 `mcpServers` JSON 到 `.cursor/mcp.json` 或扩展的 MCP 设置。

`STOCK_SDK_MCP_PROMPTS` 取值：`core`（默认，4 个）/ `full`（全部 7 个）/ 逗号分隔的技能名单。不支持 Prompts 的老客户端会自动只看到工具，不受影响。

::: warning full 技能需要 full 工具集
技能集与工具集**独立过滤**。3 个 full 技能（`analyze_capital_flow` / `analyze_fund` / `diagnose_stock`）会点名 full 层工具，所以启用 full 技能时**务必同时**设 `STOCK_SDK_MCP_TOOLS=full`。若只开 `STOCK_SDK_MCP_PROMPTS=full` 而工具集仍是默认 `core`，模型编排到 full 工具那步会拿到「Unknown tool」。server 启动时若检测到这种错配，会在 stderr 打一条告警。上面的示例配置已成对设好，照抄即可。
:::

## 只读安全

所有技能底层全是**只读**工具，且每个模板结尾统一声明「仅取数与分析，不下单、不移动资金；数据缺失就如实说明」。相对同类「能下单」的金融 MCP，这是明确的安全边界。

## 下一步

- [技能清单](/skills/catalog)：7 个技能的参数、底层工具与示例。
- [MCP 概述](/mcp/)：协议与零依赖实现。
- [MCP 工具表](/mcp/tools)：技能底层用到的原子工具（含 `get_kline_signals` 信号工具）。
- [技术指标](/guide/indicators)：指标与信号层的计算能力。
