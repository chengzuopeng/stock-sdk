/**
 * MCP 工具描述符与 JSON Schema 类型（零依赖手写）。
 *
 * 设计见 mcp.md §3：每个工具自描述（schema + 显式 invoke 映射），
 * 由 invoke 显式把扁平 args 重组成 StockSDK 命名空间方法签名，
 * 杜绝 `...Object.values(args)` 那种位置参数错乱。
 */
import type { StockSDK } from '../sdk';

/** 极简 JSON Schema 属性（仅覆盖工具入参所需子集） */
export interface JsonSchemaProp {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: readonly (string | number)[];
  items?: JsonSchemaProp;
  default?: string | number | boolean;
  properties?: Record<string, JsonSchemaProp>;
}

/** 工具 inputSchema（对象型） */
export interface JsonSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProp>;
  required?: string[];
  additionalProperties?: boolean;
}

/** 工具集分级：core = 默认高频集；full = 全量 */
export type ToolTier = 'core' | 'full';

/**
 * 一个 MCP 工具的完整定义。
 *
 * `invoke` 接收已解析的 `args`（来自 `tools/call` 的 `arguments`），
 * 显式映射到 `StockSDK` 调用并返回数据；同步/异步返回均可（server 会 await）。
 */
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  tier: ToolTier;
  invoke: (sdk: StockSDK, args: Record<string, unknown>) => unknown | Promise<unknown>;
}
