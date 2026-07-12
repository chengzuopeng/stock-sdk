/**
 * spec → MCP 派生器：把 PromptSpec 转成 MCP 的 PromptDef（arguments 形状 + render）。
 *
 * 与 derive-mcp（MethodSpec → ToolDef）对称。render 在 spec.render 外再包一层
 * 必填校验 + 默认值填充，使其自洽（server 层也会捕获抛错转成 JSON-RPC error）。
 */
import { InvalidArgumentError } from '../core/errors';
import type { PromptSpec } from './prompts';

/** MCP `prompts/list` 里单个 argument 的形状。 */
export interface PromptArgumentDef {
  name: string;
  description: string;
  required: boolean;
}

/** 一个派生后的 MCP prompt 定义。 */
export interface PromptDef {
  name: string;
  title: string;
  description: string;
  tier: 'core' | 'full';
  arguments: PromptArgumentDef[];
  /** contract 测试用（不进 prompts/list 输出）。 */
  usesTools: string[];
  /** 把用户传入的 arguments 插值成任务说明书文本；必填缺失抛 InvalidArgumentError。 */
  render: (args: Record<string, string>) => string;
}

export function toPromptDef(spec: PromptSpec): PromptDef {
  return {
    name: spec.name,
    title: spec.title,
    description: spec.description,
    tier: spec.tier,
    arguments: spec.args.map((a) => ({
      name: a.name,
      description: a.description,
      required: a.required === true,
    })),
    usesTools: spec.usesTools,
    render: (raw) => {
      // 必填校验 + 默认值填充（纯函数自洽；server 也会校验）
      const filled: Record<string, string> = {};
      for (const a of spec.args) {
        // v 取 unknown：server 层把客户端 arguments 强转成 Record<string,string> 但
        // 容忍非字符串值，故运行期可能收到 null / number 等。null 必须与 undefined/''
        // 同样视为「缺失」，否则会绕过必填 throw、并让模板插值出字面量 "null"。
        const v: unknown = raw[a.name];
        if (v === undefined || v === null || v === '') {
          if (a.required) {
            throw new InvalidArgumentError(`缺少必填参数 "${a.name}"`, { argument: a.name });
          }
          if (a.default !== undefined) filled[a.name] = a.default;
        } else {
          filled[a.name] = typeof v === 'string' ? v : String(v);
        }
      }
      return spec.render(filled);
    },
  };
}
