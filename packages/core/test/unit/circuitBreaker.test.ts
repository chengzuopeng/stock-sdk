/**
 * 熔断器单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, CircuitBreakerError } from '../../src/core/circuitBreaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start in CLOSED state', () => {
    const breaker = new CircuitBreaker();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.canRequest()).toBe(true);
  });

  it('should open after reaching failure threshold', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');

    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');

    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canRequest()).toBe(false);
  });

  it('should transition to HALF_OPEN after resetTimeout', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 5000
    });

    // 触发熔断
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    // 等待 5 秒
    vi.advanceTimersByTime(5000);

    expect(breaker.getState()).toBe('HALF_OPEN');
    expect(breaker.canRequest()).toBe(true);
  });

  it('should close after successful probe in HALF_OPEN', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 1000,
      halfOpenRequests: 1
    });

    // 触发熔断
    breaker.recordFailure();
    breaker.recordFailure();

    // 等待进入 HALF_OPEN
    vi.advanceTimersByTime(1000);
    expect(breaker.getState()).toBe('HALF_OPEN');

    // 探测成功
    breaker.recordSuccess();
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should reopen after failed probe in HALF_OPEN', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 1000
    });

    // 触发熔断
    breaker.recordFailure();
    breaker.recordFailure();

    // 等待进入 HALF_OPEN
    vi.advanceTimersByTime(1000);
    expect(breaker.getState()).toBe('HALF_OPEN');

    // 探测失败
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
  });

  it('should reset failure count on success in CLOSED state', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess(); // 重置计数

    // 再次失败 2 次不应该触发熔断
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('CLOSED');

    // 第 3 次失败触发熔断
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');
  });

  it('should call onStateChange callback', () => {
    const onStateChange = vi.fn();
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 1000,
      onStateChange
    });

    breaker.recordFailure();
    breaker.recordFailure();

    expect(onStateChange).toHaveBeenCalledWith('CLOSED', 'OPEN');

    vi.advanceTimersByTime(1000);
    breaker.getState(); // 触发状态检查

    expect(onStateChange).toHaveBeenCalledWith('OPEN', 'HALF_OPEN');
  });

  it('should execute function and record result', async () => {
    vi.useRealTimers();

    const breaker = new CircuitBreaker({ failureThreshold: 2 });

    // 成功执行
    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');

    // 失败执行
    await expect(breaker.execute(async () => {
      throw new Error('test error');
    })).rejects.toThrow('test error');

    expect(breaker.getStats().failureCount).toBe(1);
  });

  it('should throw CircuitBreakerError when OPEN', async () => {
    vi.useRealTimers();

    const breaker = new CircuitBreaker({ failureThreshold: 1 });

    // 触发熔断
    await expect(breaker.execute(async () => {
      throw new Error('test');
    })).rejects.toThrow();

    // 熔断状态下应该抛出 CircuitBreakerError
    await expect(breaker.execute(async () => 'should not run'))
      .rejects.toThrow(CircuitBreakerError);
  });

  it('should reset manually', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2 });

    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState()).toBe('OPEN');

    breaker.reset();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.getStats().failureCount).toBe(0);
  });
});
