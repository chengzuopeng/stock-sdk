/**
 * 浏览器全局名级互斥锁
 *
 * 用于"通过 `<script>` 注入读固定全局变量 / 固定 callback 名"这种本质上无法并发的
 * 接口（典型：东方财富 pingzhongdata.js 的固定 `Data_netWorthTrend` 等变量，
 * 天天基金 fundgz 的固定 `jsonpgz` callback）。
 *
 * 工作方式：每个 key 维护一个 promise 队列，同 key 的请求串行执行；不同 key
 * 的请求互不阻塞。前一次任务无论成功失败都会释放队列，不阻断后续。
 *
 * 注意：这是浏览器端的并发安全兜底。Node 端不存在全局污染问题（用 fetch + 文本
 * 解析），不需要 mutex。
 */

const queues = new Map<string, Promise<unknown>>();

/**
 * 在 `key` 对应的串行队列中执行 `fn`。
 *
 * @param key 互斥分组键（通常是固定全局变量名集合或 callback 名）
 * @param fn 需要串行执行的异步任务
 * @returns `fn` 的返回值（透传 resolve / reject）
 */
export async function withScriptMutex<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  // 用 then(fn, fn) 让前一次失败不阻断后一次（fn 总会被调用一次）
  const next = prev.then(fn, fn);
  // 队列只关心"完成"，不传播错误，否则下个排队者会被前一个错误污染
  queues.set(
    key,
    next.then(
      () => undefined,
      () => undefined
    )
  );
  return next;
}

/**
 * 清空所有队列（测试辅助；生产代码不应调用）。
 */
export function __resetScriptMutex(): void {
  queues.clear();
}
