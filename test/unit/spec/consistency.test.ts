/**
 * F29 共享方法 spec 一致性（SSOT 落地防回退）：
 * - CLI 命令与 MCP 工具均由 src/spec/methods.ts 派生，两端在 enum/required/类型上必须一致；
 * - 全库只剩一处 adjust 枚举定义（spec 导出的 ADJUST），board 工具不再有第三套变体；
 * - MCP validateArgs 按 schema enum 拒绝非法值（与 CLI enum 拒绝语义一致）。
 *
 * 断言对象是「两端最终对外的派生产物」（NAMESPACE_COMMANDS / TOOLS），
 * 任何一端绕过 spec 手工改动都会在此失败。
 */
import { describe, it, expect } from 'vitest';
import {
  METHOD_SPECS,
  ADJUST,
  ADJUST_VALUES,
  type MethodSpec,
  type ParamSpec,
} from '../../../src/spec/methods';
import { jsonKeyOf, mcpEnumOf } from '../../../src/spec/derive-mcp';
import { NAMESPACE_COMMANDS } from '../../../src/cli/manifest';
import { TOOLS, TOOL_MAP, listTools } from '../../../src/mcp/tools';
import { dispatchMessage, type DispatchContext } from '../../../src/mcp/server';
import { StockSDK } from '../../../src/sdk';
import type { CommandSpec } from '../../../src/cli/types';
import type { JsonSchemaProp } from '../../../src/mcp/types';

/** CLI option 类型 → MCP JSON Schema 类型（与 derive-mcp 的映射一致）。 */
const JSON_TYPE: Record<string, string> = {
  string: 'string',
  enum: 'string',
  number: 'integer',
  boolean: 'boolean',
};

function findCmd(spec: MethodSpec): CommandSpec {
  const cmd = NAMESPACE_COMMANDS.find((c) => c.path.join('.') === spec.path.join('.'));
  expect(cmd, `CLI 缺少命令 ${spec.path.join('.')}`).toBeDefined();
  return cmd!;
}

const MCP_SPECS = METHOD_SPECS.filter((s) => s.mcp !== false);
/** 两端共享的参数（CLI 与 MCP 都声明）。 */
function sharedParams(spec: MethodSpec): ParamSpec[] {
  return (spec.params ?? []).filter((p) => p.cli !== false && p.mcp !== false);
}

describe('spec 完整性与两端规模', () => {
  it('85 个方法 spec；79 个 MCP 工具（6 个 CLI-only：batch.raw/blockTrade×3/margin×2）', () => {
    expect(METHOD_SPECS.length).toBe(85);
    expect(MCP_SPECS.length).toBe(79);
    expect(TOOLS.length).toBe(79);
    expect(NAMESPACE_COMMANDS.length).toBe(85);
  });

  it('工具名唯一且与 spec 的 toolName 一一对应，tier 归属一致', () => {
    expect(TOOL_MAP.size).toBe(TOOLS.length); // 无重名
    for (const spec of MCP_SPECS) {
      const tool = TOOL_MAP.get(spec.toolName!);
      expect(tool, `MCP 缺少工具 ${spec.toolName}`).toBeDefined();
      expect(tool!.tier).toBe(spec.tier ?? 'full');
    }
  });

  it('core 工具集为 24 个高频工具（沿用既有归属）', () => {
    expect(listTools('core').length).toBe(24);
  });
});

