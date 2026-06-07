# MCP 安装配置

`stock-sdk` 的 MCP server 通过 **stdio** 与客户端通信，启动命令统一为 `stock-sdk mcp`。在各 AI 客户端里，只需把它配置成一个 stdio 类型的 MCP server 即可。

下面以 `npx` 启动为例（无需预装，`-y` 跳过交互确认）：

```jsonc
{
  "command": "npx",
  "args": ["-y", "stock-sdk", "mcp"]
}
```

> 也可以先 `npm install -g stock-sdk`，再把 `command` 直接写成 `"stock-sdk"`、`args` 写成 `["mcp"]`，省去每次 `npx` 解析的开销。

## Cursor

在项目根目录或全局配置目录新建/编辑 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk", "mcp"]
    }
  }
}
```

保存后在 Cursor 的 MCP 设置里启用 `stock-sdk`，即可在对话中调用行情工具。

## Claude Desktop

编辑 Claude Desktop 的配置文件：

- macOS：`~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows：`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk", "mcp"]
    }
  }
}
```

保存后**重启 Claude Desktop**，工具栏中应出现 `stock-sdk` 的工具图标。

## Codex

在 Codex 的 MCP 配置（TOML）中新增一个 server 条目：

```toml
[mcp_servers.stock-sdk]
command = "npx"
args = ["-y", "stock-sdk", "mcp"]
```

## Gemini

在 Gemini CLI 的 `settings.json` 中加入 `mcpServers`：

```json
{
  "mcpServers": {
    "stock-sdk": {
      "command": "npx",
      "args": ["-y", "stock-sdk", "mcp"]
    }
  }
}
```

## 验证连接

server 走 stdio，正常情况下由客户端拉起，无需手动运行。若要在终端手动确认它能起来：

```bash
npx -y stock-sdk mcp
```

进程会等待 stdin 输入 JSON-RPC 消息（如 `initialize`）。客户端连上后，可在对话里让模型「列出可用工具」来确认握手成功。

> 各客户端的配置文件路径、字段名可能随版本变化，以对应客户端的官方文档为准；本页只规定 `stock-sdk mcp` 这一启动入口。

## 下一步

- [MCP 工具表](/mcp/tools)：连上后可用的工具一览。
- [AI Skills](/mcp/skills)：把工具组合成技术分析 / 智能选股等高层技能。
