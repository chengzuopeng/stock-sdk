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
import { dispatch } from './dispatch';
import { CliUsageError, errorToExitCode, renderError } from './errors';
import { formatOutput, isEmptyResult } from './format';
import { renderCommandHelp, renderHelp } from './help';
import { collectBooleanFlags, findCommand, MCP_COMMAND_NAME } from './manifest';
import { parseArgv } from './parser';
import type { GlobalOptions, InvokeContext, OutputFormat } from './types';

const BOOLEAN_FLAGS = collectBooleanFlags();

/**
 * 版本号在构建期由 tsup `define` 注入（`__STOCK_SDK_VERSION__`）。
 * 这样产物里不出现 `import.meta.url` —— 否则 cjs 产物会因解析期 `import.meta` 报错。
 * 测试环境（无 define）回退到 'unknown'。
 */
declare const __STOCK_SDK_VERSION__: string | undefined;
function getVersion(): string {
  return typeof __STOCK_SDK_VERSION__ !== 'undefined' ? __STOCK_SDK_VERSION__ : 'unknown';
}

function resolveGlobal(options: Record<string, unknown>): GlobalOptions {
  const fmt = options.format ?? options.f;
  const format: OutputFormat = fmt === 'table' || fmt === 'csv' ? fmt : 'json';
  // --timeout 须带正整数值；无值（parser 置 true）/ 非数 / <=0 一律回退默认（undefined）
  let timeout: number | undefined;
  if (typeof options.timeout === 'string' || typeof options.timeout === 'number') {
    const n = Number(options.timeout);
    if (!Number.isNaN(n) && n > 0) timeout = n;
  }
  return {
    format,
    pretty: options.pretty === true,
    quiet: options.quiet === true || options.q === true,
    help: options.help === true || options.h === true,
    version: options.version === true || options.V === true,
    timeout,
  };
}

/** mcp 子命令：委托现有 MCP server（动态 import，避免进入 CLI 常驻内存）。 */
async function runMcp(): Promise<number> {
  try {
    const mod = await import('../mcp/server');
    mod.startMcpServer(); // 监听 stdin 持续运行，随 stdin 关闭退出
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
    const global = resolveGlobal(parsed.options);
    format = global.format;

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
        process.stdout.write(
          'stock-sdk mcp —— 启动 MCP server (stdio transport)\n\n' +
            '用法: stock-sdk mcp\n' +
            '环境变量: STOCK_SDK_MCP_TOOLS=core|full|<逗号分隔工具名>（默认 core）\n'
        );
        return 0;
      }
      return await runMcp();
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
    const text = formatOutput(result, global.format, global.pretty);
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
