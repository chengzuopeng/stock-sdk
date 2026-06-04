/**
 * 限流器单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../../src/core/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within rate limit', () => {
    const limiter = new RateLimiter({ requestsPerSecond: 5 });

    // 初始应该有 5 个令牌
    expect(limiter.getAvailableTokens()).toBe(5);

    // 连续 5 次应该都能立即获取
    for (let i = 0; i < 5; i++) {
      expect(limiter.tryAcquire()).toBe(true);
    }

    // 第 6 次应该失败
    expect(limiter.tryAcquire()).toBe(false);
  });

  it('should refill tokens over time', () => {
    const limiter = new RateLimiter({ requestsPerSecond: 5 });

    // 消耗所有令牌
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire();
    }
    expect(limiter.getAvailableTokens()).toBeLessThan(1);

    // 前进 200ms（应该恢复 1 个令牌: 5/1000 * 200 = 1）
    vi.advanceTimersByTime(200);

    expect(limiter.getAvailableTokens()).toBeCloseTo(1, 1);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it('should calculate correct wait time', () => {
    const limiter = new RateLimiter({ requestsPerSecond: 5 });

    // 消耗所有令牌
    for (let i = 0; i < 5; i++) {
      limiter.tryAcquire();
    }

    // 需要等待 200ms 才能获得 1 个令牌
    const waitTime = limiter.getWaitTime();
    expect(waitTime).toBeGreaterThan(0);
    expect(waitTime).toBeLessThanOrEqual(200);
  });

  it('should respect maxBurst configuration', () => {
    const limiter = new RateLimiter({ requestsPerSecond: 5, maxBurst: 10 });

    // 初始应该有 10 个令牌（maxBurst）
    expect(limiter.getAvailableTokens()).toBe(10);

    // 连续 10 次应该都能立即获取
    for (let i = 0; i < 10; i++) {
      expect(limiter.tryAcquire()).toBe(true);
    }

    // 第 11 次应该失败
    expect(limiter.tryAcquire()).toBe(false);
  });

  it('should not exceed maxBurst when refilling', async () => {
    const limiter = new RateLimiter({ requestsPerSecond: 5, maxBurst: 5 });

    // 等待足够长时间
    vi.advanceTimersByTime(10000);

    // 令牌数不应超过 maxBurst
    expect(limiter.getAvailableTokens()).toBe(5);
  });

  it('should work with acquire() method', async () => {
    vi.useRealTimers(); // acquire 使用真实定时器测试

    const limiter = new RateLimiter({ requestsPerSecond: 10 });

    // 消耗所有令牌
    for (let i = 0; i < 10; i++) {
      await limiter.acquire();
    }

    // 下一次 acquire 应该需要等待
    const startTime = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - startTime;

    // 应该等待了大约 100ms（10 requests/second = 100ms per token）
    expect(elapsed).toBeGreaterThanOrEqual(50);
    expect(elapsed).toBeLessThan(200);
  });

  it('serializes concurrent acquire() instead of releasing them in one burst', async () => {
    vi.useRealTimers();

    // 1 个令牌、每 50ms 补 1 个
    const limiter = new RateLimiter({ requestsPerSecond: 20, maxBurst: 1 });
    await limiter.acquire(); // 耗掉初始令牌，桶置空

    const start = Date.now();
    // 并发发起 3 个 acquire
    await Promise.all([limiter.acquire(), limiter.acquire(), limiter.acquire()]);
    const elapsed = Date.now() - start;

    // 串行化后三者依次间隔 ~50ms 放行 → 总耗时 ~150ms。
    // 修复前它们会算出相同 waitTime、一起在 ~50ms 唤醒（burst）→ 总耗时仅 ~50ms。
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});
