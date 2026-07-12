/**
 * MCP server 入口（stdio + tools 子集，零依赖手写）。
 * 见 mcp.md §2 / §7 / §8。也作为 `stock-sdk/mcp` subpath 的程序化入口。
 *
 * 分发逻辑抽成纯函数 `dispatchMessage`（可单测）；`startMcpServer` 负责 transport 绑定。
 */
import { StockSDK } from '../sdk';
import { InvalidArgumentError, type RequestClientOptions } from '../core';
import { createLineReader, writeMessage, logStderr } from './transport';
import {
  negotiateProtocolVersion,
  SERVER_INFO,
  RPC_PARSE_ERROR,
  RPC_INVALID_REQUEST,
  RPC_METHOD_NOT_FOUND,
  RPC_INVALID_PARAMS,
  RPC_INTERNAL_ERROR,
  type JsonRpcId,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from './protocol';
import { listTools } from './tools';
import { listPrompts } from './prompts';
import type { PromptDef } from '../spec/derive-prompt';
import type { ToolDef, ToolTier } from './types';
import { toToolResult, toolErrorResult } from './result';

/** 技能集范围：'core'(默认) / 'full' / 指定 name 列表（与工具集独立过滤）。 */
export type PromptTier = 'core' | 'full';

export interface DispatchContext {
  sdk: StockSDK;
  tools: ToolDef[];
  toolMap: Map<string, ToolDef>;
  prompts: PromptDef[];
  promptMap: Map<string, PromptDef>;
}

/** 普通对象判定（排除 null 与数组）—— JSON-RPC params/arguments 必须是对象 */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

type JsonSchemaType = NonNullable<ToolDef['inputSchema']['properties'][string]['type']>;

function matchesJsonSchemaType(v: unknown, type: JsonSchemaType): boolean {
  switch (type) {
    case 'array':
      return Array.isArray(v);
    case 'string':
      return typeof v === 'string';
    case 'integer':
      return Number.isInteger(v);
    case 'number':
      return typeof v === 'number';
    case 'boolean':
      return typeof v === 'boolean';
    case 'object':
      return isObject(v);
    default:
      return true;
  }
}

/**
 * 按 tool.inputSchema 校验 args：unknown key / required 缺失 / 基本类型不符 / enum 取值非法
 * → 返回错误消息(否则 null)。
 * MCP server 此前完全不按 schema 校验 tools/call 入参,脏入参(如 codes 传字符串而非数组)会
 * 越过 provider 空值守卫、抛出 `codes.join is not a function` 这类泄漏实现细节的 Error[UNKNOWN]。
 * enum 校验与 CLI 的 enum 拒绝语义一致(spec 派生的 schema 自带 enum,在边界即拒绝非法值)。
 */
function validateArgs(
  schema: ToolDef['inputSchema'],
  args: Record<string, unknown>
): string | null {
  if (schema.additionalProperties === false) {
    const allowed = new Set(Object.keys(schema.properties));
    for (const key of Object.keys(args)) {
      if (!allowed.has(key)) {
        return `未知参数 "${key}"`;
      }
    }
  }
  for (const key of schema.required ?? []) {
    if (args[key] === undefined || args[key] === null) {
      return `缺少必填参数 "${key}"`;
    }
  }
  for (const [key, prop] of Object.entries(schema.properties)) {
    const v = args[key];
    if (v === undefined) continue;
    if (prop.type) {
      if (!matchesJsonSchemaType(v, prop.type)) {
        return `参数 "${key}" 类型应为 ${prop.type}`;
      }
    }
    if (prop.enum && !(prop.enum as readonly unknown[]).includes(v)) {
      return `参数 "${key}" 取值非法「${String(v)}」，可选: ${prop.enum.join(' / ')}`;
    }
  }
  return null;
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
  const isRequest = msg.id !== undefined && msg.id !== null;
  const ok = (result: unknown): JsonRpcResponse => ({ jsonrpc: '2.0', id, result });
  const err = (code: number, message: string): JsonRpcResponse => ({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  });

  // JSON-RPC 2.0 边界守卫：jsonrpc 必须为 '2.0'，method 必须为非空字符串
  if (
    (msg as { jsonrpc?: unknown }).jsonrpc !== '2.0' ||
    typeof msg.method !== 'string' ||
    msg.method.length === 0
  ) {
    return isRequest ? err(RPC_INVALID_REQUEST, 'Invalid Request') : null;
  }

  const params: unknown = msg.params;

  switch (msg.method) {
    case 'initialize': {
      const pv = isObject(params) ? params.protocolVersion : undefined;
      return ok({
        protocolVersion: negotiateProtocolVersion(pv),
        // prompts.listChanged 暂不支持（技能集是构建期静态的）
        capabilities: { tools: {}, prompts: {} },
        serverInfo: SERVER_INFO,
      });
    }

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
      if (!isObject(params)) return err(RPC_INVALID_PARAMS, 'params must be an object');
      const name = params.name;
      if (typeof name !== 'string') return err(RPC_INVALID_PARAMS, 'params.name must be a string');
      const tool = ctx.toolMap.get(name);
      if (!tool) return err(RPC_INVALID_PARAMS, `Unknown tool: ${name}`);
      const rawArgs = params.arguments;
      if (rawArgs !== undefined && !isObject(rawArgs)) {
        return err(RPC_INVALID_PARAMS, 'params.arguments must be an object');
      }
      const args = isObject(rawArgs) ? rawArgs : {};
      const argError = validateArgs(tool.inputSchema, args);
      if (argError) {
        // 入参不合规 → 干净的 INVALID_ARGUMENT(isError result,LLM 可见可纠正),
        // 而非让脏入参流进 SDK 抛出泄漏实现细节的 Error[UNKNOWN]。
        return ok(toolErrorResult(new InvalidArgumentError(argError)));
      }
      try {
        const out = await tool.invoke(ctx.sdk, args);
        return ok(toToolResult(out));
      } catch (e) {
        // 工具执行失败 → isError result（非 JSON-RPC error），让 LLM 可见并处理
        return ok(toolErrorResult(e));
      }
    }

    case 'prompts/list':
      return ok({
        prompts: ctx.prompts.map((p) => ({
          name: p.name,
          title: p.title,
          description: p.description,
          arguments: p.arguments,
        })),
      });

    case 'prompts/get': {
      if (!isObject(params)) return err(RPC_INVALID_PARAMS, 'params must be an object');
      const name = params.name;
      if (typeof name !== 'string') return err(RPC_INVALID_PARAMS, 'params.name must be a string');
      const prompt = ctx.promptMap.get(name);
      if (!prompt) return err(RPC_INVALID_PARAMS, `Unknown prompt: ${name}`);
      const rawArgs = params.arguments;
      if (rawArgs !== undefined && !isObject(rawArgs)) {
        return err(RPC_INVALID_PARAMS, 'params.arguments must be an object');
      }
      // MCP prompt arguments 规范为字符串键值；容忍非字符串值（下游 render 只做插值）
      const args = isObject(rawArgs) ? (rawArgs as Record<string, string>) : {};
      try {
        const text = prompt.render(args);
        const firstArg = prompt.arguments[0]?.name;
        const firstVal = firstArg ? args[firstArg] : undefined;
        return ok({
          description: firstVal ? `${prompt.title} · ${firstVal}` : prompt.title,
          messages: [{ role: 'user', content: { type: 'text', text } }],
        });
      } catch (e) {
        // 必填缺失等 → JSON-RPC error（prompts/get 无 isError result 约定，与 tools/call 不同）
        return err(RPC_INVALID_PARAMS, (e as Error)?.message ?? 'invalid prompt arguments');
      }
    }

    default:
      // 未知方法：请求回 METHOD_NOT_FOUND，通知（无 id）忽略
      return isRequest ? err(RPC_METHOD_NOT_FOUND, `Unknown method: ${msg.method}`) : null;
  }
}

