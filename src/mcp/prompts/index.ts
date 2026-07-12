/**
 * 技能注册表：自 `src/spec/prompts.ts` 的 PromptSpec 派生全部 PromptDef，
 * 提供按 tier / 名称列表的过滤（对称 tools/index.ts）。见 mcp-skills-prompts-td.md §3.3。
 */
import { PROMPT_SPECS } from '../../spec/prompts';
import { toPromptDef, type PromptDef } from '../../spec/derive-prompt';

export const PROMPTS: PromptDef[] = PROMPT_SPECS.map(toPromptDef);

export const PROMPT_MAP = new Map<string, PromptDef>(PROMPTS.map((p) => [p.name, p]));

/**
 * 按范围过滤技能：
 * - `'core'`：仅默认高频集
 * - `'full'`：全部
 * - `string[]`：精确 name 列表
 */
export function listPrompts(filter: 'core' | 'full' | string[]): PromptDef[] {
  if (Array.isArray(filter)) {
    const set = new Set(filter);
    return PROMPTS.filter((p) => set.has(p.name));
  }
  if (filter === 'full') return PROMPTS;
  return PROMPTS.filter((p) => p.tier === 'core');
}
