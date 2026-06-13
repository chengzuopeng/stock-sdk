/**
 * spec → CLI 派生器：把 MethodSpec 转成 `src/cli` 的 CommandSpec。
 *
 * 规则（保持 CLI 现状行为不变）：
 * - 仅取 `cli !== false` 的参数；该方法若一个 CLI 参数都没有则 options 置 undefined
 *   （声明了 options 的命令对未知 flag 严格拒绝，零声明命令保持「未声明透传」语义）。
 * - spec 的 `default` 仅用于 MCP schema 展示，CLI 从不注入默认值（默认由 SDK 落地），
 *   因此派生时丢弃 default。
 * - 位置参数原样下放（enum/upper/required 在 dispatch 层统一校验）。
 */
import type { CommandSpec, OptionSpec, PositionalSpec } from '../cli/types';
import type { MethodSpec, ParamSpec, SpecPositional } from './methods';

/** 单个 ParamSpec → CLI OptionSpec（亦供 manifest 的别名命令复用片段）。 */
export function toOptionSpec(p: ParamSpec): OptionSpec {
  const opt: OptionSpec = { flag: p.flag, type: p.type, desc: p.desc };
  if (p.field !== undefined) opt.field = p.field;
  if (p.enum) opt.enum = p.enum; // 保留同一数组引用：全库枚举单一来源
  if (p.required) opt.required = true;
  if (p.upper) opt.upper = true;
  if (p.map) opt.map = p.map;
  return opt;
}

function toPositionalSpec(p: SpecPositional): PositionalSpec {
  const pos: PositionalSpec = { name: p.name };
  if (p.required) pos.required = true;
  if (p.variadic) pos.variadic = true;
  if (p.enum) pos.enum = p.enum;
  if (p.upper) pos.upper = true;
  return pos;
}

/**
 * MethodSpec → CommandSpec。
 * @param invoke 自定义调用（northbound 方向参数、withIndicators 指标组装等），
 *               实现留在 `src/cli/manifest.ts`（依赖 CLI 运行时），spec 保持纯数据。
 */
export function toCommandSpec(spec: MethodSpec, invoke?: CommandSpec['invoke']): CommandSpec {
  const options = (spec.params ?? []).filter((p) => p.cli !== false).map(toOptionSpec);
  return {
    path: spec.path,
    summary: spec.summary,
    argShape: spec.argShape,
    positional: spec.positional?.map(toPositionalSpec),
    options: options.length > 0 ? options : undefined,
    invoke,
  };
}