describe('(a) 每个 spec 的 CLI 命令与 MCP 工具在 enum/required/类型上一致', () => {
  for (const spec of MCP_SPECS) {
    it(`${spec.path.join('.')} ↔ ${spec.toolName}`, () => {
      const cmd = findCmd(spec);
      const tool = TOOL_MAP.get(spec.toolName!)!;
      const props = tool.inputSchema.properties;
      const required = tool.inputSchema.required ?? [];

      // codes[] 形态：MCP 必有 required 的 codes 数组属性（CLI 由 argShape 收集位置参数）
      if (spec.argShape === 'codes[]' || spec.argShape === 'codes+options') {
        expect(props.codes?.type).toBe('array');
        expect(required).toContain('codes');
      }

      // 位置参数：MCP 侧为同名属性，enum / required 必须一致
      for (const pos of spec.positional ?? []) {
        const cliPos = (cmd.positional ?? []).find((p) => p.name === pos.name);
        expect(cliPos, `CLI 缺少位置参数 <${pos.name}>`).toBeDefined();
        const prop = props[pos.name];
        expect(prop, `MCP 缺少属性 ${pos.name}`).toBeDefined();
        expect(prop.type).toBe('string');
        expect(prop.enum ?? undefined).toEqual(cliPos!.enum ?? undefined);
        expect(required.includes(pos.name)).toBe(pos.required === true);
      }

      // 共享参数：类型映射 / 枚举（CLI 取值经 map 映射后等于 MCP 线上枚举）/ required 一致
      for (const p of sharedParams(spec)) {
        const cliOpt = (cmd.options ?? []).find((o) => o.flag === p.flag);
        expect(cliOpt, `CLI 缺少 --${p.flag}`).toBeDefined();
        const key = jsonKeyOf(p);
        const prop = props[key];
        expect(prop, `MCP 缺少属性 ${key}`).toBeDefined();
        expect(prop.type).toBe(JSON_TYPE[cliOpt!.type]);
        const cliWireEnum = cliOpt!.enum?.map((v) => (p.map?.[v] as string) ?? v);
        expect(prop.enum ?? undefined).toEqual(cliWireEnum ?? undefined);
        expect(required.includes(key)).toBe(cliOpt!.required === true);
      }

      // 单侧参数不得越界：cli:false 不进 CLI options，mcp:false 不进 MCP schema
      // （northbound 的 --direction 是 CLI 专属 flag，但同名 MCP 属性由位置参数合法提供，需排除）
      const positionalNames = new Set((spec.positional ?? []).map((p) => p.name));
      for (const p of spec.params ?? []) {
        if (p.cli === false) {
          expect((cmd.options ?? []).some((o) => o.flag === p.flag)).toBe(false);
        }
        if (p.mcp === false && !positionalNames.has(jsonKeyOf(p))) {
          expect(props[jsonKeyOf(p)]).toBeUndefined();
        }
      }
    });
  }

  it('已修复的两端差异保持现状：recentDays 对外名 / 美股分时无时间窗口 / 板块分时仅 period / batch hk 无 market', () => {
    const hkMinute = TOOL_MAP.get('get_hk_minute_kline')!.inputSchema.properties;
    expect(hkMinute.recentDays?.type).toBe('integer'); // 对外名保留 recentDays（CLI 是 --ndays）
    expect(hkMinute.ndays).toBeUndefined();

    const usMinute = TOOL_MAP.get('get_us_minute_kline')!.inputSchema.properties;
    expect(usMinute.startDate).toBeUndefined(); // MCP 现行 schema 不含时间窗口
    expect(usMinute.endDate).toBeUndefined();
    const usMinuteCli = NAMESPACE_COMMANDS.find((c) => c.path.join('.') === 'kline.usMinute')!;
    expect(usMinuteCli.options!.map((o) => o.flag)).toEqual(['period', 'adjust', 'start', 'end', 'ndays']);

    const boardMinute = TOOL_MAP.get('get_industry_minute_kline')!.inputSchema.properties;
    expect(Object.keys(boardMinute)).toEqual(['symbol', 'period']); // 无 adjust/startDate/endDate 死参数
    const boardMinuteCli = NAMESPACE_COMMANDS.find((c) => c.path.join('.') === 'board.industry.minuteKline')!;
    expect(boardMinuteCli.options!.map((o) => o.flag)).toEqual(['period']);

    const batchHk = TOOL_MAP.get('get_all_hk_quotes')!.inputSchema.properties;
    expect(batchHk.market).toBeUndefined(); // SDK 选项没有 market
    const batchHkCli = NAMESPACE_COMMANDS.find((c) => c.path.join('.') === 'batch.hk')!;
    expect(batchHkCli.options!.some((o) => o.flag === 'market')).toBe(false);

    const codesUs = TOOL_MAP.get('get_us_code_list')!.inputSchema.properties;
    expect(codesUs.market?.enum).toEqual(['NASDAQ', 'NYSE', 'AMEX']);
    const codesUsCli = NAMESPACE_COMMANDS.find((c) => c.path.join('.') === 'codes.us')!;
    const usMarketOpt = codesUsCli.options!.find((o) => o.flag === 'market')!;
    expect(usMarketOpt.enum).toEqual(['NASDAQ', 'NYSE', 'AMEX']);
    expect(usMarketOpt.upper).toBe(true);
  });
});

