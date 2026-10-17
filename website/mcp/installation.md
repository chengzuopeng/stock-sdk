# MCP 安装配置

`stock-sdk` 的 MCP server 通过 **stdio** 与客户端通信，启动命令统一为 `stock-sdk mcp`。在各 AI 客户端里，只需把它配置成一个 stdio 类型的 MCP server 即可。

下面以 `npx` 启动为例（无需预装，`-y` 跳过交互确认）：

```jsonc
{
  "command": "npx",
  "args": ["-y", "stock-sdk", "mcp"]
}
```

默认只启用 26 个高频工具。若要暴露全部 92 个 MCP 工具，在客户端配置中加入环境变量：

```jsonc
{
  "command": "npx",
  "args": ["-y", "stock-sdk", "mcp"],
  "env": { "STOCK_SDK_MCP_TOOLS": "full" }
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

### 可选：搭配 Parallel 研究公司新闻

研究行情变动背后的新闻时，可以将 stock-sdk 的行情、K 线与 [Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp) 搭配使用。它提供网页搜索与页面抓取，无需账号或 API key；匿名搜索使用 Fast 模式，速率限制较低。

保留上面的 stock-sdk 条目，在 `~/.codex/config.toml` 中添加以下独立 server，使用[支持 Streamable HTTP 的 Codex 客户端](https://developers.openai.com/codex/mcp)：

```toml
[mcp_servers.parallel-search]
url = "https://search.parallel.ai/mcp"
http_headers = { "User-Agent" = "stock-sdk-research/1.0" }
```

重启 Codex，确认工具列表同时包含 stock-sdk 的行情工具与 Parallel 的 `web_search`、`web_fetch`。客户端分别连接两个 server：stock-sdk 仍走 stdio，Parallel 走远程 HTTP。这套配置不增加 SDK 依赖，也不改变 stock-sdk 的工具选择。

研究提问示例：

> 用 stock-sdk 获取 sh600519 最新可用的 A 股行情与日 K 线。用 Parallel 搜索过去七天发布的公司公告和新闻，再抓取相关来源页面，优先使用公司和交易所公告。列出行情时间戳、各来源的发布日期和 URL，区分已报道的事实与对价格变动的可能解释；找不到近期来源时请明确说明。

对比价格与新闻发布日期前，先检查行情时间戳和交易日历。网页用于补充研究背景，不能替代行情工具；日期相近本身不能证明价格变化的原因。

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
- [AI Skills](/skills/)：把工具组合成技术分析 / 智能选股等高层技能。
