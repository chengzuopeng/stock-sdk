/**
 * tools/call 结果包装：正常结果 / 工具执行错误 / 大结果裁剪。
 * 见 mcp.md §8 / §9。
 */
import { isSdkError } from '../core/errors';

/** 超过该条数的数组结果会被裁剪，避免撑爆 LLM 上下文 */
export const MAX_ARRAY_ITEMS = 200;

export interface ToolResultContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: ToolResultContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
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

/** 正常结果 → CallToolResult */
export function toToolResult(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(clampLarge(data)) }] };
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
