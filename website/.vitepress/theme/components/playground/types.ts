/**
 * Playground 共享类型定义
 *
 * 设计目标：每个 SDK 方法在自己的 spec 文件中既声明参数表单，也内联调度逻辑（run 函数），
 * 完全消除原 Playground.vue 中长达 400 行的 dispatcher switch。
 */

export type CategoryKey =
  | 'quotes'
  | 'kline'
  | 'board'
  | 'indicator'
  | 'search'
  | 'batch'
  | 'futures'
  | 'options'
  | 'extended';

export interface ParamSelectOption {
  value: string;
  label: string;
}

export interface ParamSpec {
  key: string;
  label: string;
  /**
   * - `'text'` / `'number'`：原生 input
   * - `'select'`：下拉，需配合 `options`
   * - `'date'`：原生 `<input type="date">`，值为 `YYYY-MM-DD`
   */
  type: 'text' | 'number' | 'select' | 'date';
  default: string;
  required?: boolean;
  placeholder?: string;
  /** 仅 type === 'select' 使用 */
  options?: ParamSelectOption[];
}

export interface RunContext {
  /**
   * 在请求执行过程中实时上报进度（仅批量接口需要），
   * 主组件订阅后会更新结果区的 loading 文案。
   */
  onProgress?: (message: string) => void;
}

export interface MethodSpec {
  /** 方法名（同 SDK 方法名，必须唯一） */
  name: string;
  /** 一行人话描述，显示在标题旁 */
  desc: string;
  category: CategoryKey;
  /** 表单参数定义 */
  params: ParamSpec[];
  /**
   * 代码示例。
   * - 字符串：静态示例（适合需要展示完整结构、与具体参数关系不大的方法，如 `getKlineWithIndicators`）
   * - 函数：基于当前参数动态生成示例（推荐，复制即可运行）
   */
  code: string | ((params: Record<string, string>) => string);
  /**
   * 实际请求执行函数。原 dispatcher switch 的每个 case 都内联到这里，
   * 让 SDK 方法的"参数定义"和"调用方式"在同一处声明。
   */
  run: (
    sdk: any,
    params: Record<string, string>,
    ctx: RunContext
  ) => Promise<unknown>;
}

export interface CategorySpec {
  key: CategoryKey;
  label: string;
  /** Iconify 图标 ID（如 'lucide:bar-chart-3'） */
  icon: string;
  /** 分类强调色 */
  color: string;
}
