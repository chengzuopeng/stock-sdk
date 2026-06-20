/**
 * Playground v2 类型定义。
 *
 * 与 v1 的本质区别：方法目录不再手写，而是从 src/spec/methods.ts（CLI/MCP 的
 * SSOT）派生（见 derive.ts）。本文件只声明派生产物与表单的形状。
 */

/** 市场过滤标签（与 v1 同构，用于侧边栏市场芯片） */
export type MarketKey =
  | 'a'
  | 'hk'
  | 'us'
  | 'fund'
  | 'futures'
  | 'options'
  | 'board'
  | 'all';

export interface FieldOption {
  value: string;
  label: string;
}

/** 一个表单字段（由 spec 的 codes/positional/params 依序展开而来） */
export interface FormField {
  /** 表单值键。codes 固定 'codes'；positional 用参数名；param 用 SDK 字段名(field ?? flag) */
  key: string;
  kind: 'codes' | 'positional' | 'param';
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  required?: boolean;
  /** select 选项（enum 派生；非必填时自动带一个「默认」空选项） */
  options?: FieldOption[];
  placeholder?: string;
  /** 提示文案（spec 的 desc） */
  desc?: string;
  /** enum 取值映射（CLI 值 → SDK 值，如 adjust 的 none → ''），提交时应用 */
  map?: Record<string, string>;
  /** 提交前 toUpperCase() */
  upper?: boolean;
}

export interface RunContext {
  /** 批量接口的进度上报，主组件用于刷新 loading 文案 */
  onProgress?: (message: string) => void;
}

/** 派生后的 playground 方法（侧边栏 / 表单 / 执行 / 代码示例的统一输入） */
export interface PlaygroundMethod {
  /** 点分路径 id（'quotes.cn'），唯一键，亦用于 URL 深链 */
  id: string;
  /** 调用路径（['quotes','cn']） */
  path: string[];
  /** 侧边栏显示名（同 id） */
  label: string;
  /** 一行人话描述（spec.summary） */
  desc: string;
  /** 分类 = 命名空间（path[0]） */
  category: string;
  /** 市场标签（推断 + overrides 修正） */
  market: MarketKey[];
  /** 调用形态（runner / codegen 用） */
  argShape: string;
  /** 表单字段 */
  fields: FormField[];
  /**
   * 自定义执行（仅 overrides 中的特例使用，如 kline.withIndicators）。
   * 缺省走 runner.ts 的通用 argShape 组装。
   */
  run?: (sdk: any, values: Record<string, string>, ctx: RunContext) => Promise<unknown>;
  /** 自定义代码示例（特例用；缺省走 codegen.ts） */
  code?: (values: Record<string, string>) => string;
}

export interface CategorySpec {
  /** 命名空间名（quotes/kline/...） */
  key: string;
  label: string;
  /** Iconify 图标 ID */
  icon: string;
  /** 分类强调色 */
  color: string;
}

export interface MarketChipSpec {
  /** null = 不过滤 */
  key: MarketKey | null;
  label: string;
}
