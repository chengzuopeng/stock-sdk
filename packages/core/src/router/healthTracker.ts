import type { SdkErrorCode } from '../core/errors';
import type { CapabilityId, ProviderId, SourceHealthStats } from './types';

interface MutableHealthState {
  capability: CapabilityId;
  provider: ProviderId;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  cooldownUntil: number;
  totalDurationMs: number;
  lastErrorCode?: SdkErrorCode;
  lastFailureAt: number;
  lastSuccessAt: number;
}

const DEFAULT_FAILURE_THRESHOLD = 2;
const DEFAULT_COOLDOWN_MS = 60_000;

/**
 * 源级健康度追踪器（按 `capability::provider` 维度隔离）。
 *
 * 当某个源在特定能力上连续失败或触发 RATE_LIMITED 时进入冷却期，
 * 冷却期内路由器会将其自动沉底，优先把流量切到健康备用源，避免反复撞墙。
 */
export class SourceHealthTracker {
  private readonly states = new Map<string, MutableHealthState>();
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(options: { failureThreshold?: number; cooldownMs?: number } = {}) {
    this.failureThreshold = Math.max(1, options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD);
    this.cooldownMs = Math.max(0, options.cooldownMs ?? DEFAULT_COOLDOWN_MS);
  }

  private key(capability: CapabilityId, provider: ProviderId): string {
    return `${capability}::${provider}`;
  }

  private getOrCreate(capability: CapabilityId, provider: ProviderId): MutableHealthState {
    const k = this.key(capability, provider);
    let state = this.states.get(k);
    if (!state) {
      state = {
        capability,
        provider,
        successCount: 0,
        failureCount: 0,
        consecutiveFailures: 0,
        cooldownUntil: 0,
        totalDurationMs: 0,
        lastFailureAt: 0,
        lastSuccessAt: 0,
      };
      this.states.set(k, state);
    }
    return state;
  }

  /**
   * 判断该源在指定能力上当前是否处于冷却期。
   */
  isCooling(capability: CapabilityId, provider: ProviderId, now = Date.now()): boolean {
    const state = this.states.get(this.key(capability, provider));
    return state !== undefined && state.cooldownUntil > now;
  }

  /**
   * 获取冷却截止时间（0 表示未在冷却）。
   */
  getCooldownUntil(capability: CapabilityId, provider: ProviderId): number {
    return this.states.get(this.key(capability, provider))?.cooldownUntil ?? 0;
  }

  /**
   * 记录请求成功：清零连续失败并立即解除冷却。
   */
  recordSuccess(capability: CapabilityId, provider: ProviderId, durationMs: number): void {
    const state = this.getOrCreate(capability, provider);
    state.successCount += 1;
    state.consecutiveFailures = 0;
    state.cooldownUntil = 0;
    state.totalDurationMs += Math.max(0, durationMs);
    state.lastSuccessAt = Date.now();
    state.lastErrorCode = undefined;
  }

  /**
   * 记录请求失败：累计连续失败，达阈值（或命中频控）后进入冷却期。
   */
  recordFailure(
    capability: CapabilityId,
    provider: ProviderId,
    errorCode?: SdkErrorCode
  ): void {
    const state = this.getOrCreate(capability, provider);
    const now = Date.now();
    state.failureCount += 1;
    state.consecutiveFailures += 1;
    state.lastFailureAt = now;
    state.lastErrorCode = errorCode;

    if (
      this.cooldownMs > 0 &&
      (errorCode === 'RATE_LIMITED' || state.consecutiveFailures >= this.failureThreshold)
    ) {
      state.cooldownUntil = now + this.cooldownMs;
    }
  }

  /**
   * 返回当前全部或指定能力的健康状态快照。
   */
  getStats(capability?: CapabilityId): SourceHealthStats[] {
    const now = Date.now();
    const out: SourceHealthStats[] = [];
    for (const state of this.states.values()) {
      if (capability && state.capability !== capability) continue;
      out.push({
        capability: state.capability,
        provider: state.provider,
        successCount: state.successCount,
        failureCount: state.failureCount,
        consecutiveFailures: state.consecutiveFailures,
        cooldownUntil: state.cooldownUntil,
        isCooling: state.cooldownUntil > now,
        avgDurationMs:
          state.successCount > 0 ? Math.round(state.totalDurationMs / state.successCount) : 0,
        lastErrorCode: state.lastErrorCode,
        lastFailureAt: state.lastFailureAt,
        lastSuccessAt: state.lastSuccessAt,
      });
    }
    return out;
  }

  /**
   * 重置所有健康状态（常用于长驻进程手动复位或单测隔离）。
   */
  reset(): void {
    this.states.clear();
  }
}
