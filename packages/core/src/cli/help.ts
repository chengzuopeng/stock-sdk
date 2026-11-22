/**
 * 帮助文本（cli.md §9：从 manifest 派生）。
 */
import { ALIAS_COMMANDS, NAMESPACE_COMMANDS } from './manifest';
import type { CommandSpec } from './types';

/**
 * `renderHelp` 的可选扩展参数（供 `stock-node-sdk` 展示自有命令与全局选项）。
 */
export interface RenderHelpOptions {
  binName?: string;
  extraCommands?: readonly CommandSpec[];
  extraGlobalHelpLines?: readonly string[];
}

export function renderHelp(options: RenderHelpOptions = {}): string {
  const binName = options.binName ?? 'stock-sdk';
  const lines: string[] = [
    `${binName} —— 股票行情命令行（基于 stock-sdk v2 命名空间 API）`,
    '',
    '用法:',
    `  ${binName} <command> [args] [--flags]`,
    `  ${binName} <namespace> <method> [args] [--flags]   # 直达任意命名空间方法`,
    '',
    '常用命令:',
  ];
  for (const cmd of ALIAS_COMMANDS) {
    const name = cmd.alias?.[0] ?? cmd.path.join(' ');
    lines.push(`  ${name.padEnd(12)} ${cmd.summary}`);
  }
  lines.push('  mcp          启动 MCP server (stdio)');
  lines.push('');
  lines.push(`命名空间（${binName} <ns> <method> ...）:`);
  const allNamespaceCommands = [
    ...NAMESPACE_COMMANDS,
    ...(options.extraCommands ?? []),
  ];
  const groups = [...new Set(allNamespaceCommands.map((c) => c.path[0]))];
  lines.push('  ' + groups.join(' / '));
  lines.push('');
  lines.push('全局选项:');
  lines.push('  -f, --format json|table|csv   输出格式 (默认 json)');
  lines.push('      --pretty                  JSON 缩进美化');
  lines.push('      --timeout <ms>            请求超时');
  lines.push('      --limit <N>               数组只输出前 N 条，0 表示全量');
  for (const extraLine of options.extraGlobalHelpLines ?? []) {
    lines.push(extraLine);
  }
  lines.push('  -q, --quiet                   静默(只输出数据)');
  lines.push('  -h, --help                    显示帮助');
  lines.push('  -V, --version                 显示版本');
  lines.push('');
  lines.push('示例:');
  lines.push(`  ${binName} quote 600519 000858 00700`);
  lines.push(`  ${binName} kline 600519 --period weekly --adjust hfq --limit 30`);
  lines.push(`  ${binName} indicators 600519 --ma 5,10,20 --macd`);
  lines.push(`  ${binName} board industry list --format table`);
  lines.push(`  ${binName} options etf dailyKline 10004336`);
  lines.push('');
  lines.push(`运行 \`${binName} <command> --help\` 查看单条命令用法。`);
  return lines.join('\n');
}

/** 展示 stdio 服务的启动参数和环境变量。 */
export function renderMcpHelp(binName = 'stock-sdk', extraFlagsHint?: string): string {
  const usageFlags = extraFlagsHint
    ? `[--timeout <ms>] ${extraFlagsHint}`
    : '[--timeout <ms>]';
  return [
    `${binName} mcp —— 启动 MCP server (stdio)`,
    '',
    `用法  ${binName} mcp ${usageFlags}`,
    '',
    '环境变量',
    '  STOCK_SDK_MCP_TOOLS     core (默认) / full / 逗号分隔的工具名',
    '  STOCK_SDK_MCP_PROMPTS   core (默认) / full / 逗号分隔的技能名',
    '  STOCK_SDK_MCP_TIMEOUT   请求超时毫秒数，--timeout 优先',
    '',
    '技能需要当前工具集提供依赖工具。',
  ].join('\n');
}

export function renderCommandHelp(spec: CommandSpec, binName = 'stock-sdk'): string {
  const name = spec.alias?.[0] ?? spec.path.join(' ');
  const lines: string[] = [`${name} —— ${spec.summary}`, ''];
  const pos = (spec.positional ?? [])
    .map((p) => {
      const inner = p.required ? `<${p.name}>` : `[${p.name}]`;
      return p.variadic ? `${inner}...` : inner;
    })
    .join(' ');
  lines.push(`用法: ${binName} ${name}${pos ? ' ' + pos : ''} [--flags]`);
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
