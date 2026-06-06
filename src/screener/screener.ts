/**
 * 选股器（v2 B2）—— 纯本地链式筛选，输入任意行情/数据数组，无网络。
 */

export interface ScreenerBuilder<T> {
  /** 过滤：保留满足条件的项 */
  where(predicate: (item: T) => boolean): ScreenerBuilder<T>;
  /** 排序：按数值选择器，默认降序 */
  sortBy(
    selector: (item: T) => number | null | undefined,
    direction?: 'asc' | 'desc'
  ): ScreenerBuilder<T>;
  /** 取前 n 项并返回 */
  top(n: number): T[];
  /** 返回当前全部结果 */
  toArray(): T[];
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
      const sign = direction === 'asc' ? 1 : -1;
      current = current.slice().sort((a, b) => {
        const va = selector(a);
        const vb = selector(b);
        const aOk = Number.isFinite(va);
        const bOk = Number.isFinite(vb);
        // null / undefined / NaN 统一沉到末尾，不参与算术比较
        if (!aOk && !bOk) return 0;
        if (!aOk) return 1;
        if (!bOk) return -1;
        return ((va as number) - (vb as number)) * sign;
      });
      return builder;
    },
    top(n) {
      return current.slice(0, Math.max(0, n));
    },
    toArray() {
      return current.slice();
    },
  };
  return builder;
}