export interface McpServerOptions {
  /** 工具集范围：'core'(默认) / 'full' / 指定 name 列表 */
  tools?: ToolTier | string[];
  /** 技能集范围：'core'(默认) / 'full' / 指定 name 列表（与工具集独立） */
  prompts?: PromptTier | string[];
  /**
   * 透传给 StockSDK 的请求治理配置（timeout / retry / rateLimit / circuitBreaker / providerPolicies 等）。
   * 也可通过环境变量 STOCK_SDK_MCP_TIMEOUT 单独设置超时（毫秒）。
   */
  sdk?: RequestClientOptions;
}

/** 通用集合范围解析：显式参数 > 环境变量 > 'core'（空列表回退 core，避免零集合）。 */
function resolveTierFilter(
  explicit: 'core' | 'full' | string[] | undefined,
  envName: string
): 'core' | 'full' | string[] {
  if (explicit) return explicit;
  const env = process.env[envName];
  if (!env) return 'core';
  if (env === 'core' || env === 'full') return env;
  const names = env.split(',').map((s) => s.trim()).filter(Boolean);
  return names.length > 0 ? names : 'core';
}

/** 工具集范围：显式 > STOCK_SDK_MCP_TOOLS 环境变量 > core。 */
function resolveFilter(explicit?: ToolTier | string[]): ToolTier | string[] {
  return resolveTierFilter(explicit, 'STOCK_SDK_MCP_TOOLS');
}

