/**
 * stock-sdk CLI 核心运行器 —— cli.md §9。
 * argv → 解析 → 路由 → 执行 → 输出 → 退出码。
 *
 * - 查询命令（quote / kline / search / 命名空间直达 …）：见本目录 manifest + dispatch。
 * - `mcp` 子命令：委托给现有 MCP server（src/mcp/server.ts，零依赖手写实现）。
 *
 * 入口隔离铁律：`src/index.ts` 绝不 import 本文件。
 */
import { StockSDK } from '../sdk';
import { MAX_TIMEOUT_MS } from '../core/constants';
import {
  dispatch,
  isGlobalFlag,
  lastOf,
  parseBooleanOption,
  parseIntegerOption,
  parseOutputLimit,
} from './dispatch';
import { CliUsageError, errorToExitCode, renderError } from './errors';
import { formatOutput, isEmptyResult } from './format';
import { renderCommandHelp, renderHelp, renderMcpHelp } from './help';
import { collectBooleanFlags, findCommand, MCP_COMMAND_NAME } from './manifest';
import { parseArgv } from './parser';
import type { CommandSpec, GlobalOptions, InvokeContext, OutputFormat } from './types';

/**
 * 传入自定义 SDK / MCP 工厂函数的上下文。
 */
export interface CliSdkFactoryContext {
  timeout?: number;
  rawOptions: Record<string, unknown>;
}

/**
 * CLI 运行时自定义配置（允许 `stock-node-sdk` 复用同一套 CLI 解析/调度框架并扩展命令与 SDK）。
 */
export interface CliRuntimeConfig {
  binName?: string;
  extraCommands?: readonly CommandSpec[];
  /** 允许的额外全局参数名（不会放松默认 `stock-sdk` 的未知参数严格校验） */
  extraGlobalFlags?: readonly string[];
  /** 额外的全局布尔开关名（供 parseArgv 避免把下一个位置参数误吞为该 flag 的值） */
  extraBooleanFlags?: readonly string[];
  /** 追加在 `--help` 全局选项列表中的说明行 */
  extraGlobalHelpLines?: readonly string[];
  /** 追加在 `mcp --help` 用法行中的参数提示 */
  extraMcpFlagsHint?: string;
  createSdk?: (options: CliSdkFactoryContext) => StockSDK;
  closeSdk?: (sdk: StockSDK) => Promise<void> | void;
  startMcp?: (options: CliSdkFactoryContext) => Promise<number>;
}

export { CliUsageError } from './errors';

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
  if (timeout !== undefined && (timeout <= 0 || timeout > MAX_TIMEOUT_MS)) {
    throw new CliUsageError(`--timeout 需要 1 至 ${MAX_TIMEOUT_MS} 的整数毫秒数`);
  }
  return {
    pretty: readSwitch('pretty', options.pretty),
    quiet: readSwitch('quiet', options.quiet ?? options.q),
    help: readSwitch('help', options.help ?? options.h),
    version: readSwitch('version', options.version ?? options.V),
    timeout,
  };
}

