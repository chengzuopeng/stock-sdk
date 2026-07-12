/**
 * 选股器（v2 B2）—— 纯本地链式筛选，输入任意行情/数据数组，无网络。
 */
import { InvalidArgumentError } from '../core/errors';

export interface ScreenerBuilder<T> {
  /** 过滤：保留满足条件的项 */
  where(predicate: (item: T) => boolean): ScreenerBuilder<T>;
  /**
   * 排序：按数值选择器，默认降序。
   * 字符串数值（原始行情 JSON 常见，如 `'999999'`）会经 `Number()` 归一后参与排序；
   * null / undefined / NaN / 空串 / 非数值字符串统一沉底。
   * direction 仅接受 `'asc'` / `'desc'`，其余取值抛 InvalidArgumentError。
   */
  sortBy(
    selector: (item: T) => number | string | null | undefined,
    direction?: 'asc' | 'desc'
  ): ScreenerBuilder<T>;
  /** 取前 n 项并返回 */
  top(n: number): T[];
  /** 返回当前全部结果 */
  toArray(): T[];
}

/** 选择器返回值归一：数字原样；非空字符串 Number() 转换；其余（null/undefined/空串）→ NaN 沉底。 */
function toSortValue(v: number | string | null | undefined): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return NaN;
}

/**
 * 创建一个选股器。组合现有「全市场行情 / 板块 / 资金流 / 龙虎榜」等数据使用：
 *
 * ```ts
 * const picks = screen(allQuotes)
 *   .where(q => q.pe != null && q.pe < 20)
 *   .where(q => q.changePercent > 3)
 *   .sortBy(q => q.amount)
 *   .top(20);
 * ```
 */
export function screen<T>(items: readonly T[]): ScreenerBuilder<T> {
  let current = items.slice();
  const builder: ScreenerBuilder<T> = {
    where(predicate) {
      current = current.filter(predicate);
      return builder;
    },
    sortBy(selector, direction = 'desc') {
      // JS 调用方传 'ASC'/'ascending' 等此前会被静默当降序处理，top(n) 全部选反
      if (direction !== 'asc' && direction !== 'desc') {
        throw new InvalidArgumentError(
          `sortBy(direction): 仅接受 'asc' / 'desc'，得到 ${String(direction)}`,
          { direction }
        );
      }
      const sign = direction === 'asc' ? 1 : -1;
      // F38: current 始终是 builder 私有副本(入口 items.slice()、filter 产新数组),
      // 原地 sort 即可,省掉每次 sortBy 的整数组拷贝(全市场 5600 元素 ~45KB/次)。
      // 对外不可变性不变：入口已拷贝调用方数组,top/toArray 仍返回新数组。
      current.sort((a, b) => {
        const va = toSortValue(selector(a));
        const vb = toSortValue(selector(b));
        const aOk = Number.isFinite(va);
        const bOk = Number.isFinite(vb);
        // null / undefined / NaN / 非数值字符串统一沉到末尾，不参与算术比较
        if (!aOk && !bOk) return 0;
        if (!aOk) return 1;
        if (!bOk) return -1;
        return (va - vb) * sign;
      });
      return builder;
    },
    top(n) {
      if (!Number.isInteger(n) || n < 0) {
        throw new InvalidArgumentError(
          `top(n): n must be a non-negative integer, got ${n}`,
          { n }
        );
      }
      return current.slice(0, n);
    },
    toArray() {
      return current.slice();
    },
  };
  return builder;
}
