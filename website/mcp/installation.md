# 安装与配置

## 安装 stock-sdk-mcp

### 方式一：npx 直接运行（推荐）

无需安装，在配置文件中直接使用 `npx`：

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

### 方式二：全局安装

```bash
npm install -g stock-sdk-mcp
```

安装后可直接运行 `stock-mcp` 命令。

### 方式三：本地开发安装

```bash
git clone https://github.com/chengzuopeng/stock-sdk-mcp.git
cd stock-sdk-mcp
yarn install
yarn build
```

## 环境要求

- Node.js >= 18.0.0
- 支持 macOS / Linux / Windows

## AI 工具配置指南

### Cursor IDE

配置文件路径：`~/.cursor/mcp.json`

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

配置完成后重启 Cursor，即可在对话中使用股票查询能力。

**试试看：**

```
帮我查询贵州茅台（600519）的实时行情
```

---

### Claude Desktop

配置文件路径：

- **macOS**：`~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**：`%APPDATA%\Claude\claude_desktop_config.json`

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

---

### OpenClaw（MCP 网关）

[OpenClaw](https://github.com/anthropics/clawdbot) 是一个开源的 MCP 网关，支持将多个 MCP Server 聚合为统一服务，可通过 HTTP API 在任意应用中调用。

编辑 `~/.clawdbot/config.yaml`：

```yaml
servers:
  stock-sdk:
    command: npx
    args:
      - "-y"
      - "stock-sdk-mcp"
    description: "股票行情数据服务 - 支持 A 股 / 港股 / 美股实时行情和技术分析"
    tags:
      - finance
      - stock
      - market-data
```

启动网关后，可通过 HTTP API 调用：

```bash
curl -X POST http://localhost:8080/v1/tools/call \
  -H "Content-Type: application/json" \
  -d '{
    "server": "stock-sdk",
    "tool": "get_quotes_by_query",
    "arguments": { "queries": ["茅台", "腾讯"] }
  }'
```

---

### Antigravity（Gemini Pro in VS Code）

配置文件路径：`~/.antigravity/mcp.json`

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

---

### Codex CLI（OpenAI）

配置文件路径：`~/.codex/config.json`

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

使用示例：

```bash
codex "查询苹果公司的实时股价"
codex "分析一下创业板指数最近的技术形态"
```

---

### Gemini CLI（Google）

配置文件路径：`~/.gemini/settings.json`

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

使用示例：

```bash
gemini "今天 A 股有哪些涨停板概念比较热？"
gemini "帮我获取腾讯控股的日 K 线并计算均线"
```

## 调试 MCP Server

可以通过管道发送 JSON-RPC 消息来测试 MCP Server 是否正常工作：

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_quotes_by_query","arguments":{"queries":["茅台"]}}}' | npx -y stock-sdk-mcp
```