describe('(b) adjust 枚举单一来源（无第三套变体）', () => {
  const MCP_ADJUST_ENUM = mcpEnumOf(ADJUST); // ['qfq','hfq','']（none 经 map 映射）

  it('spec 导出的 ADJUST 即 CLI 取值面（qfq/hfq/none + none→\'\' 映射）', () => {
    expect(ADJUST.enum).toBe(ADJUST_VALUES);
    expect(ADJUST_VALUES).toEqual(['qfq', 'hfq', 'none']);
    expect(ADJUST.map).toEqual({ none: '' });
    expect(MCP_ADJUST_ENUM).toEqual(['qfq', 'hfq', '']);
  });

  it('全部 CLI adjust 选项引用同一枚举数组（含 board K 线，无第三套）', () => {
    const adjustOpts = NAMESPACE_COMMANDS.flatMap((c) =>
      (c.options ?? []).filter((o) => o.flag === 'adjust')
    );
    expect(adjustOpts.length).toBeGreaterThan(0);
    for (const opt of adjustOpts) {
      expect(opt.enum).toBe(ADJUST_VALUES); // 同一引用，而非内容相同的拷贝
      expect(opt.map).toEqual({ none: '' });
    }
  });

  it('全部 MCP adjust 属性枚举一致（board 工具不再有第三套变体，仅 default 不同）', () => {
    const adjustProps: Array<{ name: string; prop: JsonSchemaProp }> = [];
    for (const tool of TOOLS) {
      const prop = tool.inputSchema.properties.adjust;
      if (prop) adjustProps.push({ name: tool.name, prop });
    }
    expect(adjustProps.length).toBeGreaterThan(0);
    const enumVariants = new Set(adjustProps.map(({ prop }) => JSON.stringify(prop.enum)));
    expect([...enumVariants]).toEqual([JSON.stringify(MCP_ADJUST_ENUM)]);
    // 个股/期货默认 qfq；板块默认 ''（不复权）——默认值差异保留，枚举仍单一来源
    expect(TOOL_MAP.get('get_history_kline')!.inputSchema.properties.adjust!.default).toBe('qfq');
    expect(TOOL_MAP.get('get_industry_kline')!.inputSchema.properties.adjust!.default).toBe('');
    expect(TOOL_MAP.get('get_concept_kline')!.inputSchema.properties.adjust!.default).toBe('');
  });
});

describe('(c) MCP validateArgs 拒绝 enum 非法值（与 CLI 拒绝语义一致）', () => {
  function makeCtx(): DispatchContext {
    const tools = listTools('full');
    return { sdk: new StockSDK(), tools, toolMap: new Map(tools.map((t) => [t.name, t])) };
  }

  interface CallResult {
    content: { type: string; text: string }[];
    isError?: boolean;
  }

  async function callTool(name: string, args: Record<string, unknown>): Promise<CallResult> {
    const r = await dispatchMessage(
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
      makeCtx()
    );
    return r?.result as CallResult;
  }

  it("get_history_kline period:'hourly' → isError 且消息含合法值", async () => {
    const result = await callTool('get_history_kline', { symbol: '600519', period: 'hourly' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('INVALID_ARGUMENT');
    expect(result.content[0].text).toContain('daily / weekly / monthly');
  });

  it("get_zt_pool type:'bogus' → isError 且消息含合法值（位置参数派生的枚举同样生效）", async () => {
    const result = await callTool('get_zt_pool', { type: 'bogus' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('zt');
  });

  it("get_market_status market:'X' → isError；合法值 'A' 正常返回（不发网络请求的同步工具）", async () => {
    const bad = await callTool('get_market_status', { market: 'X' });
    expect(bad.isError).toBe(true);
    expect(bad.content[0].text).toContain('A / HK / US');
    const ok = await callTool('get_market_status', { market: 'A' });
    expect(ok.isError).toBeFalsy();
  });
});
