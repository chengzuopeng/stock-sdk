#!/usr/bin/env node
/**
 * stock-sdk CLI 入口（bin）—— cli.md §9。
 * argv → 解析 → 路由 → 执行 → 输出 → 退出码。
 *
 * - 查询命令（quote / kline / search / 命名空间直达 …）：见本目录 manifest + dispatch。
 * - `mcp` 子命令：委托给现有 MCP server（src/mcp/server.ts，零依赖手写实现）。
 *
 * 入口隔离铁律：`src/index.ts` 绝不 import 本文件。
 */
import { StockSDK } from '../sdk';
import { dispatch, lastOf, parseBooleanOption, parseIntegerOption } from './dispatch';
import { CliUsageError, errorToExitCode, renderError } from './errors';
import { formatOutput, isEmptyResult } from './format';
import { renderCommandHelp, renderHelp, renderMcpHelp } from './help';
import { collectBooleanFlags, findCommand, MCP_COMMAND_NAME } from './manifest';
import { parseArgv } from './parser';
import type { GlobalOptions, InvokeContext, OutputFormat } from './types';

const BOOLEAN_FLAGS = collectBooleanFlags();

// 管道下游提前关闭（如 `stock-sdk codes cn | head -5`）会让待 flush 的 stdout
// 写入触发 EPIPE 'error' 事件，无监听则以裸 Node 堆栈崩溃（exit 1）。
// mcp/transport.ts 已对 MCP 路径做了同样处理，查询命令路径此前缺失。
process.stdout.on('error', (e: NodeJS.ErrnoException) => {
  if (e.code === 'EPIPE') process.exit(0);
  process.stderr.write(`stock-sdk: stdout error: ${e.message}\n`);
});

/**
 * 版本号在构建期由 tsup `define` 注入（`__STOCK_SDK_VERSION__`）。
 * 这样产物里不出现 `import.meta.url` —— 否则 cjs 产物会因解析期 `import.meta` 报错。
 * 测试环境（无 define）回退到 'unknown'。
 */
declare const __STOCK_SDK_VERSION__: string | undefined;
function getVersion(): string {
  return typeof __STOCK_SDK_VERSION__ !== 'undefined' ? __STOCK_SDK_VERSION__ : 'unknown';
}

function resolveFormat(raw: unknown): OutputFormat {
  const value = lastOf(raw);
  if (value === undefined) return 'json';
  if (value === 'json' || value === 'table' || value === 'csv') return value;
  throw new CliUsageError('--format 可选 json / table / csv');
}

function resolveGlobal(options: Record<string, unknown>): GlobalOptions {
  const readSwitch = (flag: string, raw: unknown) =>
    raw === undefined ? false : parseBooleanOption(flag, lastOf(raw));
  const timeout = options.timeout === undefined ? undefined : parseIntegerOption('timeout', options.timeout);
  if (timeout !== undefined && (timeout <= 0 || timeout > 2_147_483_647)) {
    throw new CliUsageError('--timeout 需要 1 至 2147483647 的整数毫秒数');
  }
  return {
    pretty: readSwitch('pretty', options.pretty),
    quiet: readSwitch('quiet', options.quiet ?? options.q),
    help: readSwitch('help', options.help ?? options.h),
    version: readSwitch('version', options.version ?? options.V),
    timeout,
  };
}

/** mcp 子命令：委托现有 MCP server（动态 import，避免进入 CLI 常驻内存）。 */
async function runMcp(timeout?: number): Promise<number> {
  try {
    const mod = await import('../mcp/server');
    mod.startMcpServer(timeout === undefined ? undefined : { sdk: { timeout } });
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`stock-sdk: 无法启动 MCP server: ${message}\n`);
    return 1;
  }
}

async function main(argv: string[]): Promise<number> {
  let format: OutputFormat = 'json';
  try {
    const parsed = parseArgv(argv, BOOLEAN_FLAGS);
    format = resolveFormat(parsed.options.format ?? parsed.options.f);
    const global = resolveGlobal(parsed.options);

    if (global.version) {
      process.stdout.write(getVersion() + '\n');
      return 0;
    }

    if (parsed.positional.length === 0) {
      process.stdout.write(renderHelp() + '\n');
      return 0;
    }

    if (parsed.positional[0] === MCP_COMMAND_NAME) {
      if (global.help) {
        process.stdout.write(renderMcpHelp() + '\n');
        return 0;
      }
      if (parsed.positional.length > 1) throw new CliUsageError('stock-sdk mcp 无需位置参数');
      return await runMcp(global.timeout);
    }

    const match = findCommand(parsed.positional);
    if (!match) {
      throw new CliUsageError(
        `未知命令 "${parsed.positional.join(' ')}"`,
        '运行 `stock-sdk --help` 查看可用命令'
      );
    }

    if (global.help) {
      process.stdout.write(renderCommandHelp(match.spec) + '\n');
      return 0;
    }

    const sdk = new StockSDK(
      global.timeout !== undefined ? { timeout: global.timeout } : {}
    );
    const ctx: InvokeContext = { positional: match.rest, options: parsed.options };
    const result = await dispatch(sdk, match.spec, ctx);

    if (isEmptyResult(result) && !global.quiet) {
      process.stderr.write('stock-sdk: 无数据\n');
    }
    const text = formatOutput(result, format, global.pretty);
    if (text.length > 0) process.stdout.write(text + '\n');
    return 0;
  } catch (error) {
    const rendered = renderError(error, format);
    process.stderr.write(rendered.text + '\n');
    return errorToExitCode(error);
  }
}

void main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`stock-sdk: ${message}\n`);
    process.exitCode = 1;
  }
);
