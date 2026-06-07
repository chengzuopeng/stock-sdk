/**
 * 命令分发（cli.md §3 / §9）：按 argShape 把位置参数 + flags 组装成实参并调用 SDK。
 *
 * 选项校验(未知 flag / enum / 类型 / 缺值 / 重复 / 必填)与 `--limit` 输出裁剪在 dispatch
 * 层【统一】执行 —— 别名命令(自定义 `invoke`)与命名空间直达命令走同一套校验,杜绝
 * 「别名绕过 enum/类型校验」「--limit 只在别名生效」这类两条路径不一致的问题。
 */
import type { StockSDK } from '../sdk';
import { CliUsageError } from './errors';
import type { CommandSpec, InvokeContext, OptionSpec, PositionalSpec } from './types';

/** 未声明 flag 的字段名映射：CLI 习惯的 --start/--end → SDK 的 startDate/endDate。 */
const FLAG_ALIAS: Record<string, string> = { start: 'startDate', end: 'endDate' };

/** 全局选项(命令无关,index.ts 的 resolveGlobal 消费):不属命令 option、不透传 SDK、不报「未知选项」。 */
const GLOBAL_FLAGS = new Set([
  'format', 'f', 'pretty', 'quiet', 'q', 'help', 'h', 'version', 'V', 'timeout',
]);
/** CLI 输出层后处理 flag(对结果数组裁剪):不透传 SDK,对所有命令统一生效。 */
const POSTPROCESS_FLAGS = new Set(['limit']);

function isPassthroughFlag(key: string): boolean {
  return GLOBAL_FLAGS.has(key) || POSTPROCESS_FLAGS.has(key);
}

/** 把原始 flags 按 OptionSpec 转换类型 + 归一，组成 options 对象；未声明的透传。 */
export function buildOptions(
  spec: CommandSpec,
  rawOptions: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const declared = new Map<string, OptionSpec>();
  for (const opt of spec.options ?? []) declared.set(opt.flag, opt);

  for (const [key, raw] of Object.entries(rawOptions)) {
    if (isPassthroughFlag(key)) continue; // 全局/输出层 flag 不进 SDK options
    const opt = declared.get(key);
    if (!opt) {
      if (raw === true) continue; // 未声明且无值的 flag：丢弃，避免脏 true 进 options
      out[FLAG_ALIAS[key] ?? key] = raw; // start/end 映射成 SDK 字段名
      continue;
    }
    out[opt.field ?? opt.flag] = convert(opt, raw);
  }

  for (const opt of spec.options ?? []) {
    const field = opt.field ?? opt.flag;
    if (out[field] === undefined && opt.default !== undefined) out[field] = opt.default;
  }
  return out;
}

function convert(opt: OptionSpec, raw: unknown): unknown {
  switch (opt.type) {
    case 'boolean':
      return raw === true || raw === 'true';
    case 'number':
      return Number(lastOf(raw));
    case 'number[]':
      return toNumberArray(raw);
    case 'enum':
    case 'string': {
      const s = lastOf(raw);
      let value: unknown = typeof s === 'boolean' ? s : String(s);
      if (opt.upper && typeof value === 'string') value = value.toUpperCase();
      if (opt.type === 'enum' && opt.enum && typeof value === 'string' && !opt.enum.includes(value)) {
        throw new CliUsageError(`--${opt.flag} 非法值「${value}」`, `可选: ${opt.enum.join(' / ')}`);
      }
      if (opt.map && typeof value === 'string' && value in opt.map) value = opt.map[value];
      return value;
    }
    default:
      return raw;
  }
}

function lastOf(raw: unknown): unknown {
  return Array.isArray(raw) ? raw[raw.length - 1] : raw;
}

function toNumberArray(raw: unknown): number[] {
  const text = Array.isArray(raw) ? raw.join(',') : String(raw);
  return text
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
}

function buildPositionalArgs(spec: CommandSpec, positional: string[]): unknown[] {
  const specs = spec.positional ?? [];
  const args: unknown[] = [];
  let i = 0;
  for (const p of specs) {
    if (p.variadic) {
      const rest = positional.slice(i);
      if (p.required && rest.length === 0) throw new CliUsageError(`缺少参数 <${p.name}>`);
      for (const v of rest) args.push(normalizePositional(p, v));
      return args;
    }
    const value = positional[i];
    if (value === undefined) {
      if (p.required) throw new CliUsageError(`缺少参数 <${p.name}>`);
      args.push(undefined);
    } else {
      args.push(normalizePositional(p, value));
    }
    i++;
  }
  return args;
}

function normalizePositional(p: PositionalSpec, value: string): string {
  let v = value;
  if (p.upper) v = v.toUpperCase();
  if (p.enum && !p.enum.includes(v)) {
    throw new CliUsageError(`<${p.name}> 非法值「${value}」`, `可选: ${p.enum.join(' / ')}`);
  }
  return v;
}

function invokeMethod(sdk: StockSDK, path: string[], args: unknown[]): Promise<unknown> {
  let parent: unknown = undefined;
  const target = path.reduce<unknown>((o, k) => {
    if (o == null || typeof o !== 'object') return undefined;
    parent = o;
    return (o as Record<string, unknown>)[k];
  }, sdk);
  if (typeof target !== 'function') {
    throw new CliUsageError(`未知命令: ${path.join(' ')}`);
  }
  // 用 apply 保留父级上下文，防止未来未 .bind 的命名空间方法丢失 this(当前命名空间方法均已 bind，此为防御)。
  return Promise.resolve(
    (target as (...a: unknown[]) => unknown).apply(parent, args)
  );
}

