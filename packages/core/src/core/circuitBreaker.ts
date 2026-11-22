/**
 * 熔断器 - 防止雪崩效应
 * 
 * 状态机：
 * - CLOSED: 正常状态，允许所有请求
 * - OPEN: 熔断状态，拒绝所有请求
 * - HALF_OPEN: 半开状态，允许少量请求探测
 */
import { SdkError } from './errors';

/**
 * 熔断器状态
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * 熔断器配置
 */
export interface CircuitBreakerOptions {
  /** 触发熔断的失败次数阈值，默认 5 */
  failureThreshold?: number;
  /** 熔断持续时间（毫秒），默认 30000 (30秒) */
  resetTimeout?: number;
  /** 半开状态允许的探测请求数，默认 1 */
  halfOpenRequests?: number;
  /**
   * 半开在途探测名额的失联回收阈值(毫秒)，默认 `max(resetTimeout * 4, 120_000)`。
   *
   * Review R3-8:此前回收阈值硬复用 resetTimeout(默认 30s,恰等于请求默认
   * 超时 DEFAULT_TIMEOUT),合法慢探测(单次近超时、或含重试预算 ~4×30s)的
   * 名额会被中途回收 → 半开限流被击穿。独立化后默认值覆盖「默认超时 × 默认
   * 重试(maxRetries 3 → 至多 4 次尝试 ≈ 120s + 退避)」的探测预算;
   * resetTimeout 调大时按 4 倍跟随,保证回收阈值始终明显大于单探测生命周期。
   * 仅用于兜底「调用方异常路径漏配对 / 把 canRequest 当只读探询」的失联名额,
   * 不影响正常配对释放。
   */
  probeRecycleTimeout?: number;
  /** 状态变化回调 */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * 熔断器错误
 */
export class CircuitBreakerError extends SdkError {
  constructor(message: string = 'Circuit breaker is OPEN') {
    super({ code: 'CIRCUIT_OPEN', message });
    this.name = 'CircuitBreakerError';
  }
}

/**
 * 熔断器实现
 * 
 * 使用场景：
 * - 当连续多次请求失败时，暂时停止请求
 * - 等待一段时间后，尝试少量请求探测服务是否恢复
 * - 探测成功则恢复正常，失败则继续熔断
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenSuccessCount: number = 0;
  /**
   * 半开状态下在途(已放行未出结果)探测的【放行时间戳】数组(R3-8)。
   * 长度即在途数(halfOpenRequests 通常 1-3,开销可忽略);push 追加保证天然
   * 升序,失联回收只剔除「在途时长 ≥ probeRecycleTimeout」的过期前缀,
   * 不再一刀切清零(此前回收一次清空全部在途,合法慢探测名额被连坐)。
   * 探测彼此不可区分(配对释放无法知道结的是哪个),shift 取最老一项 ——
   * 计数语义等价,时间戳仅服务于回收判定。
   */
  private halfOpenProbeStartedAt: number[] = [];

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenRequests: number;
  private readonly probeRecycleTimeout: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.halfOpenRequests = options.halfOpenRequests ?? 1;
    // 默认值取义见 CircuitBreakerOptions.probeRecycleTimeout 注释(R3-8)
    this.probeRecycleTimeout =
      options.probeRecycleTimeout ?? Math.max(this.resetTimeout * 4, 120_000);
    this.onStateChange = options.onStateChange;
  }

  /**
   * 获取当前状态
   */
  getState(): CircuitState {
    this.checkStateTransition();
    return this.state;
  }

  /**
   * 检查是否应该允许请求
   */
  canRequest(): boolean {
    this.checkStateTransition();

    switch (this.state) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        return false;
      case 'HALF_OPEN': {
        // 半开限流:在途探测 + 已成功 < 限额才放行,放行即预占一个在途名额。
        // 此前仅看 halfOpenSuccessCount(只在探测完成后递增,达标即转 CLOSED),
        // 该条件在 HALF_OPEN 内恒真 → 并发请求不限量轰击恢复中的上游。
        // ⚠️ canRequest 在本状态【有副作用】(预占名额),必须与 recordSuccess /
        // recordFailure / releaseProbe(外部取消)之一配对 —— 把它当只读探询
        // 轮询会占用名额。
        // P2-11 兜底:在途名额超过 probeRecycleTimeout 仍未配对释放(调用方异常
        // 路径漏配对/把 canRequest 当探询)时视为失联回收 —— 否则 HALF_OPEN
        // 没有任何时间逃逸,名额泄漏会让熔断器永久卡死拒绝该 provider。
        // R3-8 精确化:按时间戳逐项判定,只剔除真正过期的名额(数组升序,
        // 过期项必为前缀);合法慢探测(在途 < probeRecycleTimeout)不再被连坐清零。
        const now = Date.now();
        while (
          this.halfOpenProbeStartedAt.length > 0 &&
          now - this.halfOpenProbeStartedAt[0] >= this.probeRecycleTimeout
        ) {
          this.halfOpenProbeStartedAt.shift();
        }
        if (
          this.halfOpenProbeStartedAt.length + this.halfOpenSuccessCount >=
          this.halfOpenRequests
        ) {
          return false;
        }
        this.halfOpenProbeStartedAt.push(now);
        return true;
      }
    }
  }

  /**
   * 释放一个半开探测名额:半开期被外部取消(ABORTED)的请求既非成功也非失败,
   * 不调用会泄漏名额导致半开期拒绝后续探测。
   */
  releaseProbe(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenProbeStartedAt.shift();
    }
  }

  /**
   * 记录请求成功
   */
  recordSuccess(): void {
    this.checkStateTransition();

    if (this.state === 'HALF_OPEN') {
      // 名额数组为空(僵尸探测:它的 slot 已被失联回收)时 shift 天然无操作,
      // 不再扣减新探测的名额(R3-8)。halfOpenSuccessCount 语义保留 ——
      // 成功就是成功;可接受的残余:僵尸成功仍可能把状态推到 CLOSED,
      // 上游确实返回过成功,语义可辩护。
      this.halfOpenProbeStartedAt.shift();
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.halfOpenRequests) {
        // 探测成功，恢复正常
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      // 重置失败计数
      this.failureCount = 0;
    }
  }

  /**
   * 记录请求失败
   */
  recordFailure(): void {
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.halfOpenProbeStartedAt.shift();
      // 探测失败，重新熔断
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        // 达到阈值，触发熔断
        this.transitionTo('OPEN');
      }
    }
  }

  /**
   * 检查状态转换（OPEN -> HALF_OPEN）
   */
  private checkStateTransition(): void {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeout) {
        this.transitionTo('HALF_OPEN');
      }
    }
  }

  /**
   * 状态转换
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) {
      return;
    }

    const oldState = this.state;
    this.state = newState;

    // 重置计数器
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.halfOpenSuccessCount = 0;
      this.halfOpenProbeStartedAt = [];
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenSuccessCount = 0;
      this.halfOpenProbeStartedAt = [];
    }

    // 触发回调
    this.onStateChange?.(oldState, newState);
  }

  /**
   * 手动重置熔断器
   */
  reset(): void {
    this.transitionTo('CLOSED');
    this.failureCount = 0;
    this.halfOpenSuccessCount = 0;
    this.halfOpenProbeStartedAt = [];
    this.lastFailureTime = 0;
  }

  /**
   * 包装异步函数，自动处理熔断逻辑
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canRequest()) {
      throw new CircuitBreakerError();
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * 获取统计信息（用于调试）
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number;
    halfOpenSuccessCount: number;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenSuccessCount: this.halfOpenSuccessCount,
    };
  }
}
