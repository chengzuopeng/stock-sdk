/**
 * spec → PlaygroundMethod 派生器（Playground 是 spec 的第三个派生端，前两个是 CLI / MCP）。
 *
 * spec 引用方式：同仓直接 import 源码（构建期静态 bundle 纯数据，~10KB gzip），
 * 不需要给 npm 包加 spec 子路径导出。运行时 SDK 仍是 dev=本地 src / prod=CDN 锁版。
 *
 * 参数取「MCP 可见集」（p.mcp !== false）：它代表 SDK options 真正消费的字段 ——
 * CLI-only 参数里有透传兼容层（如 futures 的 --adjust SDK 并不消费）和与位置参数
 * 重复的 flag（northbound 的 --direction），都不该进表单。
 */
import {
  METHOD_SPECS,
  type MethodSpec,
  type ParamSpec,
  type SpecPositional,
} from '../../../../../src/spec/methods';
import type { FormField, FieldOption, MarketKey, PlaygroundMethod } from './types';
import {
  EXCLUDED_IDS,
  MARKET_OVERRIDES,
  PLACEHOLDER_OVERRIDES,
  WITH_INDICATORS_METHOD,
} from './overrides';

/** enum select 的选项列表：非必填带「默认」空选项；必填直接列枚举 */
function enumOptions(values: string[], required: boolean | undefined, defaultHint?: string): FieldOption[] {
  const opts = values.map((v) => ({ value: v, label: v }));
  if (!required) {
    return [{ value: '', label: defaultHint ? `默认（${defaultHint}）` : '默认' }, ...opts];
  }
  return opts;
}

function positionalToField(pos: SpecPositional, placeholderOv?: string): FormField {
  const base: FormField = {
    key: pos.name,
    kind: 'positional',
    label: pos.name,
    type: pos.enum ? 'select' : 'text',
    required: pos.required,
    desc: pos.desc,
    upper: pos.upper,
  };
  if (pos.enum) {
    base.options = enumOptions(pos.enum, pos.required, pos.default);
  } else {
    base.placeholder = placeholderOv ?? pos.desc;
  }
  return base;
}

function paramToField(p: ParamSpec, placeholderOv?: string): FormField {
  const key = p.field ?? p.flag;
  const base: FormField = {
    key,
    kind: 'param',
    label: p.flag,
    type: p.type === 'enum' ? 'select' : p.type === 'number' ? 'number' : p.type === 'boolean' ? 'checkbox' : 'text',
    required: p.required,
    desc: p.desc,
    map: p.map,
    upper: p.upper,
  };
  if (p.enum) {
    base.options = enumOptions(p.enum, p.required, p.default !== undefined ? String(p.default) : undefined);
  } else {
    base.placeholder = placeholderOv ?? (p.default !== undefined ? `默认 ${p.default}` : undefined);
  }
  return base;
}

/** 市场标签推断（覆盖不到的在 MARKET_OVERRIDES 修正） */
function inferMarkets(path: string[]): MarketKey[] {
  const ns = path[0];
  const tail = path[path.length - 1];
  switch (ns) {
    case 'board':
      return ['board'];
    case 'fund':
      return ['fund'];
    case 'futures':
      return ['futures'];
    case 'options':
      return ['options'];
    case 'calendar':
    case 'reference':
    case 'search':
      return ['all'];
    case 'fundFlow':
    case 'northbound':
    case 'marketEvent':
    case 'dragonTiger':
    case 'blockTrade':
    case 'margin':
      return ['a'];
  }
  // quotes / codes / batch / kline：按方法名尾部判断
  if (/^hk/i.test(tail)) return ['hk'];
  if (/^us/i.test(tail)) return ['us'];
  if (tail === 'fund') return ['fund'];
  return ['a']; // cn / cnSimple / cnMinute / timeline / byCodes / fundFlow / largeOrder ...
}

function deriveOne(spec: MethodSpec): PlaygroundMethod {
  const id = spec.path.join('.');
  const placeholderOv = PLACEHOLDER_OVERRIDES[id] ?? {};
  const fields: FormField[] = [];

  if (spec.argShape === 'codes[]' || spec.argShape === 'codes+options') {
    fields.push({
      key: 'codes',
      kind: 'codes',
      label: 'codes',
      type: 'text',
      required: true,
      placeholder: 'sh600519,000001（逗号分隔）',
      desc: '代码数组，带不带交易所前缀均可',
    });
  }
  for (const pos of spec.positional ?? []) {
    fields.push(positionalToField(pos, placeholderOv[pos.name]));
  }
  for (const p of spec.params ?? []) {
    if (p.mcp === false) continue; // MCP 可见集 = SDK 真正消费的 options 字段
    fields.push(paramToField(p, placeholderOv[p.field ?? p.flag]));
  }

  return {
    id,
    path: spec.path,
    label: id,
    desc: spec.summary,
    category: spec.path[0],
    market: MARKET_OVERRIDES[id] ?? inferMarkets(spec.path),
    argShape: spec.argShape,
    fields,
  };
}

/** 全部 playground 方法（排除 batch.raw；withIndicators 用手写特例替换派生产物） */
export const playgroundMethods: PlaygroundMethod[] = METHOD_SPECS.filter(
  (s) => !EXCLUDED_IDS.has(s.path.join('.'))
).map((s) => (s.path.join('.') === WITH_INDICATORS_METHOD.id ? WITH_INDICATORS_METHOD : deriveOne(s)));

export const methodsById: Record<string, PlaygroundMethod> = Object.fromEntries(
  playgroundMethods.map((m) => [m.id, m])
);
