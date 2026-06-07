/**
 * 工具注册表：聚合各领域 ToolDef，提供按 tier / 名称列表的过滤。
 * 见 mcp.md §3 / §10。
 */
import type { ToolDef, ToolTier } from '../types';
import { quotesTools, searchTools, codesTools, batchTools } from './quotes';
import { klineTools } from './kline';
import { boardTools } from './board';
import { fundFlowTools } from './fundFlow';
import { northboundTools } from './northbound';
import { marketEventTools } from './marketEvent';
import { dragonTigerTools } from './dragonTiger';
import { futuresTools } from './futures';
import { optionsTools } from './options';
import { fundTools } from './fund';
import { calendarTools } from './calendar';
import { referenceTools } from './reference';

export const TOOLS: ToolDef[] = [
  ...quotesTools,
  ...searchTools,
  ...codesTools,
  ...batchTools,
  ...klineTools,
  ...boardTools,
  ...fundFlowTools,
  ...northboundTools,
  ...marketEventTools,
  ...dragonTigerTools,
  ...futuresTools,
  ...optionsTools,
  ...fundTools,
  ...calendarTools,
  ...referenceTools,
];

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
