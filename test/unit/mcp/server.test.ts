import { describe, it, expect } from 'vitest';
import { dispatchMessage, type DispatchContext } from '../../../src/mcp/server';
import { listTools } from '../../../src/mcp/tools';
import { StockSDK } from '../../../src/sdk';
import { LATEST_PROTOCOL_VERSION, RPC_METHOD_NOT_FOUND, RPC_INVALID_PARAMS } from '../../../src/mcp/protocol';

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
});
