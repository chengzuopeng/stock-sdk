/**
 * stock-sdk CLI —— 类型契约。
 *
 * 参见 `cli.md` §3（参数映射约定）/ §4（命令清单）。CLI 是主库的「消费者」：
 * `src/cli/*` 可以 import 主库，但 `src/index.ts` 绝不反向 import CLI（入口隔离铁律）。
 */
import type { StockSDK } from '../sdk';

/** 方法参数形态（决定 argv 如何映射成实参），见 cli.md §3 的 6 种 argShape。 */
export type ArgShape =
  | 'codes[]' // (codes: string[])
  | 'codes+options' // (codes: string[], options?)
  | 'symbol+options' // (symbol: string, options?)
  | 'options' // (options?)
  | 'positional' // (a, b?, ...)
  | 'none'; // ()

/** option flag 的取值类型。 */
export type OptionType = 'string' | 'number' | 'boolean' | 'enum' | 'number[]';

/** 一个 `--flag` 的声明。 */
export interface OptionSpec {
  /** flag 名（不含 `--`），如 `period`。 */
  flag: string;
  /** 落到 options 对象的字段名（默认同 `flag`）。 */
  field?: string;
  type: OptionType;
  /** `enum` 类型的允许值。 */
  enum?: string[];
  /** 必填选项:未提供则报「缺少必填选项」(dispatch.validateOptions 校验)。 */
  required?: boolean;
  /** `none`/缺省时的默认值（不写则不注入该字段）。 */
  default?: unknown;
  /** 传给 SDK 前 `toUpperCase()`（市场类参数 a/hk/us → A/HK/US）。 */
  upper?: boolean;
  /** 值映射（如 `adjust` 的 `none` → `''`）。命中则替换最终值。 */
  map?: Record<string, unknown>;
  desc: string;
}

/** 一个位置参数的声明。 */
export interface PositionalSpec {
  name: string;
  required?: boolean;
  /** 收集剩余所有位置参数成数组（只能是最后一个）。 */
  variadic?: boolean;
  enum?: string[];
  /** 传给 SDK 前 `toUpperCase()`。 */
  upper?: boolean;
}

/**
 * CLI 输出层后处理：不透传进 SDK options。
 * 如 `--limit N` → 对结果数组 `slice(N)`（cli.md §4.1 注 †）。
 */
export interface PostProcessSpec {
  flag: string;
  apply: (result: unknown, value: number) => unknown;
}

/** CLI 解析阶段产出的上下文（已做类型转换前的原始 token + flags）。 */
export interface InvokeContext {
  /** 命令路径之后剩余的位置参数。 */
  positional: string[];
  /** 已按 manifest 转换并归一化后的 options 对象。 */
  options: Record<string, unknown>;
}

/** 一条命令的完整定义。 */
export interface CommandSpec {
  /**
   * 命令路径（也是命名空间路径）：
   * - 命名空间方法：`['quotes','cn']` → `sdk.quotes.cn`
   * - 顶层方法：`['search']` → `sdk.search`
   */
  path: string[];
  /** 第 1 层高频快捷命令名，如 `['quote']`。 */
  alias?: string[];
  summary: string;
  argShape: ArgShape;
  positional?: PositionalSpec[];
  options?: OptionSpec[];
  postProcess?: PostProcessSpec[];
  /**
   * 自定义调用，覆盖「path + argShape」默认派生。
   * 用于高频别名的特殊逻辑（如 `quote` 的市场自动识别、`kline --market` 选 cn/hk/us）。
   */
  invoke?: (sdk: StockSDK, ctx: InvokeContext) => Promise<unknown>;
}

/** 输出格式。 */
export type OutputFormat = 'json' | 'table' | 'csv';

/** 全局选项（命令无关）。 */
export interface GlobalOptions {
  format: OutputFormat;
  pretty: boolean;
  timeout?: number;
  quiet: boolean;
  help: boolean;
  version: boolean;
}

/** parser 产出的原始解析结果（仅做语法解析，未做类型转换）。 */
export interface ParsedArgv {
  positional: string[];
  options: Record<string, string | boolean | string[]>;
}
