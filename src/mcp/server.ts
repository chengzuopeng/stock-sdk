/**
 * MCP server 入口（stdio + tools 子集，零依赖手写）。
 * 见 mcp.md §2 / §7 / §8。也作为 `stock-sdk/mcp` subpath 的程序化入口。
 *
 * 分发逻辑抽成纯函数 `dispatchMessage`（可单测）；`startMcpServer` 负责 transport 绑定。
 */
import { StockSDK, type StockSDKOptions } from '../sdk';
import { InvalidArgumentError } from '../core';
import { MAX_TIMEOUT_MS } from '../core/constants';
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
  type JsonRpcResponse,
} from './protocol';
import { listTools } from './tools';
import { listPrompts } from './prompts';
import type { PromptDef } from '../spec/derive-prompt';
import { resolveTierFilter, type JsonSchemaProp, type ToolDef, type ToolTier } from './types';
import { parseHistoryWindow, toToolResult, toolErrorResult } from './result';

/** 技能集范围：'core'(默认) / 'full' / 指定 name 列表。 */
export type PromptTier = 'core' | 'full';

export interface DispatchContext {
  sdk: StockSDK;
  tools: ToolDef[];
  toolMap: Map<string, ToolDef>;
  prompts: PromptDef[];
  promptMap: Map<string, PromptDef>;
}

function missingPromptTools(prompt: PromptDef, toolMap: ReadonlyMap<string, ToolDef>): string[] {
  return prompt.usesTools.filter((name) => !toolMap.has(name));
}

/** 普通对象判定（排除 null 与数组）—— JSON-RPC params/arguments 必须是对象 */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function requestId(message: unknown): JsonRpcId {
  if (!isObject(message)) return null;
  const id = message.id;
  return typeof id === 'string' || (typeof id === 'number' && Number.isInteger(id)) ? id : null;
}

function matchesJsonSchemaType(v: unknown, type: NonNullable<JsonSchemaProp['type']>): boolean {
  switch (type) {
    case 'array':
      return Array.isArray(v);
    case 'string':
      return typeof v === 'string';
    case 'integer':
      return Number.isInteger(v);
    case 'number':
      return typeof v === 'number' && Number.isFinite(v);
    case 'boolean':
      return typeof v === 'boolean';
    case 'object':
      return isObject(v);
  }
}

/** 按工具声明的 JSON Schema 子集校验参数，并在错误信息中指出字段路径。 */
function validateArgs(schema: JsonSchemaProp, value: unknown, path = ''): string | null {
  if (schema.type && !matchesJsonSchemaType(value, schema.type)) {
    return `参数 "${path}" 类型应为 ${schema.type}`;
  }
  if (schema.enum && !schema.enum.some((entry) => entry === value)) {
    return `参数 "${path}" 取值非法「${String(value)}」，可选: ${schema.enum.join(' / ')}`;
  }
  if (schema.anyOf) {
    const matches = schema.anyOf.filter((prop) => !prop.type || matchesJsonSchemaType(value, prop.type));
    if (matches.length === 0) {
      return `参数 "${path}" 类型应为 ${schema.anyOf.map((prop) => prop.type).join(' / ')}`;
    }
    const errors = matches.map((prop) => validateArgs(prop, value, path));
    if (!errors.includes(null)) return errors[0];
  }
  if (schema.items && Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const error = validateArgs(schema.items, value[index], `${path}[${index}]`);
      if (error) return error;
    }
  }
  if (isObject(value)) {
    const properties = schema.properties ?? {};
    const fieldPath = (key: string) => path ? `${path}.${key}` : key;
    for (const key of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(value, key) || value[key] == null) {
        return `缺少必填参数 "${fieldPath(key)}"`;
      }
    }
    for (const [key, item] of Object.entries(value)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) {
        if (schema.additionalProperties === false) return `未知参数 "${fieldPath(key)}"`;
        continue;
      }
      if (item === undefined) continue;
      const error = validateArgs(properties[key], item, fieldPath(key));
      if (error) return error;
    }
  }
  return null;
}