/** 技能集范围：显式 > STOCK_SDK_MCP_PROMPTS 环境变量 > core。 */
function resolvePromptFilter(explicit?: PromptTier | string[]): PromptTier | string[] {
  return resolveTierFilter(explicit, 'STOCK_SDK_MCP_PROMPTS');
}

/** 解析 SDK 请求治理配置：显式 > STOCK_SDK_MCP_TIMEOUT 环境变量 > 默认 */
function resolveSdkOptions(explicit?: RequestClientOptions): RequestClientOptions {
  if (explicit) return explicit;
  const raw = process.env.STOCK_SDK_MCP_TIMEOUT;
  const timeout = raw ? Number(raw) : undefined;
  return timeout && !Number.isNaN(timeout) && timeout > 0 ? { timeout } : {};
}

/** 启动 MCP server（监听 stdin，直到 stdin 关闭后 event loop 自然退出） */
export function startMcpServer(options: McpServerOptions = {}): void {
  const sdk = new StockSDK(resolveSdkOptions(options.sdk));
  const tools = listTools(resolveFilter(options.tools));
  const prompts = listPrompts(resolvePromptFilter(options.prompts));
  const ctx: DispatchContext = {
    sdk,
    tools,
    toolMap: new Map(tools.map((t) => [t.name, t])),
    prompts,
    promptMap: new Map(prompts.map((p) => [p.name, p])),
  };

  logStderr(
    `[stock-sdk mcp] ready · ${tools.length} tools · ${prompts.length} prompts · ${SERVER_INFO.name}@${SERVER_INFO.version}`
  );

  // 配置校验：技能集与工具集各自独立过滤。若启用的技能点名了当前工具集之外的工具
  // （典型：prompts=full 但 tools 仍为默认 core），客户端 model 编排到该步会拿到
  // 「Unknown tool」。启动时显式告警并指明补救，避免技能半路静默失败。
  const activeToolNames = new Set(tools.map((t) => t.name));
  const missingForPrompts = new Set<string>();
  for (const p of prompts) {
    for (const name of p.usesTools) {
      if (!activeToolNames.has(name)) missingForPrompts.add(name);
    }
  }
  if (missingForPrompts.size > 0) {
    logStderr(
      `[stock-sdk mcp] ⚠ 已启用的技能引用了 ${missingForPrompts.size} 个不在当前工具集内的工具：` +
        `${[...missingForPrompts].join(', ')}。这些技能编排到该步会失败 —— ` +
        `请设 STOCK_SDK_MCP_TOOLS=full（或把这些工具加进名单）。`
    );
  }

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
