/**
 * spec → MCP 派生器：把 MethodSpec 转成 `src/mcp` 的 ToolDef（inputSchema + invoke）。
 *
 * 规则（保持 MCP 工具对外契约不变）：
 * - 属性名 = `jsonKey ?? field ?? flag`（如 CLI 的 --ndays 对外仍是 recentDays）；
 * - 线上枚举 = spec.enum 经 map 映射（adjust 的 none → ''），全库枚举单一来源；
 * - `default` 仅进 schema 做展示，invoke 不注入实参（默认值由 SDK 落地，与 CLI 一致）；
 * - invoke 由 argShape 自动组装：positional 按声明序取属性、params 按 field 写进 options 对象，
 *   并用 apply 保留命名空间上下文（顶层 search 等原型方法不丢 this）。
 */
import type { JsonSchema, JsonSchemaProp, ToolDef } from '../mcp/types';
import { resolveSdkMethod } from './resolve';
import type { MethodSpec, ParamSpec, SpecPositional } from './methods';

/** ParamSpec.type → JSON Schema 类型（数值参数现行 schema 均为 integer）。 */
const JSON_TYPE: Record<string, JsonSchemaProp['type']> = {
  string: 'string',
  enum: 'string',
  number: 'integer',
  boolean: 'boolean',
};

/** MCP 属性名（jsonKey 优先，缺省与 SDK 字段名一致）。 */
export function jsonKeyOf(p: ParamSpec): string {
  return p.jsonKey ?? p.field ?? p.flag;
}

/** MCP 线上枚举：CLI 取值经 map 映射（none → ''）。 */
export function mcpEnumOf(p: ParamSpec): string[] | undefined {
  return p.enum?.map((v) => p.map?.[v] ?? v);
}

/** ParamSpec → JSON Schema 属性（亦供手写工具复用片段，保证枚举/文案同源）。 */
export function paramProp(p: ParamSpec): JsonSchemaProp {
  const type = JSON_TYPE[p.type];
  if (!type) throw new Error(`参数 --${p.flag} 的类型 ${p.type} 不能派生 MCP schema（请标记 mcp:false）`);
  const prop: JsonSchemaProp = { type };
  const en = mcpEnumOf(p);
  if (en) prop.enum = en;
  if (p.default !== undefined) prop.default = p.default;
  const desc = p.mcpDesc ?? p.desc;
  if (desc) prop.description = desc;
  return prop;
}

/** 位置参数 → JSON Schema 属性（同名 string 属性，required 跟随）。 */
function positionalProp(p: SpecPositional): JsonSchemaProp {
  const prop: JsonSchemaProp = { type: 'string' };
  if (p.enum) prop.enum = p.enum;
  if (p.default !== undefined) prop.default = p.default;
  if (p.desc) prop.description = p.desc;
  return prop;
}

/**
 * 代码数组属性（codes[] / codes+options 形态的默认文案）。
 *
 * 注意：当前 8 个 codes 入口【全部】用 spec.codesDesc 给出市场专属文案
 * （见 methods.ts），故此默认 description 目前是不渲染的兜底——三市场混合
 * 文案曾误导 LLM 对单市场工具传跨市场代码（review 修正）。新增 codes 工具
 * 请一并声明 codesDesc；provider 层已由 tryToTencentSymbols 容错归一。
 */
const CODES_PROP: JsonSchemaProp = {
  type: 'array',
  items: { type: 'string' },
  description:
    "代码数组，带不带交易所前缀均可（A 股 '600036'/'sh600519'；港股 '00700'/'hk00700'；" +
    "美股 'AAPL'/'usAAPL'）。A 股指数需带前缀（如 'sh000001'）；" +
    '无法识别或该数据源不覆盖的代码（如中证特殊指数）会被跳过而非报错',
};

/** 取该方法 MCP 侧可见的参数。 */
function mcpParams(spec: MethodSpec): ParamSpec[] {
  return (spec.params ?? []).filter((p) => p.mcp !== false);
}

/** MethodSpec → inputSchema：codes/positional/params 依序成为属性，required 跟随声明。 */
function toInputSchema(spec: MethodSpec): JsonSchema {
  const properties: Record<string, JsonSchemaProp> = {};
  const required: string[] = [];
  if (spec.argShape === 'codes[]' || spec.argShape === 'codes+options') {
    properties.codes = spec.codesDesc
      ? { ...CODES_PROP, description: spec.codesDesc }
      : CODES_PROP;
    required.push('codes');
  }
  for (const pos of spec.positional ?? []) {
    properties[pos.name] = positionalProp(pos);
    if (pos.required) required.push(pos.name);
  }
  for (const p of mcpParams(spec)) {
    properties[jsonKeyOf(p)] = paramProp(p);
    if (p.required) required.push(jsonKeyOf(p));
  }
  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
    additionalProperties: false,
  };
}

/** 沿 path 取 SDK 方法并保留父级上下文（与 CLI dispatch.invokeMethod 同语义）。 */
function resolveMethod(sdk: unknown, path: string[]): (args: unknown[]) => unknown {
  // walker 收编进 spec/resolve(P3-13),与 CLI dispatch.invokeMethod 同一实现
  const resolved = resolveSdkMethod(sdk, path);
  if (!resolved) {
    // spec 路径与 options 键集由 test/unit/spec/resolve-coverage.test.ts 全量钉住，
    // 此处仅防御性兜底
    throw new Error(`SDK 上不存在方法: ${path.join('.')}`);
  }
  return (args) => resolved.fn.apply(resolved.parent, args);
}

/** MethodSpec → invoke：按 argShape 把扁平 args 重组成 SDK 方法签名。 */
function buildInvoke(spec: MethodSpec): ToolDef['invoke'] {
  const positional = spec.positional ?? [];
  const params = mcpParams(spec);
  return (sdk, a) => {
    const call = resolveMethod(sdk, spec.path);
    const posArgs = positional.map((p) => a[p.name]);
    // options 对象按 SDK 字段名组装（显式带 undefined 键，与原手写 invoke 一致）
    const options: Record<string, unknown> = {};
    for (const p of params) options[p.field ?? p.flag] = a[jsonKeyOf(p)];
    switch (spec.argShape) {
      case 'none':
        return call([]);
      case 'codes[]':
        return call([a.codes]);
      case 'codes+options':
        return call([a.codes, options]);
      case 'symbol+options':
        return call([...posArgs, options]);
      case 'options':
        return call([options]);
      case 'positional':
        return call(posArgs);
      default:
        throw new Error(`不支持的 argShape: ${spec.argShape as string}`);
    }
  };
}

/** MethodSpec → ToolDef（mcp:false / mcpCustom 的 spec 不在此派生）。 */
export function toToolDef(spec: MethodSpec): ToolDef {
  if (spec.mcp === false || !spec.toolName) {
    throw new Error(`方法 ${spec.path.join('.')} 未声明 MCP 工具，不能派生 ToolDef`);
  }
  if (spec.mcpCustom) {
    throw new Error(`方法 ${spec.path.join('.')} 的 MCP 工具为手写实现，不能自动派生`);
  }
  return {
    name: spec.toolName,
    description: spec.mcpDesc ?? spec.summary,
    inputSchema: toInputSchema(spec),
    tier: spec.tier ?? 'full',
    invoke: buildInvoke(spec),
  };
}
