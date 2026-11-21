/**
 * tools/call 结果包装：正常结果 / 工具执行错误 / 大结果裁剪。
 * 见 mcp.md §8 / §9。
 */
import { InvalidArgumentError, isSdkError } from '../core/errors';
import type { McpOutput } from '../spec/methods';

/** 超过该条数的数组结果会被裁剪，避免撑爆 LLM 上下文 */
export const MAX_ARRAY_ITEMS = 200;

/** 序列化后的文本上限，用于缩减时间序列及省略无法缩减的结果。 */
export const MAX_TEXT_CHARS = 80_000;

export interface ToolResultContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: ToolResultContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

interface HistoryWindow {
  startDate?: string;
  endDate?: string;
}

function normalizeWindowDate(value: unknown, key: keyof HistoryWindow): string | undefined {
  if (value === undefined) return undefined;
  const input = typeof value === 'string' ? value.trim() : '';
  const date = input.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const epoch = Date.parse(`${date}T00:00:00Z`);
    if (Number.isFinite(epoch) && new Date(epoch).toISOString().slice(0, 10) === date) {
      return date;
    }
  }
  throw new InvalidArgumentError(`${key} 必须是有效日期（YYYY-MM-DD 或 YYYYMMDD）`);
}

/** 在请求上游之前校验并归一化基金历史的输出日期窗口。 */
export function parseHistoryWindow(args: Record<string, unknown>): HistoryWindow {
  const startDate = normalizeWindowDate(args.startDate, 'startDate');
  const endDate = normalizeWindowDate(args.endDate, 'endDate');
  if (startDate && endDate && startDate > endDate) {
    throw new InvalidArgumentError('startDate 不能晚于 endDate');
  }
  return { startDate, endDate };
}

function rowTime(item: unknown): string | null {
  if (typeof item !== 'object' || item === null) return null;
  if ('time' in item && typeof item.time === 'string' && item.time) return item.time;
  return 'date' in item && typeof item.date === 'string' && item.date ? item.date : null;
}

function sortByTime(items: unknown[]): unknown[] {
  return items.slice().sort((a, b) => (rowTime(a) ?? '').localeCompare(rowTime(b) ?? ''));
}

interface Coverage {
  total: number;
  returned: number;
  start: string | null;
  end: string | null;
  truncated: boolean;
}

/** 只序列化有界的样本，触及字符上限时继续缩小并保留最近一端。 */
function serializeRecent(
  items: unknown[],
  render: (sample: unknown[], coverage: Coverage) => unknown
): string {
  const serialize = (sample: unknown[]): string =>
    JSON.stringify(render(sample, {
      total: items.length,
      returned: sample.length,
      start: rowTime(sample[0]),
      end: rowTime(sample[sample.length - 1]),
      truncated: sample.length < items.length,
    }));

  let sample = items.length > MAX_ARRAY_ITEMS ? sortByTime(items).slice(-MAX_ARRAY_ITEMS) : items;
  let text = serialize(sample);
  while (sample.length > 1 && text.length > MAX_TEXT_CHARS) {
    const count = Math.max(1, Math.floor(sample.length * MAX_TEXT_CHARS / text.length));
    sample = (sample === items ? sortByTime(sample) : sample).slice(-count);
    text = serialize(sample);
  }
  return text;
}

/** 大数组裁剪：返回前 N 条 + 总数 + 提示 */
function clampLarge(data: unknown): unknown {
  if (Array.isArray(data) && data.length > MAX_ARRAY_ITEMS) {
    return {
      total: data.length,
      truncated: true,
      note: `结果过大，仅返回前 ${MAX_ARRAY_ITEMS} 条；请用日期 / 分页 / 市场等参数缩小范围`,
      sample: data.slice(0, MAX_ARRAY_ITEMS),
    };
  }
  return data;
}

function serializeResult(data: unknown, output?: McpOutput, window?: HistoryWindow): string {
  if (output === 'recentSeries' && Array.isArray(data)) {
    return serializeRecent(data, (sample, coverage) => {
      if (!coverage.truncated) return sample;
      return {
        ...coverage,
        note: `仅返回最近 ${sample.length} 条，可按工具支持的日期或周期缩小范围`,
        sample,
      };
    });
  }

  if (
    output === 'fundHistory' && typeof data === 'object' && data !== null &&
    'items' in data && Array.isArray(data.items)
  ) {
    const { startDate, endDate } = window ?? {};
    const items = startDate || endDate
      ? data.items.filter((item: unknown) => {
        const date = rowTime(item);
        return date !== null && (!startDate || date >= startDate) && (!endDate || date <= endDate);
      })
      : data.items;
    return serializeRecent(items, (sample, coverage) => ({ ...data, items: sample, coverage }));
  }

  return JSON.stringify(clampLarge(data)) ?? 'null';
}

/** 正常结果 → CallToolResult，按工具输出策略裁剪并保留大小兜底。 */
export function toToolResult(data: unknown, output?: McpOutput, window?: HistoryWindow): ToolResult {
  const text = serializeResult(data, output, window);
  if (text.length > MAX_TEXT_CHARS) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            truncated: true,
            reason: 'oversized',
            approxKB: Math.round(text.length / 1024),
            note: '结果体积过大，已省略数据体；请用更小的日期 / 分页 / 范围参数，或直接用 SDK 获取完整数据',
          }),
        },
      ],
      _meta: { truncated: true, approxChars: text.length },
    };
  }
  return { content: [{ type: 'text', text }] };
}

/**
 * 工具执行错误 → CallToolResult（isError:true），而非 JSON-RPC error，
 * 让 LLM 能看到错误内容并自行处理。SdkError 的结构化字段放进 _meta。
 */
export function toolErrorResult(e: unknown): ToolResult {
  const code = isSdkError(e) ? e.code : 'UNKNOWN';
  const message = e instanceof Error ? e.message : String(e);
  const meta: Record<string, unknown> = isSdkError(e)
    ? { code: e.code, provider: e.provider, url: e.url, status: e.status, details: e.details }
    : { code };
  return {
    content: [{ type: 'text', text: `Error[${code}]: ${message}` }],
    isError: true,
    _meta: meta,
  };
}
