/**
 * 最小 JSON-RPC 2.0 / MCP 协议类型与版本协商（零依赖）。
 * 见 mcp.md §2 / §8。
 */

/** 本 server 支持的 MCP 协议版本（按新到旧；首项为最新 stable） */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18'] as const;
export const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

/** server 身份（version 在发布 v2.0.0 时与 package.json 对齐） */
export const SERVER_INFO = { name: 'stock-sdk', version: '2.0.0' } as const;

/** JSON-RPC 标准错误码 */
export const RPC_PARSE_ERROR = -32700;
export const RPC_INVALID_REQUEST = -32600;
export const RPC_METHOD_NOT_FOUND = -32601;
export const RPC_INVALID_PARAMS = -32602;
export const RPC_INTERNAL_ERROR = -32603;

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
}

/**
 * 按客户端请求的版本协商：命中支持列表则回显，否则回退到自己支持的最新版本。
 */
export function negotiateProtocolVersion(requested?: unknown): string {
  if (
    typeof requested === 'string' &&
    (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
  ) {
    return requested;
  }
  return LATEST_PROTOCOL_VERSION;
}
