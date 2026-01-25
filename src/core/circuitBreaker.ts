/**
 * 熔断器 - 防止雪崩效应
 * 
 * 状态机：
 * - CLOSED: 正常状态，允许所有请求
 * - OPEN: 熔断状态，拒绝所有请求
 * - HALF_OPEN: 半开状态，允许少量请求探测
 */

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
  /** 状态变化回调 */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * 熔断器错误
 */
export class CircuitBreakerError extends Error {
  constructor(message: string = 'Circuit breaker is OPEN') {
    super(message);
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

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenRequests: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000;
    this.halfOpenRequests = options.halfOpenRequests ?? 1;
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
      case 'HALF_OPEN':
        // 半开状态只允许有限的请求
        return this.halfOpenSuccessCount < this.halfOpenRequests;
    }
  }

  /**
   * 记录请求成功
   */
  recordSuccess(): void {
    this.checkStateTransition();

    if (this.state === 'HALF_OPEN') {
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
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenSuccessCount = 0;
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
