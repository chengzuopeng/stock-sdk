/**
 * R7-15 spec ↔ SDK 全量契约钉住（本轮 review 前 derive-mcp 注释声称的
 * 「contract 测试全量覆盖」并不存在——重命名 SDK 方法/options 字段可以
 * 编译全绿、单测全绿，CLI/MCP 到运行时才炸，或参数写到过期 field 名下被静默丢弃）。
 *
 * ① 路径契约：METHOD_SPECS 的每个 path 必须解析到真实 StockSDK 上的函数
 *    ——SDK 方法改名/挪命名空间时此处立刻红，而不是等到 tools/call 运行时。
 * ② 键集契约：每个 MCP 工具的 invoke 在 fake SDK 上实际组装出的
 *    (path / 位置参数个数 / options 键集) 快照钉住——spec 的 field/flag/jsonKey
 *    任何变动都会以快照 diff 形式暴露在 review 里，不能再静默漂移。
 */
import { describe, it, expect } from 'vitest';
import { METHOD_SPECS } from '../../../src/spec/methods';
import { resolveSdkMethod } from '../../../src/spec/resolve';
import { TOOL_MAP } from '../../../src/mcp/tools';
import { StockSDK } from '../../../src/sdk';

describe('R7-15①: spec 路径全量解析到真实 SDK', () => {
  it('每个 spec.path 都是 StockSDK 上的函数', () => {
    const sdk = new StockSDK(); // 构造函数纯服务装配，无网络
    for (const spec of METHOD_SPECS) {
      expect(
        resolveSdkMethod(sdk, spec.path),
        `spec 路径失效: ${spec.path.join('.')}`
      ).toBeTruthy();
    }
  });

  it('反向保障：坏路径确实解析失败（防断言被弱化）', () => {
    const sdk = new StockSDK();
    expect(resolveSdkMethod(sdk, ['quotes', 'noSuchMethod'])).toBeUndefined();
    expect(resolveSdkMethod(sdk, ['noSuchNamespace', 'cn'])).toBeUndefined();
  });
});

describe('R7-15②: MCP invoke 的 path / 位置参数 / options 键集快照', () => {
  interface RecordedCall {
    args: unknown[];
  }

  /** 只在 spec.path 上挂一个记录函数的 fake SDK（中间层为普通对象）。 */
  function fakeSdkFor(path: string[], calls: RecordedCall[]): StockSDK {
    const root: Record<string, unknown> = {};
    let node = root;
    for (let i = 0; i < path.length - 1; i++) {
      const child: Record<string, unknown> = {};
      node[path[i]] = child;
      node = child;
    }
    node[path[path.length - 1]] = (...args: unknown[]) => {
      calls.push({ args });
      return null;
    };
    return root as unknown as StockSDK;
  }

  /** 从 invoke 实际收到的实参里提取 options 键集（按 argShape 定位 options 位）。 */
  function contractOf(spec: (typeof METHOD_SPECS)[number]): Record<string, unknown> {
    const tool = TOOL_MAP.get(spec.toolName!);
    expect(tool, `MCP 缺少工具 ${spec.toolName}`).toBeDefined();
    const calls: RecordedCall[] = [];
    const fake = fakeSdkFor(spec.path, calls);
    // invoke 对 options 键是无条件写入（显式 undefined 键），空 args 即可枚举全部键
    void tool!.invoke(fake, {});
    expect(calls.length, `${spec.toolName} 的 invoke 未调用到 ${spec.path.join('.')}`).toBe(1);

    const args = calls[0].args;
    const posCount = (spec.positional ?? []).length;
    let optionKeys: string[] | undefined;
    switch (spec.argShape) {
      case 'codes+options':
        optionKeys = Object.keys((args[1] ?? {}) as object).sort();
        break;
      case 'symbol+options':
        optionKeys = Object.keys((args[posCount] ?? {}) as object).sort();
        break;
      case 'options':
        optionKeys = Object.keys((args[0] ?? {}) as object).sort();
        break;
      default:
        optionKeys = undefined; // none / codes[] / positional 无 options 对象
    }
    return {
      path: spec.path.join('.'),
      argShape: spec.argShape,
      argCount: args.length,
      ...(optionKeys !== undefined ? { optionKeys } : {}),
    };
  }

  it('93 个 MCP 工具的调用契约与快照一致', () => {
    const specs = METHOD_SPECS.filter((s) => s.mcp !== false && !s.mcpCustom);
    const contract: Record<string, Record<string, unknown>> = {};
    for (const spec of specs) {
      contract[spec.toolName!] = contractOf(spec);
    }
    expect(contract).toMatchSnapshot();
  });

  it('手写工具 get_kline_with_indicators 同样走真实 path 且可被 fake 记录', () => {
    const spec = METHOD_SPECS.find((s) => s.mcpCustom)!;
    expect(spec.path.join('.')).toBe('kline.withIndicators');
    const tool = TOOL_MAP.get(spec.toolName!)!;
    const calls: RecordedCall[] = [];
    void tool.invoke(fakeSdkFor(spec.path, calls), { symbol: '600519' });
    expect(calls.length).toBe(1);
    // 手写 invoke 契约：('600519', options) 两参
    expect(calls[0].args.length).toBe(2);
    expect(calls[0].args[0]).toBe('600519');
  });
});
