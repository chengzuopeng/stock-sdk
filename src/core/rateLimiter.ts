/**
 * 请求速率限制器 - 基于令牌桶算法
 * 支持浏览器和 Node.js 环境
 */

/**
 * 限流器配置选项
 */
export interface RateLimiterOptions {
  /** 每秒最大请求数，默认 5 */
  requestsPerSecond?: number;
  /** 令牌桶最大容量（允许的突发请求数），默认等于 requestsPerSecond */
  maxBurst?: number;
}

/**
 * 令牌桶限流器
 * 
 * 工作原理：
 * - 以固定速率 (requestsPerSecond) 向桶中添加令牌
 * - 每次请求消耗一个令牌
 * - 桶满时令牌不再增加
 * - 桶空时请求需要等待
 */
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // 每毫秒恢复的令牌数
  private lastRefillTime: number;

  constructor(options: RateLimiterOptions = {}) {
    const requestsPerSecond = options.requestsPerSecond ?? 5;
    this.maxTokens = options.maxBurst ?? requestsPerSecond;
    this.tokens = this.maxTokens;
    this.refillRate = requestsPerSecond / 1000; // 转换为每毫秒
    this.lastRefillTime = Date.now();
  }

  /**
   * 补充令牌（基于时间流逝）
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * 尝试获取令牌（非阻塞）
   * @returns 是否成功获取令牌
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * 获取等待时间（毫秒）
   * @returns 需要等待的毫秒数才能获取下一个令牌
   */
  getWaitTime(): number {
    this.refill();
    if (this.tokens >= 1) {
      return 0;
    }
    // 计算需要等待多久才能获得 1 个令牌
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }

  /**
   * 等待并获取令牌（阻塞）
   * 这是主要的调用入口
   */
  async acquire(): Promise<void> {
    const waitTime = this.getWaitTime();
    if (waitTime > 0) {
      await this.sleep(waitTime);
    }
    this.refill();
    this.tokens -= 1;
  }

  /**
   * 休眠指定毫秒
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取当前可用令牌数（用于调试）
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}
