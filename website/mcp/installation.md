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

### OpenClaw（MCP 网关 / AI 助手）

[OpenClaw](https://github.com/openclaw/openclaw)（原 Clawdbot）是一个开源、支持 MCP 的 AI 助手，可加载外部 MCP Server。

方式一：CLI 注册

```bash
openclaw mcp add stock-sdk --command npx --arg -y --arg stock-sdk-mcp
openclaw mcp doctor stock-sdk --probe   # 验证连通
```

方式二：直接编辑配置文件 `~/.openclaw/openclaw.json` 的 `mcp.servers`：

```json
{
  "mcp": {
    "servers": {
      "stock-sdk": {
        "command": "npx",
        "args": ["-y", "stock-sdk-mcp"]
      }
    }
  }
}
```

> 具体命令与配置以 [OpenClaw 官方文档](https://docs.openclaw.ai/cli/mcp) 为准。

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
