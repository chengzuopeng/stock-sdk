/**
 * 工具注册表：自 `src/spec/methods.ts` 的共享方法 spec 派生全部 ToolDef
 * （CLI 与 MCP 单一事实来源），提供按 tier / 名称列表的过滤。
 * 见 mcp.md §3 / §10。
 *
 * 仅 get_kline_with_indicators 保留手写 schema/invoke（嵌套 indicators 对象
 * 无法由扁平 ParamSpec 表达，原因见 ./kline.ts），其余 78 个工具全部派生。
 */
import type { ToolDef, ToolTier } from '../types';
import { METHOD_SPECS } from '../../spec/methods';
import { toToolDef } from '../../spec/derive-mcp';
import { klineWithIndicatorsTool } from './kline';

/** spec 标记 mcpCustom 的手写工具（按方法点分路径注册）。 */
const CUSTOM_TOOLS: Record<string, ToolDef> = {
  'kline.withIndicators': klineWithIndicatorsTool,
};

export const TOOLS: ToolDef[] = METHOD_SPECS.filter((s) => s.mcp !== false).map((s) => {
  if (s.mcpCustom) {
    const custom = CUSTOM_TOOLS[s.path.join('.')];
    if (!custom) throw new Error(`方法 ${s.path.join('.')} 标记了 mcpCustom 但未注册手写工具`);
    return custom;
  }
  return toToolDef(s);
});

export const TOOL_MAP = new Map<string, ToolDef>(TOOLS.map((t) => [t.name, t]));

/**
 * 按范围过滤工具：
 * - `'core'`：仅高频核心集（默认）
 * - `'full'`：全部
 * - `string[]`：精确 name 列表
 */
export function listTools(filter: ToolTier | string[]): ToolDef[] {
  if (Array.isArray(filter)) {
    const set = new Set(filter);
    return TOOLS.filter((t) => set.has(t.name));
  }
  if (filter === 'full') return TOOLS;
  return TOOLS.filter((t) => t.tier === 'core');
}
