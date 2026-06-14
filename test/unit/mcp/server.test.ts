import { describe, it, expect } from 'vitest';
import { dispatchMessage, type DispatchContext } from '../../../src/mcp/server';
import { listTools } from '../../../src/mcp/tools';
import { StockSDK } from '../../../src/sdk';
import {
  LATEST_PROTOCOL_VERSION,
  RPC_METHOD_NOT_FOUND,
  RPC_INVALID_PARAMS,
  RPC_INVALID_REQUEST,
  type JsonRpcRequest,
} from '../../../src/mcp/protocol';

function makeCtx(): DispatchContext {
  const tools = listTools('full');
  return { sdk: new StockSDK(), tools, toolMap: new Map(tools.map((t) => [t.name, t])) };
}

interface InitResult {
  protocolVersion: string;
  capabilities: { tools: Record<string, unknown> };
  serverInfo: { name: string; version: string };
}
interface ListResult {
  tools: { name: string; description: string; inputSchema: unknown }[];
}
interface CallResult {
  content: { type: string; text: string }[];
  isError?: boolean;
}

describe('mcp/server · dispatchMessage', () => {
  it('initialize 协商命中版本并回显 serverInfo', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25' } },
      makeCtx()
    );
    const result = r?.result as InitResult;
    expect(result.protocolVersion).toBe('2025-11-25');
    expect(result.capabilities.tools).toEqual({});
    expect(result.serverInfo.name).toBe('stock-sdk');
  });

  it('initialize 未知版本回退到最新', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } },
      makeCtx()
    );
    expect((r?.result as InitResult).protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
  });

  it('ping 返回空对象', async () => {
    const r = await dispatchMessage({ jsonrpc: '2.0', id: 2, method: 'ping' }, makeCtx());
    expect(r?.result).toEqual({});
  });

  it('notifications/initialized 无响应(null)', async () => {
    const r = await dispatchMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, makeCtx());
    expect(r).toBeNull();
  });

  it('tools/list 返回全部工具且含 inputSchema', async () => {
    const ctx = makeCtx();
    const r = await dispatchMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, ctx);
    const result = r?.result as ListResult;
    expect(result.tools.length).toBe(ctx.tools.length);
    expect(result.tools[0]).toHaveProperty('inputSchema');
  });

  it('tools/call 同步工具 get_market_status 成功', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'get_market_status', arguments: { market: 'A' } } },
      makeCtx()
    );
    const result = r?.result as CallResult;
    expect(result.isError).toBeFalsy();
    expect(result.content[0].type).toBe('text');
  });

  it('tools/call 未知工具 → INVALID_PARAMS 协议错误', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'no_such_tool' } },
      makeCtx()
    );
    expect(r?.error?.code).toBe(RPC_INVALID_PARAMS);
  });

  it('未知 method → METHOD_NOT_FOUND', async () => {
    const r = await dispatchMessage({ jsonrpc: '2.0', id: 6, method: 'foo/bar' }, makeCtx());
    expect(r?.error?.code).toBe(RPC_METHOD_NOT_FOUND);
  });

  it('jsonrpc 非 2.0 → INVALID_REQUEST', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '1.0', id: 7, method: 'ping' } as unknown as JsonRpcRequest,
      makeCtx()
    );
    expect(r?.error?.code).toBe(RPC_INVALID_REQUEST);
  });

  it('tools/call params 非对象(数组) → INVALID_PARAMS', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 8, method: 'tools/call', params: ['x'] } as unknown as JsonRpcRequest,
      makeCtx()
    );
    expect(r?.error?.code).toBe(RPC_INVALID_PARAMS);
  });

  it('tools/call name 非 string → INVALID_PARAMS', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 123 } } as unknown as JsonRpcRequest,
      makeCtx()
    );
    expect(r?.error?.code).toBe(RPC_INVALID_PARAMS);
  });

  it('tools/call arguments 非对象 → INVALID_PARAMS', async () => {
    const r = await dispatchMessage(
      {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: { name: 'get_market_status', arguments: 'A' },
      } as unknown as JsonRpcRequest,
      makeCtx()
    );
    expect(r?.error?.code).toBe(RPC_INVALID_PARAMS);
  });

  it('#10 codes 传字符串(类型不符)→ INVALID_ARGUMENT(不泄漏 Error[UNKNOWN])', async () => {
    const r = await dispatchMessage(
      {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: { name: 'get_a_share_quotes', arguments: { codes: '600519' } },
      },
      makeCtx()
    );
    const result = r?.result as CallResult;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('INVALID_ARGUMENT');
  });

  it('#10 缺必填参数 codes → INVALID_ARGUMENT', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'get_a_share_quotes', arguments: {} } },
      makeCtx()
    );
    const result = r?.result as CallResult;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('INVALID_ARGUMENT');
  });

  it('tools/call 未声明参数 → INVALID_ARGUMENT', async () => {
    const r = await dispatchMessage(
      {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: { name: 'get_market_status', arguments: { market: 'A', typo: 'x' } },
      },
      makeCtx()
    );
    const result = r?.result as CallResult;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('INVALID_ARGUMENT');
    expect(result.content[0].text).toContain('未知参数 "typo"');
  });

  it('tools/call optional object 传 null → INVALID_ARGUMENT', async () => {
    const r = await dispatchMessage(
      {
        jsonrpc: '2.0',
        id: 14,
        method: 'tools/call',
        params: { name: 'get_kline_with_indicators', arguments: { symbol: '600519', indicators: null } },
      },
      makeCtx()
    );
    const result = r?.result as CallResult;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('INVALID_ARGUMENT');
    expect(result.content[0].text).toContain('参数 "indicators" 类型应为 object');
    expect(result.content[0].text).not.toContain('UNKNOWN');
  });

  it('#11 serverInfo.version 走构建注入，不硬编码 2.0.0', async () => {
    const r = await dispatchMessage({ jsonrpc: '2.0', id: 15, method: 'initialize', params: {} }, makeCtx());
    const result = r?.result as InitResult;
    expect(result.serverInfo.version).not.toBe('2.0.0');
    expect(result.serverInfo.version).toBe('0.0.0-dev');
  });
});