/**
 * 统一选项校验(别名 + 命名空间共用,在 dispatch 入口对所有命令执行):
 * - 声明了 options 的命令:未知 flag → 报错;enum/number 非法值 → 报错。
 * - 待值 flag(非 boolean/number[])在 argv 末尾无值被 parser 置成 `true` → 「缺少值」。
 * - 非 number[] 的 flag 被重复指定(parser 收集成数组)→ 「不能重复」。
 * - 标了 required 的 option 缺失 → 「缺少必填选项」。
 */
function validateOptions(spec: CommandSpec, rawOptions: Record<string, unknown>): void {
  const declared = new Map<string, OptionSpec>();
  for (const opt of spec.options ?? []) declared.set(opt.flag, opt);
  const strict = declared.size > 0; // 仅对声明了 opts 的命令拒绝未知 flag(无 opts 的命令保持透传)

  for (const [key, raw] of Object.entries(rawOptions)) {
    if (isPassthroughFlag(key)) continue;
    const opt = declared.get(key);
    if (!opt) {
      if (strict) {
        throw new CliUsageError(
          `未知选项 --${key}`,
          `运行 \`stock-sdk ${spec.path.join(' ')} --help\` 查看可用选项`
        );
      }
      continue;
    }
    if (raw === true && opt.type !== 'boolean' && opt.type !== 'number[]') {
      throw new CliUsageError(`--${key} 缺少值`);
    }
    // 归一化(取末值消除重复 flag 数组 + upper 大小写),写回 rawOptions 供别名 invoke 读到与
    // 命名空间一致的值。number[] 保留数组(由 convert/buildIndicatorOptions 内部转换)。
    if (opt.type !== 'number[]') {
      let value: unknown = lastOf(raw);
      if (opt.upper && typeof value === 'string') value = value.toUpperCase();
      if (value !== raw) rawOptions[key] = value;
      if (opt.type === 'enum' && opt.enum) {
        const v = typeof value === 'string' ? value : String(value);
        if (!opt.enum.includes(v)) {
          throw new CliUsageError(`--${key} 非法值「${v}」`, `可选: ${opt.enum.join(' / ')}`);
        }
      }
      if (opt.type === 'number' && value !== true && Number.isNaN(Number(value))) {
        throw new CliUsageError(`--${key} 需要数值，得到「${String(value)}」`);
      }
    }
  }

  for (const opt of spec.options ?? []) {
    if (opt.required && rawOptions[opt.flag] === undefined) {
      throw new CliUsageError(`缺少必填选项 --${opt.flag}`, opt.desc);
    }
  }
}

/** 别名命令走自定义 invoke 会绕过 normalizePositional 的 enum 校验，分发前统一校验位置参数 enum。 */
function validatePositionalEnum(spec: CommandSpec, positional: string[]): void {
  const specs = spec.positional ?? [];
  for (let i = 0; i < specs.length; i++) {
    const p = specs[i];
    const v = positional[i];
    if (v === undefined || !p.enum) continue;
    const val = p.upper ? v.toUpperCase() : v;
    if (!p.enum.includes(val)) {
      throw new CliUsageError(`<${p.name}> 非法值「${v}」`, `可选: ${p.enum.join(' / ')}`);
    }
  }
}

/** `--limit N` 输出层裁剪(对结果数组取前 N;无值/0/负数/非数视为不限制)。所有命令统一适用。 */
function applyLimit(result: unknown, rawOptions: Record<string, unknown>): unknown {
  const raw = rawOptions.limit;
  if (raw === undefined || raw === true || !Array.isArray(result)) return result;
  const n = Number(lastOf(raw));
  return !Number.isNaN(n) && n >= 1 ? result.slice(0, n) : result;
}

export function dispatch(
  sdk: StockSDK,
  spec: CommandSpec,
  ctx: InvokeContext
): Promise<unknown> {
  // 同步校验:缺值/enum/类型/未知/必填即时抛 CliUsageError(调用方与测试可同步捕获)。
  validateOptions(spec, ctx.options);
  validatePositionalEnum(spec, ctx.positional);
  const result = spec.invoke ? spec.invoke(sdk, ctx) : runDefault(sdk, spec, ctx);
  return Promise.resolve(result).then((r) => applyLimit(r, ctx.options));
}

function runDefault(
  sdk: StockSDK,
  spec: CommandSpec,
  ctx: InvokeContext
): Promise<unknown> {
  const options = buildOptions(spec, ctx.options);
  switch (spec.argShape) {
    case 'none':
      return invokeMethod(sdk, spec.path, []);
    case 'codes[]':
      requireNonEmpty(ctx.positional, spec);
      return invokeMethod(sdk, spec.path, [ctx.positional]);
    case 'codes+options':
      requireNonEmpty(ctx.positional, spec);
      return invokeMethod(sdk, spec.path, [ctx.positional, options]);
    case 'symbol+options': {
      const args = buildPositionalArgs(spec, ctx.positional);
      return invokeMethod(sdk, spec.path, [...args, options]);
    }
    case 'options':
      return invokeMethod(sdk, spec.path, [options]);
    case 'positional':
      return invokeMethod(sdk, spec.path, buildPositionalArgs(spec, ctx.positional));
    default:
      throw new CliUsageError(`不支持的命令形态: ${spec.argShape as string}`);
  }
}

function requireNonEmpty(positional: string[], spec: CommandSpec): void {
  if (positional.length === 0) {
    throw new CliUsageError(`命令 "${spec.path.join(' ')}" 需要至少一个代码参数`);
  }
}