function validateGlobalOnly(
  options: Record<string, unknown>,
  extraGlobalFlags?: ReadonlySet<string>
): void {
  const unknownFlag = Object.keys(options).find((flag) => !isGlobalFlag(flag, extraGlobalFlags));
  if (unknownFlag !== undefined) throw new CliUsageError(`未知选项 --${unknownFlag}`);
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

function matchExtraCommand(
  extraCommands: readonly CommandSpec[] | undefined,
  positional: string[]
): { spec: CommandSpec; rest: string[] } | undefined {
  if (!extraCommands || extraCommands.length === 0) return undefined;
  let best: { spec: CommandSpec; rest: string[] } | undefined;
  for (const spec of extraCommands) {
    if (positional.length < spec.path.length) continue;
    const matched = spec.path.every((seg, i) => positional[i] === seg);
    if (!matched) continue;
    if (!best || spec.path.length > best.spec.path.length) {
      best = { spec, rest: positional.slice(spec.path.length) };
    }
  }
  return best;
}

/**
 * 以命令行参数数组执行 CLI，返回进程退出码。
 */
export async function runCli(
  argv: string[],
  runtime: CliRuntimeConfig = {}
): Promise<number> {
  const binName = runtime.binName ?? 'stock-sdk';
  const extraGlobalFlagSet = runtime.extraGlobalFlags?.length
    ? new Set(runtime.extraGlobalFlags)
    : undefined;
  const boolFlags = new Set(BOOLEAN_FLAGS);
  for (const flag of runtime.extraBooleanFlags ?? []) {
    boolFlags.add(flag);
  }
  for (const cmd of runtime.extraCommands ?? []) {
    for (const opt of cmd.options ?? []) {
      if (opt.type === 'boolean') boolFlags.add(opt.flag);
    }
  }

  let format: OutputFormat = 'json';
  try {
    const parsed = parseArgv(argv, boolFlags);
    format = resolveFormat(parsed.options.format ?? parsed.options.f);
    const global = resolveGlobal(parsed.options);
    const limit = parseOutputLimit(parsed.options.limit);

    if (global.version) {
      if (parsed.positional.length === 0) validateGlobalOnly(parsed.options, extraGlobalFlagSet);
      process.stdout.write(getVersion() + '\n');
      return 0;
    }

    if (parsed.positional.length === 0) {
      validateGlobalOnly(parsed.options, extraGlobalFlagSet);
      process.stdout.write(
        renderHelp({
          binName,
          extraCommands: runtime.extraCommands,
          extraGlobalHelpLines: runtime.extraGlobalHelpLines,
        }) + '\n'
      );
      return 0;
    }

    if (parsed.positional[0] === MCP_COMMAND_NAME) {
      validateGlobalOnly(parsed.options, extraGlobalFlagSet);
      if (global.help) {
        process.stdout.write(renderMcpHelp(binName, runtime.extraMcpFlagsHint) + '\n');
        return 0;
      }
      if (parsed.positional.length > 1) throw new CliUsageError(`${binName} mcp 无需位置参数`);
      return runtime.startMcp
        ? await runtime.startMcp({ timeout: global.timeout, rawOptions: parsed.options })
        : await runMcp(global.timeout);
    }

    const match =
      matchExtraCommand(runtime.extraCommands, parsed.positional) ??
      findCommand(parsed.positional);
    if (!match) {
      throw new CliUsageError(
        `未知命令 "${parsed.positional.join(' ')}"`,
        `运行 \`${binName} --help\` 查看可用命令`
      );
    }

    if (global.help) {
      process.stdout.write(renderCommandHelp(match.spec, binName) + '\n');
      return 0;
    }

    const sdkOpts = global.timeout !== undefined ? { timeout: global.timeout } : {};
    const sdk = runtime.createSdk
      ? runtime.createSdk({ timeout: global.timeout, rawOptions: parsed.options })
      : new StockSDK(sdkOpts);
    let result: unknown;
    try {
      const ctx: InvokeContext = { positional: match.rest, options: parsed.options };
      result = await dispatch(sdk, match.spec, ctx, limit, extraGlobalFlagSet, binName);
    } finally {
      if (runtime.closeSdk) {
        await runtime.closeSdk(sdk);
      }
    }

    if (isEmptyResult(result) && !global.quiet) {
      process.stderr.write(`${binName}: 无数据\n`);
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

/**
 * 绑定当前 Node 进程 argv 与退出码并执行 CLI。
 */
export function executeCliProcess(
  argv: string[] = process.argv.slice(2),
  runtime: CliRuntimeConfig = {}
): void {
  const binName = runtime.binName ?? 'stock-sdk';
  void runCli(argv, runtime).then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${binName}: ${message}\n`);
      process.exitCode = 1;
    }
  );
}
