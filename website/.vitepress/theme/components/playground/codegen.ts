/**
 * 代码示例生成器：由 path + argShape + 当前表单值实时生成可复制运行的调用代码。
 * 组装规则与 runner.buildArgs 严格一致（同一份空值约定），示例即真实调用。
 */
import type { PlaygroundMethod } from './types';
import { buildArgs } from './runner';

/** JS 字面量序列化（字符串单引号、对象多行缩进，贴近手写风格） */
function lit(v: unknown, indent: number): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    return `[${v.map((x) => lit(x, indent)).join(', ')}]`;
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => typeof x !== 'function');
    if (entries.length === 0) return '{}';
    const pad = '  '.repeat(indent + 1);
    const body = entries.map(([k, x]) => `${pad}${k}: ${lit(x, indent + 1)}`).join(',\n');
    return `{\n${body}\n${'  '.repeat(indent)}}`;
  }
  return String(v);
}

/** 生成完整示例（import + 实例化 + 调用） */
export function buildCode(method: PlaygroundMethod, values: Record<string, string>): string {
  const header = `import { StockSDK } from 'stock-sdk'\n\nconst sdk = new StockSDK()\n`;

  // 手写特例提供自己的调用行
  if (method.code) {
    return `${header}${method.code(values)}`;
  }

  const args = buildArgs(method, values).filter((a) => typeof a !== 'function');
  const argText = args.map((a) => lit(a, 0)).join(', ');
  return `${header}const data = await sdk.${method.path.join('.')}(${argText})`;
}
