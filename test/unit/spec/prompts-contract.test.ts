/**
 * MCP Skills（Prompts）契约测试 —— 防「技能声称 vs 实现」漂移（沿用 R7-15 风格）。
 *
 * 技能模板点名的工具必须真实存在、tier 不越级、模板确实引用了声明的工具，
 * 且必填/默认参数行为自洽。skills.md 早先「宣称 signals 但无此工具」那类债，
 * 就是缺这层机械兜底。见 mcp-skills-prompts-td.md §8 / §11.2。
 */
import { describe, it, expect } from 'vitest';
import { PROMPT_SPECS, type PromptSpec } from '../../../src/spec/prompts';
import { toPromptDef } from '../../../src/spec/derive-prompt';
import { PROMPTS, listPrompts } from '../../../src/mcp/prompts';
import { TOOL_MAP } from '../../../src/mcp/tools';
import { InvalidArgumentError } from '../../../src/core/errors';

/** 用占位值填满一个技能的全部参数（required + optional），供 render 冒烟。 */
function mockArgs(spec: PromptSpec): Record<string, string> {
  const args: Record<string, string> = {};
  for (const a of spec.args) args[a.name] = a.default ?? `test_${a.name}`;
  return args;
}

describe('prompts-contract①: 技能引用的工具都真实存在', () => {
  it('每个 usesTools 的 toolName 都在 TOOL_MAP 里', () => {
    for (const spec of PROMPT_SPECS) {
      for (const name of spec.usesTools) {
        expect(TOOL_MAP.has(name), `技能 ${spec.name} 引用了不存在的工具 ${name}`).toBe(true);
      }
    }
  });
});

describe('prompts-contract②: core 技能不越级引用 full 工具', () => {
  it('core 技能的 usesTools 必须全是 core 工具（默认配置下才不会指名未暴露的工具）', () => {
    for (const spec of PROMPT_SPECS) {
      if (spec.tier !== 'core') continue;
      for (const name of spec.usesTools) {
        const tool = TOOL_MAP.get(name);
        expect(tool?.tier, `core 技能 ${spec.name} 引用了 full 工具 ${name}`).toBe('core');
      }
    }
  });
});

describe('prompts-contract③: 模板确实引用了它声明的每个工具', () => {
  it('render(mockArgs) 文本里包含 usesTools 的每个 toolName', () => {
    for (const spec of PROMPT_SPECS) {
      const text = spec.render(mockArgs(spec));
      for (const name of spec.usesTools) {
        expect(text.includes(name), `技能 ${spec.name} 的模板未点名工具 ${name}`).toBe(true);
      }
    }
  });

  it('模板末尾统一带「用用户语言作答」纪律', () => {
    for (const spec of PROMPT_SPECS) {
      const text = spec.render(mockArgs(spec));
      expect(text, `技能 ${spec.name} 模板缺少语言指令`).toContain(
        'Respond in the same language'
      );
    }
  });
});

describe('prompts-contract④: 必填校验 + 默认值填充', () => {
  it('缺必填参数时派生后的 render 抛 InvalidArgumentError', () => {
    for (const spec of PROMPT_SPECS) {
      const hasRequired = spec.args.some((a) => a.required);
      if (!hasRequired) continue;
      const def = toPromptDef(spec);
      expect(() => def.render({}), `技能 ${spec.name} 缺必填未抛错`).toThrow(
        InvalidArgumentError
      );
    }
  });

  it('可选参数缺省走 default（analyze_stock 的 period=daily 进入文本）', () => {
    const def = toPromptDef(PROMPT_SPECS.find((s) => s.name === 'analyze_stock')!);
    const text = def.render({ symbol: '600519' });
    expect(text).toContain('daily');
  });

  it('null / 非字符串值等同缺失：必填抛错、可选回落 default，不泄漏字面量 "null"', () => {
    const def = toPromptDef(PROMPT_SPECS.find((s) => s.name === 'analyze_stock')!);
    // 必填 symbol=null：必须抛错，不能绕过必填、更不能把 "null" 插进说明书
    expect(() =>
      def.render({ symbol: null as unknown as string })
    ).toThrow(InvalidArgumentError);
    // 可选 period=null：回落到 default 'daily'，而非字面量 "null"
    const text = def.render({ symbol: '600519', period: null as unknown as string });
    expect(text).toContain('daily');
    expect(text).not.toContain('null');
    // 非字符串但有效值（number）被安全字符串化
    const text2 = def.render({ symbol: 600519 as unknown as string });
    expect(text2).toContain('600519');
  });
});

describe('prompts-contract⑤: tier 过滤与规模', () => {
  it('listPrompts core=4 / full=7，名单过滤命中', () => {
    expect(listPrompts('core').length).toBe(4);
    expect(listPrompts('full').length).toBe(7);
    const picked = listPrompts(['analyze_stock', 'analyze_fund']);
    expect(picked.map((p) => p.name).sort()).toEqual(['analyze_fund', 'analyze_stock']);
  });
});

describe('prompts-contract⑥: name 唯一 + snake_case + 非空展示字段', () => {
  it('name 唯一且 snake_case，title/description 非空', () => {
    const names = PROMPT_SPECS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length); // 无重名
    for (const spec of PROMPT_SPECS) {
      expect(spec.name, `${spec.name} 非 snake_case`).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(spec.title.length, `${spec.name} title 为空`).toBeGreaterThan(0);
      expect(spec.description.length, `${spec.name} description 为空`).toBeGreaterThan(0);
    }
  });

  it('PROMPT_MAP/PROMPTS 与 spec 一一对应', () => {
    expect(PROMPTS.length).toBe(PROMPT_SPECS.length);
  });
});

describe('prompts-contract⑦: 技能清单快照（name/tier/args/usesTools 变动可见）', () => {
  it('PROMPT_SPECS 结构快照', () => {
    const snapshot = PROMPT_SPECS.map((s) => ({
      name: s.name,
      tier: s.tier,
      args: s.args.map((a) => ({ name: a.name, required: a.required === true })),
      usesTools: s.usesTools,
    }));
    expect(snapshot).toMatchSnapshot();
  });
});
