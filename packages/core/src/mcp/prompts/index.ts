/**
 * 技能注册表：自 `src/spec/prompts.ts` 的 PromptSpec 派生全部 PromptDef，
 * 提供按 tier / 名称列表的过滤（对称 tools/index.ts）。见 mcp-skills-prompts-td.md §3.3。
 */
import { PROMPT_SPECS } from '../../spec/prompts';
import { toPromptDef, type PromptDef } from '../../spec/derive-prompt';
import { filterByTier } from '../types';

export const PROMPTS: PromptDef[] = PROMPT_SPECS.map(toPromptDef);

export const PROMPT_MAP = new Map<string, PromptDef>(PROMPTS.map((p) => [p.name, p]));

/** 按范围过滤技能（core / full / 名单;与 tools 共用 filterByTier）。 */
export function listPrompts(filter: 'core' | 'full' | string[]): PromptDef[] {
  return filterByTier(PROMPTS, filter);
}
