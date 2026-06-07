/**
 * MCP server 入口（stdio + tools 子集，零依赖手写）。
 * 见 mcp.md §2 / §7 / §8。也作为 `stock-sdk/mcp` subpath 的程序化入口。
 *
 * 分发逻辑抽成纯函数 `dispatchMessage`（可单测）；`startMcpServer` 负责 transport 绑定。
 */
import { StockSDK } from '../sdk';
import { createLineReader, writeMessage, logStderr } from './transport';
import {
  negotiateProtocolVersion,
  SERVER_INFO,
  RPC_PARSE_ERROR,
  RPC_METHOD_NOT_FOUND,
  RPC_INVALID_PARAMS,
  RPC_INTERNAL_ERROR,
  type JsonRpcId,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from './protocol';
import { listTools } from './tools';
import type { ToolDef, ToolTier } from './types';
import { toToolResult, toolErrorResult } from './result';

export interface DispatchContext {
  sdk: StockSDK;
  tools: ToolDef[];
  toolMap: Map<string, ToolDef>;
}

/**
 * 处理单条 JSON-RPC 请求，返回响应；通知类（无需回应）返回 `null`。
 * 纯函数（除工具内部 IO），便于单测。
 */
export async function dispatchMessage(
  msg: JsonRpcRequest,
  ctx: DispatchContext
): Promise<JsonRpcResponse | null> {
  const id: JsonRpcId = msg.id ?? null;
  const params = msg.params ?? {};
  const isRequest = msg.id !== undefined && msg.id !== null;
  const ok = (result: unknown): JsonRpcResponse => ({ jsonrpc: '2.0', id, result });
  const err = (code: number, message: string): JsonRpcResponse => ({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  });

  switch (msg.method) {
    case 'initialize':
      return ok({
        protocolVersion: negotiateProtocolVersion(params.protocolVersion),
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    // 通知类（无需响应）
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null;

    case 'ping':
      return ok({});

    case 'tools/list':
      return ok({
        tools: ctx.tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });

    case 'tools/call': {
      const name = params.name as string | undefined;
      const tool = name ? ctx.toolMap.get(name) : undefined;
      if (!tool) return err(RPC_INVALID_PARAMS, `Unknown tool: ${String(name)}`);
      const args = (params.arguments as Record<string, unknown> | undefined) ?? {};
      try {
        const out = await tool.invoke(ctx.sdk, args);
        return ok(toToolResult(out));
      } catch (e) {
        // 工具执行失败 → isError result（非 JSON-RPC error），让 LLM 可见并处理
        return ok(toolErrorResult(e));
      }
    }

    default:
      return isRequest ? err(RPC_METHOD_NOT_FOUND, `Unknown method: ${msg.method}`) : null;
  }
}

export interface McpServerOptions {
  /** 工具集范围：'core'(默认) / 'full' / 指定 name 列表 */
  tools?: ToolTier | string[];
}

/** 从显式参数或环境变量 STOCK_SDK_MCP_TOOLS 解析工具集范围 */
function resolveFilter(explicit?: ToolTier | string[]): ToolTier | string[] {
  if (explicit) return explicit;
  const env = process.env.STOCK_SDK_MCP_TOOLS;
  if (!env) return 'core';
  if (env === 'core' || env === 'full') return env;
  return env.split(',').map((s) => s.trim()).filter(Boolean);
}

/** 启动 MCP server（监听 stdin，直到 stdin 关闭后 event loop 自然退出） */
export function startMcpServer(options: McpServerOptions = {}): void {
  const sdk = new StockSDK();
  const tools = listTools(resolveFilter(options.tools));
  const ctx: DispatchContext = { sdk, tools, toolMap: new Map(tools.map((t) => [t.name, t])) };

  logStderr(
    `[stock-sdk mcp] ready · ${tools.length} tools · ${SERVER_INFO.name}@${SERVER_INFO.version}`
  );

  createLineReader((line) => {
    void handleLine(line);
  });

  // stdin 关闭（MCP client 断开）→ 记日志并让 event loop 自然退出
  // （不强制 process.exit，避免截断未 flush 的响应 / 未完成的请求）
  process.stdin.on('end', () => logStderr('[stock-sdk mcp] stdin closed, exiting'));

  async function handleLine(line: string): Promise<void> {
    let msg: JsonRpcRequest;
    try {
      msg = JSON.parse(line) as JsonRpcRequest;
    } catch {
      writeMessage({ jsonrpc: '2.0', id: null, error: { code: RPC_PARSE_ERROR, message: 'Parse error' } });
      return;
    }
    try {
      const res = await dispatchMessage(msg, ctx);
      if (res) writeMessage(res);
    } catch (e) {
      logStderr('[stock-sdk mcp] internal error:', (e as Error)?.message ?? String(e));
      if (msg.id !== undefined && msg.id !== null) {
        writeMessage({
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: RPC_INTERNAL_ERROR, message: String((e as Error)?.message ?? e) },
        });
      }
    }
  }
}
