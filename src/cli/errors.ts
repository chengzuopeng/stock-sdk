/**
 * CLI 错误处理与退出码映射（cli.md §7）。
 *
 * 对外只抛 `SdkError`（v2 错误体系），CLI 自身的用法错误用 `CliUsageError`。
 * 退出码：0 成功 / 1 通用 / 2 用法·参数 / 3 网络·超时 / 4 上游·解析 / 5 限流·熔断。
 */
import { getSdkErrorCode } from '../core';
import type { SdkErrorCode } from '../core/errors';
import type { OutputFormat } from './types';

/** CLI 层用法错误（未知命令、缺位置参数、非法 enum 等）。 */
export class CliUsageError extends Error {
  /** 可选的用法提示（如「运行 stock-sdk <cmd> --help」）。 */
  readonly hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.name = 'CliUsageError';
    this.hint = hint;
  }
}

const CODE_EXIT: Record<SdkErrorCode, number> = {
  INVALID_ARGUMENT: 2,
  INVALID_SYMBOL: 2,
  NOT_FOUND: 2,
  NETWORK_ERROR: 3,
  TIMEOUT: 3,
  ABORTED: 3,
  UPSTREAM_ERROR: 4,
  UPSTREAM_EMPTY: 4,
  PARSE_ERROR: 4,
  HTTP_ERROR: 4,
  RATE_LIMITED: 5,
  CIRCUIT_OPEN: 5,
};

/** 把错误映射成进程退出码。 */
export function errorToExitCode(error: unknown): number {
  if (error instanceof CliUsageError) return 2;
  const code = getSdkErrorCode(error) as SdkErrorCode;
  return CODE_EXIT[code] ?? 1;
}

interface RenderedError {
  /** 写入 stderr 的文本（不含末尾换行）。 */
  text: string;
}

/** 渲染错误到 stderr 文本。`json` 格式下输出结构化 `{ error: { code, message } }`。 */
export function renderError(error: unknown, format: OutputFormat): RenderedError {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof CliUsageError) {
    if (format === 'json') {
      return { text: JSON.stringify({ error: { code: 'USAGE', message } }) };
    }
    const hint = error.hint ? `\n${error.hint}` : '';
    return { text: `stock-sdk: ${message}${hint}` };
  }

  const code = getSdkErrorCode(error);
  if (format === 'json') {
    return { text: JSON.stringify({ error: { code, message } }) };
  }
  return { text: `stock-sdk: ${code}: ${message}` };
}
