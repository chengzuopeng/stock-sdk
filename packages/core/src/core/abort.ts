interface CombinedSignal {
  signal: AbortSignal | undefined;
  /** 请求结束后调用以移除 fallback 注册的监听，防止长生命周期 signal 泄漏 */
  cleanup: () => void;
}

const NO_CLEANUP = () => {};
// Older AbortSignals have neither `reason` nor `throwIfAborted`. Keep a
// stable reason so cancellation is still attributed to the originating signal.
const legacyReasons = new WeakMap<AbortSignal, unknown>();

export function getAbortReason(signal: AbortSignal): unknown {
  if ('reason' in signal) return signal.reason;
  if (!legacyReasons.has(signal)) {
    legacyReasons.set(signal, new DOMException('The operation was aborted.', 'AbortError'));
  }
  return legacyReasons.get(signal);
}

export function abortWithReason(controller: AbortController, reason: unknown): void {
  if (controller.signal.aborted) return;
  if (!('reason' in controller.signal)) legacyReasons.set(controller.signal, reason);
  controller.abort(reason);
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw getAbortReason(signal);
}

/**
 * 合并多个 AbortSignal：任一触发即 abort。
 * 优先用原生 `AbortSignal.any`（Node 18.17+/20.3+、现代浏览器）；
 * 缺失时（Node 18.0–18.16）退回手写联动，并在结束后清理监听防泄漏。
 */
export function combineSignals(signals: (AbortSignal | undefined)[]): CombinedSignal {
  const list = signals.filter((s): s is AbortSignal => Boolean(s));
  if (list.length === 0) return { signal: undefined, cleanup: NO_CLEANUP };
  if (list.length === 1) return { signal: list[0], cleanup: NO_CLEANUP };

  const anyFn = (
    AbortSignal as unknown as {
      any?: (signals: AbortSignal[]) => AbortSignal;
    }
  ).any;
  if (typeof anyFn === 'function') {
    return { signal: anyFn(list), cleanup: NO_CLEANUP };
  }

  // fallback（Node 18.0–18.16）：手动联动，并记录监听以便请求结束后移除
  const controller = new AbortController();
  const abort = (reason: unknown) => {
    abortWithReason(controller, reason);
  };
  const registered: Array<{ s: AbortSignal; handler: () => void }> = [];
  for (const s of list) {
    if (s.aborted) {
      abort(getAbortReason(s));
      break;
    }
    const handler = () => abort(getAbortReason(s));
    s.addEventListener('abort', handler, { once: true });
    registered.push({ s, handler });
  }
  const cleanup = () => {
    for (const { s, handler } of registered) {
      s.removeEventListener('abort', handler);
    }
  };
  return { signal: controller.signal, cleanup };
}

/**
 * Review R3-2:让「不监听 init.signal 的自定义 fetchImpl」也能被超时/取消解除挂起。
 * 真实 fetch 会订阅 signal 并以 signal.reason 拒绝;但 naive wrapper / axios 适配
 * 可能完全无视 signal —— 此前超时 abort 无人响应,fetch promise 永不 settle:
 * 无 TIMEOUT、retry/熔断/hooks 全部失效,调用方无限挂起。
 *
 * 与 signal 的 abort 事件 race,要点:
 * - race 的拒绝值取 signal.reason,与 performRequest 的 matchesReason 身份溯源
 *   天然契合(内部超时 → timeoutReason → TIMEOUT;外部取消 → 外部 reason → ABORTED);
 * - abort 监听在 settle 后显式移除,防止长生命周期 signal 上的监听泄漏;
 * - 落败方 promise 的 rejection 预先吸掉,避免 unhandledRejection;
 * - 对正常监听 signal 的 fetch 行为不变:谁先 settle 都是同一个 reason / 响应。
 */
export async function raceWithAbort<T>(
  signal: AbortSignal | undefined,
  promise: Promise<T>
): Promise<T> {
  if (!signal) return promise;
  // 预先标记落败方 rejection 已处理(派生 promise,不影响 race 对结果的传播)
  Promise.resolve(promise).catch(() => {});
  if (signal.aborted) {
    // 已取消的 signal 不会再发 abort 事件 → 与「已拒绝的占位 promise」race。
    // Promise.race 按注册序结算:已经 settle 的 fetch promise 仍然胜出 ——
    // 保住补f 语义(已到手的真实响应/业务错误如 HTTP 500 不被外部取消掩盖);
    // 未 settle 的(deaf fetchImpl)下一微任务即被 signal.reason 拒绝,不挂起。
    return Promise.race([promise, Promise.reject(getAbortReason(signal))]);
  }
  let onAbort!: () => void;
  const abortPromise = new Promise<never>((_, reject) => {
    onAbort = () => reject(getAbortReason(signal));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([promise, abortPromise]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

/** 延迟结束或取消时及时释放定时器。 */
export async function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await raceWithAbort(signal, new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    }));
  } finally {
    clearTimeout(timer);
  }
}
