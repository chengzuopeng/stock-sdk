/**
 * 通用执行器：表单值 → SDK 实参 → 调用。
 *
 * 方法解析复用 src/spec/resolve.ts 的 resolveSdkMethod（全库唯一 walker，
 * this 绑定 bug 在那里修过，绝不另写一份）；argShape 组装与 derive-mcp 的
 * buildInvoke 同构。
 *
 * 空值约定：留空的字段不进 options / 实参，让 SDK 自身默认值落地
 * （与 MCP「default 仅展示、不注入实参」同一原则）。
 */
import { resolveSdkMethod } from '../../../../../src/spec/resolve';
import type { FormField, PlaygroundMethod, RunContext } from './types';

/** codes 文本框 → 代码数组（逗号 / 空白分隔） */
function splitCodes(raw: string): string[] {
  return raw
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 单字段表单值 → SDK 值（应用 enum map / upper / number 转换；空值返回 undefined） */
function fieldValue(field: FormField, raw: string | undefined): unknown {
  let v = (raw ?? '').trim();
  if (v === '') return undefined;
  if (field.map && field.map[v] !== undefined) v = field.map[v];
  if (field.upper) v = v.toUpperCase();
  if (field.type === 'number') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  if (field.type === 'checkbox') return v === 'true' ? true : undefined;
  return v;
}

/** 组装实参数组（与 derive-mcp.buildInvoke 的 argShape 分支一一对应） */
export function buildArgs(method: PlaygroundMethod, values: Record<string, string>): unknown[] {
  const positionals = method.fields.filter((f) => f.kind === 'positional');
  const params = method.fields.filter((f) => f.kind === 'param');

  const posArgs = positionals.map((f) => fieldValue(f, values[f.key]));
  // 尾部连续空 positional 裁掉（可选位置参数留空时不传）
  while (posArgs.length > 0 && posArgs[posArgs.length - 1] === undefined) posArgs.pop();

  const options: Record<string, unknown> = {};
  for (const f of params) {
    const v = fieldValue(f, values[f.key]);
    if (v !== undefined) options[f.key] = v;
  }
  const hasOptions = Object.keys(options).length > 0;

  const codes = splitCodes(values.codes ?? '');

  switch (method.argShape) {
    case 'none':
      return [];
    case 'codes[]':
      return [codes];
    case 'codes+options':
      return hasOptions ? [codes, options] : [codes];
    case 'symbol+options':
      return hasOptions ? [...posArgs, options] : [...posArgs];
    case 'options':
      return hasOptions ? [options] : [];
    case 'positional':
      return posArgs;
    default:
      throw new Error(`不支持的 argShape: ${method.argShape}`);
  }
}

/** 必填校验：返回第一个缺失字段的 label，全齐返回 null */
export function findMissingRequired(method: PlaygroundMethod, values: Record<string, string>): string | null {
  for (const f of method.fields) {
    if (!f.required) continue;
    const v = (values[f.key] ?? '').trim();
    if (v === '') return f.label;
  }
  return null;
}

/** 执行方法。批量接口自动注入 onProgress 进度上报。 */
export async function runMethod(
  sdk: unknown,
  method: PlaygroundMethod,
  values: Record<string, string>,
  ctx: RunContext
): Promise<unknown> {
  // 手写特例（kline.withIndicators）
  if (method.run) return method.run(sdk, values, ctx);

  const resolved = resolveSdkMethod(sdk, method.path);
  if (!resolved) {
    throw new Error(
      `当前 SDK 版本上不存在 ${method.id}（线上 SDK 可能尚未发布此方法，请等待新版本或在本地 dev 模式体验）`
    );
  }

  const args = buildArgs(method, values);

  // 全市场批量接口：把 onProgress 注入 options，结果区实时显示分片进度
  if (method.category === 'batch' && ctx.onProgress) {
    const shaped = method.argShape === 'codes+options' ? 1 : 0;
    const options = (args[shaped] ?? {}) as Record<string, unknown>;
    options.onProgress = (p: { loaded?: number; total?: number }) => {
      if (p && typeof p.loaded === 'number' && typeof p.total === 'number') {
        ctx.onProgress!(`加载中... ${p.loaded}/${p.total}`);
      }
    };
    args[shaped] = options;
  }

  return resolved.fn.apply(resolved.parent, args);
}