/**
 * 处理单条 JSON-RPC 请求，返回响应；通知类（无需回应）返回 `null`。
 * 纯函数（除工具内部 IO），便于单测。
 */
export async function dispatchMessage(
  msg: unknown,
  ctx: DispatchContext
): Promise<JsonRpcResponse | null> {
  const id = requestId(msg);
  const ok = (result: unknown): JsonRpcResponse => ({ jsonrpc: '2.0', id, result });
  const err = (code: number, message: string): JsonRpcResponse => ({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  });

  if (
    !isObject(msg) ||
    msg.jsonrpc !== '2.0' ||
    typeof msg.method !== 'string' ||
    msg.method.length === 0 ||
    (msg.id !== undefined && id === null)
  ) {
    return err(RPC_INVALID_REQUEST, 'Invalid Request');
  }
  if (id === null) return null;

  const params = msg.params;
  if (params !== undefined && !isObject(params)) {
    return err(RPC_INVALID_PARAMS, 'params must be an object');
  }

  switch (msg.method) {
    case 'initialize': {
      const pv = params?.protocolVersion;
      return ok({
        protocolVersion: negotiateProtocolVersion(pv),
        // prompts.listChanged 暂不支持（技能集是构建期静态的）
        capabilities: { tools: {}, prompts: {} },
        serverInfo: SERVER_INFO,
      });
    }

    case 'notifications/initialized':
    case 'notifications/cancelled':
      return err(RPC_INVALID_REQUEST, 'Notifications must not include an id');

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
      if (!params) return err(RPC_INVALID_PARAMS, 'params must be an object');
      const name = params.name;
      if (typeof name !== 'string') return err(RPC_INVALID_PARAMS, 'params.name must be a string');
      const tool = ctx.toolMap.get(name);
      if (!tool) return err(RPC_INVALID_PARAMS, `Unknown tool: ${name}`);
      const rawArgs = params.arguments;
      if (rawArgs !== undefined && !isObject(rawArgs)) {
        return err(RPC_INVALID_PARAMS, 'params.arguments must be an object');
      }
      const args = rawArgs ?? {};
      const argError = validateArgs(tool.inputSchema, args);
      if (argError) {
        // 入参不合规 → 干净的 INVALID_ARGUMENT(isError result,LLM 可见可纠正),
        // 而非让脏入参流进 SDK 抛出泄漏实现细节的 Error[UNKNOWN]。
        return ok(toolErrorResult(new InvalidArgumentError(argError)));
      }
      try {
        const window = tool.output === 'fundHistory' ? parseHistoryWindow(args) : undefined;
        const out = await tool.invoke(ctx.sdk, args);
        return ok(toToolResult(out, tool.output, window));
      } catch (e) {
        // 工具执行失败 → isError result（非 JSON-RPC error），让 LLM 可见并处理
        return ok(toolErrorResult(e));
      }
    }

    case 'prompts/list':
      return ok({
        prompts: ctx.prompts
          .filter((p) => missingPromptTools(p, ctx.toolMap).length === 0)
          .map((p) => ({
            name: p.name,
            title: p.title,
            description: p.description,
            arguments: p.arguments,
          })),
      });

    case 'prompts/get': {
      if (!params) return err(RPC_INVALID_PARAMS, 'params must be an object');
      const name = params.name;
      if (typeof name !== 'string') return err(RPC_INVALID_PARAMS, 'params.name must be a string');
      const prompt = ctx.promptMap.get(name);
      if (!prompt) return err(RPC_INVALID_PARAMS, `Unknown prompt: ${name}`);
      const missingTools = missingPromptTools(prompt, ctx.toolMap);
      if (missingTools.length > 0) {
        return err(RPC_INVALID_PARAMS, `Prompt ${name} requires tools: ${missingTools.join(', ')}`);
      }
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
      return err(RPC_METHOD_NOT_FOUND, `Unknown method: ${msg.method}`);
  }
}

