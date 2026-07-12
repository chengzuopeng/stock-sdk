import { describe, it, expect, afterEach } from 'vitest';
import { dispatchMessage, type DispatchContext } from '../../../src/mcp/server';
import { resolveTierFilter } from '../../../src/mcp/types';
import { listTools } from '../../../src/mcp/tools';
import { listPrompts } from '../../../src/mcp/prompts';
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
  const prompts = listPrompts('full');
  return {
    sdk: new StockSDK(),
    tools,
    toolMap: new Map(tools.map((t) => [t.name, t])),
    prompts,
    promptMap: new Map(prompts.map((p) => [p.name, p])),
  };
}

interface InitResult {
  protocolVersion: string;
  capabilities: { tools: Record<string, unknown>; prompts: Record<string, unknown> };
  serverInfo: { name: string; version: string };
}
interface ListResult {
  tools: { name: string; description: string; inputSchema: unknown }[];
}
interface PromptsListResult {
  prompts: {
    name: string;
    title: string;
    description: string;
    arguments: { name: string; description: string; required: boolean }[];
  }[];
}
interface PromptsGetResult {
  description: string;
  messages: { role: string; content: { type: string; text: string } }[];
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
    expect(result.capabilities.prompts).toEqual({});
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

  // ============================ prompts（技能） ============================
  it('prompts/list 返回全部技能，每个含 name/title/description/arguments', async () => {
    const ctx = makeCtx();
    const r = await dispatchMessage({ jsonrpc: '2.0', id: 20, method: 'prompts/list' }, ctx);
    const result = r?.result as PromptsListResult;
    expect(result.prompts.length).toBe(ctx.prompts.length);
    const analyze = result.prompts.find((p) => p.name === 'analyze_stock');
    expect(analyze).toBeDefined();
    expect(analyze!.title).toBeTruthy();
    expect(analyze!.description).toBeTruthy();
    // arguments 形状：{name, description, required}，且不泄漏 usesTools 等内部字段
    expect(analyze!.arguments).toEqual([
      { name: 'symbol', description: expect.any(String), required: true },
      { name: 'period', description: expect.any(String), required: false },
    ]);
    expect(result.prompts[0]).not.toHaveProperty('usesTools');
    expect(result.prompts[0]).not.toHaveProperty('render');
  });

  it('prompts/get 插值出单条 user/text message + description', async () => {
    const r = await dispatchMessage(
      {
        jsonrpc: '2.0',
        id: 21,
        method: 'prompts/get',
        params: { name: 'analyze_stock', arguments: { symbol: 'sh600519', period: 'weekly' } },
      },
      makeCtx()
    );
    const result = r?.result as PromptsGetResult;
    expect(result.description).toBe('Analyze stock (technical) · sh600519');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');
    // 参数已插值 + 点名了真实工具 + 带上「用用户语言作答」纪律
    expect(result.messages[0].content.text).toContain('sh600519');
    expect(result.messages[0].content.text).toContain('weekly');
    expect(result.messages[0].content.text).toContain('get_kline_signals');
    expect(result.messages[0].content.text).toContain('Respond in the same language');
  });

  it('prompts/get 可选参数缺省走 default（period=daily）', async () => {
    const r = await dispatchMessage(
      {
        jsonrpc: '2.0',
        id: 22,
        method: 'prompts/get',
        params: { name: 'analyze_stock', arguments: { symbol: '600519' } },
      },
      makeCtx()
    );
    const result = r?.result as PromptsGetResult;
    expect(result.messages[0].content.text).toContain('daily');
  });

  it('prompts/get 未知 name → INVALID_PARAMS', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 23, method: 'prompts/get', params: { name: 'no_such_skill' } },
      makeCtx()
    );
    expect(r?.error?.code).toBe(RPC_INVALID_PARAMS);
    expect(r?.error?.message).toContain('Unknown prompt');
  });

  it('prompts/get 缺必填参数 → INVALID_PARAMS(JSON-RPC error，非 isError result)', async () => {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 24, method: 'prompts/get', params: { name: 'analyze_stock', arguments: {} } },
      makeCtx()
    );
    expect(r?.error?.code).toBe(RPC_INVALID_PARAMS);
    expect(r?.error?.message).toContain('symbol');
    expect(r?.result).toBeUndefined();
  });
});

describe('resolveTierFilter 环境变量解析（大小写/空列表/名单）', () => {
  const ENV = 'STOCK_SDK_MCP_TEST_FILTER';
  afterEach(() => {
    delete process.env[ENV];
  });

  it("tier 关键字大小写容错：'FULL'/' Core ' 不再被当名单过滤成 0 集合", () => {
    process.env[ENV] = 'FULL';
    expect(resolveTierFilter(undefined, ENV)).toBe('full');
    process.env[ENV] = ' Core ';
    expect(resolveTierFilter(undefined, ENV)).toBe('core');
  });

  it('名单形态原样返回（未知名由 startMcpServer 对照注册表告警）', () => {
    process.env[ENV] = 'get_a_share_quotes, analyze_stok';
    expect(resolveTierFilter(undefined, ENV)).toEqual([
      'get_a_share_quotes',
      'analyze_stok',
    ]);
  });

  it('空串 env 与显式空数组同语义：回退 core（不再产出零集合 server）', () => {
    process.env[ENV] = '  ,  ';
    expect(resolveTierFilter(undefined, ENV)).toBe('core');
    expect(resolveTierFilter([], ENV)).toBe('core');
  });

  it('显式参数优先于环境变量', () => {
    process.env[ENV] = 'full';
    expect(resolveTierFilter('core', ENV)).toBe('core');
    expect(resolveTierFilter(['analyze_stock'], ENV)).toEqual(['analyze_stock']);
  });
});
