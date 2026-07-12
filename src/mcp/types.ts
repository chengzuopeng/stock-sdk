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
 * 通用集合范围解析：显式参数 > 环境变量 > 'core'。
 * - tier 关键字大小写容错（'FULL'/'Core' 此前被当名单过滤 → 0 集合零告警）；
 * - 空列表回退 core（env 空串与显式 [] 同语义，避免静默零集合的不对称）。
 * 名单中的未知名不在此校验（tools/prompts 注册表各异），由 startMcpServer
 * 对照实际注册结果告警。放在本模块（非 subpath 入口）以免进入公共 d.ts。
 */
export function resolveTierFilter(
  explicit: ToolTier | string[] | undefined,
  envName: string
): ToolTier | string[] {
  if (explicit) {
    return Array.isArray(explicit) && explicit.length === 0 ? 'core' : explicit;
  }
  const env = process.env[envName];
  if (!env) return 'core';
  const tier = env.trim().toLowerCase();
  if (tier === 'core' || tier === 'full') return tier;
  const names = env.split(',').map((s) => s.trim()).filter(Boolean);
  return names.length > 0 ? names : 'core';
}

/**
 * 按范围过滤注册表（tools 与 prompts 共用同一形状，防两份过滤逻辑漂移）：
 * - `'core'`：仅 tier === 'core'
 * - `'full'`：全部
 * - `string[]`：精确 name 列表
 */
export function filterByTier<T extends { name: string; tier: ToolTier }>(
  items: readonly T[],
  filter: ToolTier | string[]
): T[] {
  if (Array.isArray(filter)) {
    const set = new Set(filter);
    return items.filter((x) => set.has(x.name));
  }
  if (filter === 'full') return [...items];
  return items.filter((x) => x.tier === 'core');
}

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