export interface McpServerOptions {
  /** 工具集范围：'core'(默认) / 'full' / 指定 name 列表 */
  tools?: ToolTier | string[];
  /** 技能集范围：'core'(默认) / 'full' / 指定 name 列表。只提供工具齐全的技能。 */
  prompts?: PromptTier | string[];
  /**
   * 透传给 StockSDK 的构造参数（timeout / retry / rateLimit / circuitBreaker / providerPolicies /
   * klineFallback 等）。也可通过环境变量 STOCK_SDK_MCP_TIMEOUT 单独设置超时（毫秒）。
   */
  sdk?: StockSDKOptions;
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
function resolveSdkOptions(explicit?: StockSDKOptions): StockSDKOptions {
  if (explicit) return explicit;
  const timeout = Number(process.env.STOCK_SDK_MCP_TIMEOUT);
  return Number.isInteger(timeout) && timeout > 0 && timeout <= MAX_TIMEOUT_MS ? { timeout } : {};
}

/** 启动 MCP server（监听 stdin，直到 stdin 关闭后 event loop 自然退出） */
export function startMcpServer(options: McpServerOptions = {}): void {
  const sdk = new StockSDK(resolveSdkOptions(options.sdk));
  const toolFilter = resolveFilter(options.tools);
  const promptFilter = resolvePromptFilter(options.prompts);
  const tools = listTools(toolFilter);
  const prompts = listPrompts(promptFilter);
  const ctx: DispatchContext = {
    sdk,
    tools,
    toolMap: new Map(tools.map((t) => [t.name, t])),
    prompts,
    promptMap: new Map(prompts.map((p) => [p.name, p])),
  };

  const unavailablePrompts = prompts.flatMap((prompt) => {
    const missing = missingPromptTools(prompt, ctx.toolMap);
    return missing.length ? [`${prompt.name} (${missing.join(', ')})`] : [];
  });
  logStderr(
    `[stock-sdk mcp] ready · ${tools.length} tools · ${prompts.length - unavailablePrompts.length} prompts · ${SERVER_INFO.name}@${SERVER_INFO.version}`
  );

  // 名单过滤的未知名告警：笔误的工具/技能名此前静默产出 0 集合,
  // 只有 ready 行的计数可察 —— 现对照注册结果显式点名
  const warnUnknownNames = (
    kind: string,
    filter: 'core' | 'full' | string[],
    resolved: ReadonlyArray<{ name: string }>
  ) => {
    if (!Array.isArray(filter)) return;
    const known = new Set(resolved.map((x) => x.name));
    const unknown = filter.filter((n) => !known.has(n));
    if (unknown.length > 0) {
      logStderr(
        `[stock-sdk mcp] ⚠ ${kind} 名单中有 ${unknown.length} 个未知名（已忽略）：${unknown.join(', ')}`
      );
    }
  };
  warnUnknownNames('工具', toolFilter, tools);
  warnUnknownNames('技能', promptFilter, prompts);

  if (unavailablePrompts.length > 0) {
    logStderr(
      `[stock-sdk mcp] ⚠ 以下技能缺少依赖工具，已从列表中隐藏：${unavailablePrompts.join(' / ')}。` +
        '请设 STOCK_SDK_MCP_TOOLS=full 或把这些工具加进名单。'
    );
  }

  createLineReader((line) => {
    void handleLine(line);
  });

  // stdin 关闭（MCP client 断开）→ 记日志并让 event loop 自然退出
  // （不强制 process.exit，避免截断未 flush 的响应 / 未完成的请求）
  process.stdin.on('end', () => logStderr('[stock-sdk mcp] stdin closed, exiting'));

  async function handleLine(line: string): Promise<void> {
    let msg: unknown;
    try {
      msg = JSON.parse(line);
    } catch {
      writeMessage({ jsonrpc: '2.0', id: null, error: { code: RPC_PARSE_ERROR, message: 'Parse error' } });
      return;
    }
    try {
      const res = await dispatchMessage(msg, ctx);
      if (res) writeMessage(res);
    } catch (e) {
      logStderr('[stock-sdk mcp] internal error:', (e as Error)?.message ?? String(e));
      const id = requestId(msg);
      if (id !== null) {
        writeMessage({
          jsonrpc: '2.0',
          id,
          error: { code: RPC_INTERNAL_ERROR, message: String((e as Error)?.message ?? e) },
        });
      }
    }
  }
}
