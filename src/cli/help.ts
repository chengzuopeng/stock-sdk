/**
 * 帮助文本（cli.md §9：从 manifest 派生）。
 */
import { ALIAS_COMMANDS, NAMESPACE_COMMANDS } from './manifest';
import type { CommandSpec } from './types';

export function renderHelp(): string {
  const lines: string[] = [
    'stock-sdk —— 股票行情命令行（基于 stock-sdk v2 命名空间 API）',
    '',
    '用法:',
    '  stock-sdk <command> [args] [--flags]',
    '  stock-sdk <namespace> <method> [args] [--flags]   # 直达任意命名空间方法',
    '',
    '常用命令:',
  ];
  for (const cmd of ALIAS_COMMANDS) {
    const name = cmd.alias?.[0] ?? cmd.path.join(' ');
    lines.push(`  ${name.padEnd(12)} ${cmd.summary}`);
  }
  lines.push('  mcp          启动 MCP server (stdio)');
  lines.push('');
  lines.push('命名空间（stock-sdk <ns> <method> ...）:');
  const groups = [...new Set(NAMESPACE_COMMANDS.map((c) => c.path[0]))];
  lines.push('  ' + groups.join(' / '));
  lines.push('');
  lines.push('全局选项:');
  lines.push('  -f, --format json|table|csv   输出格式 (默认 json)');
  lines.push('      --pretty                  JSON 缩进美化');
  lines.push('      --timeout <ms>            请求超时');
  lines.push('  -q, --quiet                   静默(只输出数据)');
  lines.push('  -h, --help                    显示帮助');
  lines.push('  -V, --version                 显示版本');
  lines.push('');
  lines.push('示例:');
  lines.push('  stock-sdk quote 600519 000858 00700');
  lines.push('  stock-sdk kline 600519 --period weekly --adjust hfq --limit 30');
  lines.push('  stock-sdk indicators 600519 --ma 5,10,20 --macd');
  lines.push('  stock-sdk board industry list --format table');
  lines.push('  stock-sdk options etf dailyKline 10004336');
  lines.push('');
  lines.push('运行 `stock-sdk <command> --help` 查看单条命令用法。');
  return lines.join('\n');
}

export function renderCommandHelp(spec: CommandSpec): string {
  const name = spec.alias?.[0] ?? spec.path.join(' ');
  const lines: string[] = [`${name} —— ${spec.summary}`, ''];
  const pos = (spec.positional ?? [])
    .map((p) => {
      const inner = p.required ? `<${p.name}>` : `[${p.name}]`;
      return p.variadic ? `${inner}...` : inner;
    })
    .join(' ');
  lines.push(`用法: stock-sdk ${name}${pos ? ' ' + pos : ''} [--flags]`);
  if (spec.options?.length) {
    lines.push('');
    lines.push('选项:');
    for (const o of spec.options) {
      const enumHint = o.enum ? ` (${o.enum.join('/')})` : '';
      lines.push(`  --${o.flag.padEnd(12)} ${o.desc}${enumHint}`);
    }
  }
  return lines.join('\n');
}
