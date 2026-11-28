import {
  AbortedError,
  SdkError,
  UpstreamError,
  getSdkErrorCode,
  type SdkErrorCode,
} from '../core/errors';
import { raceWithAbort } from '../core/abort';
import { SourceHealthTracker } from './healthTracker';
import type {
  CapabilityId,
  ProviderId,
  RouteAttempt,
  RouteOptions,
  RouteTrace,
  SourceAdapter,
  SourceHealthStats,
  SourceRouterOptions,
} from './types';

/**
 * 触发多源降级切换的可恢复上游错误码。
 * 确定性参数/标的错误（INVALID_SYMBOL / INVALID_ARGUMENT / ABORTED / NOT_FOUND）不切源、不降权。
 */
const FALLBACK_ERROR_CODES: ReadonlySet<SdkErrorCode> = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'HTTP_ERROR',
  'RATE_LIMITED',
  'CIRCUIT_OPEN',
  'UPSTREAM_EMPTY',
  'UPSTREAM_ERROR',
  'PARSE_ERROR',
]);

/**
 * 判断错误是否可触发向下一个候选源降级。
 */
export function isFallbackableError(error: unknown): boolean {
  const code = getSdkErrorCode(error);
  return code !== undefined && FALLBACK_ERROR_CODES.has(code);
}

function validateRequiredFields(
  output: unknown,
  requiredFields: readonly string[] | undefined,
  provider: ProviderId
): void {
  if (!requiredFields?.length) return;
  const rows = Array.isArray(output) ? output : [output];
  for (const [rowIndex, row] of rows.entries()) {
    const missingFields = requiredFields.filter((field) => {
      if (!row || typeof row !== 'object' || !Object.prototype.hasOwnProperty.call(row, field)) {
        return true;
      }
      const value: unknown = (row as Record<string, unknown>)[field];
      return value == null ||
        (typeof value === 'number' && !Number.isFinite(value)) ||
        (typeof value === 'string' && !value.trim());
    });
    if (missingFields.length) {
      throw new UpstreamError(`Missing required fields: ${missingFields.join(', ')}`, undefined, undefined, {
        provider,
        rowIndex,
        missingFields,
      });
    }
  }
}

/**
 * 能力驱动的多源路由引擎。
 *
 * 核心职责：
 * 1. 管理按 `CapabilityId` 注册的多个数据源适配器（Adapter 之间完全解耦）；
 * 2. 根据本次请求的 `input`、`requiredFields`、`source` 过滤掉不具备能力的源，防止静默口径漂移；
 * 3. 结合 `SourceHealthTracker` 动态把冷却中的故障源沉底，提升批量请求吞吐与稳定性；
 * 4. 产出结构化 `RouteTrace` 供可观测性钩子与 `withMeta()` 溯源使用，不污染业务返回数据结构。
 */
export class SourceRouter {
  private readonly adaptersByCapability = new Map<CapabilityId, SourceAdapter<unknown, unknown>[]>();
  private readonly health: SourceHealthTracker;
  private readonly forcedSource?: ProviderId | readonly ProviderId[];
  private readonly preferredSources: Partial<Record<CapabilityId, readonly ProviderId[]>>;
  private readonly disabledProviders: ReadonlySet<ProviderId>;
  private readonly onRouteHooks: Array<(trace: RouteTrace) => void> = [];

  constructor(options: SourceRouterOptions = {}) {
    this.health = new SourceHealthTracker({
      failureThreshold: options.failureThreshold,
      cooldownMs: options.cooldownMs,
    });
    this.forcedSource = options.forcedSource;
    this.preferredSources = options.preferredSources ?? {};
    this.disabledProviders = new Set(options.disabledProviders ?? []);
    if (options.onRoute) {
      this.onRouteHooks.push(options.onRoute);
    }
  }

  /**
   * 注册一个数据源适配器；同 `id` 重复注册时替换旧适配器（方便用户覆写默认实现）。
   */
  register<TInput, TOutput>(adapter: SourceAdapter<TInput, TOutput>): this {
    const list = this.adaptersByCapability.get(adapter.capability) ?? [];
    const idx = list.findIndex((item) => item.id === adapter.id);
    const typed = adapter as SourceAdapter<unknown, unknown>;
    if (idx >= 0) {
      list[idx] = typed;
    } else {
      list.push(typed);
    }
    this.adaptersByCapability.set(adapter.capability, list);
    return this;
  }

  /**
   * 批量注册多个数据源适配器。
   */
  registerAll(adapters: ReadonlyArray<SourceAdapter<unknown, unknown>>): this {
    for (const adapter of adapters) {
      this.register(adapter);
    }
    return this;
  }

  /**
   * 订阅路由追踪事件（支持 `withMeta()` 等临时上下文监听器），返回取消订阅函数。
   */
  addRouteListener(listener: (trace: RouteTrace) => void): () => void {
    this.onRouteHooks.push(listener);
    return () => {
      const idx = this.onRouteHooks.indexOf(listener);
      if (idx >= 0) this.onRouteHooks.splice(idx, 1);
    };
  }

  /**
   * 列出指定能力已注册的适配器（按基础优先级排序）。
   */
  getAdapters(capability: CapabilityId): ReadonlyArray<SourceAdapter<unknown, unknown>> {
    return [...(this.adaptersByCapability.get(capability) ?? [])].sort(
      (a, b) => a.priority - b.priority
    );
  }

  /**
   * 读取健康度统计快照。
   */
  getHealthStats(capability?: CapabilityId): SourceHealthStats[] {
    return this.health.getStats(capability);
  }

  /**
   * 重置所有源级健康状态。
   */
  resetHealth(): void {
    this.health.reset();
  }

  /**
   * 手动触发一次路由追踪事件（供外层持久化缓存命中时回放溯源信息，保证 `withMeta()` 一致性）。
   */
  notifyCachedRoute(trace: RouteTrace): void {
    this.emitTrace(trace);
  }

  /** 缓存键使用实际生效的来源过滤和偏好，避免跨路由策略复用结果。 */
  getCacheScope(capability: CapabilityId, options: RouteOptions = {}): string {
    const source = options.source ?? this.forcedSource;
    return JSON.stringify([
      source ?? null,
      source === undefined ? [...this.disabledProviders].sort() : [],
      source === undefined ? this.preferredSources[capability] ?? [] : [],
      options.strictCapabilities !== false,
    ]);
  }

  private emitTrace(trace: RouteTrace, onTrace?: (trace: RouteTrace) => void): void {
    const hooks = onTrace ? [onTrace, ...this.onRouteHooks] : this.onRouteHooks;
    for (const hook of hooks) {
      try {
        hook(trace);
      } catch {
        // 钩子异常不中断主流程
      }
    }
  }

  /**
   * 路由并执行一次标准能力请求。
   */
  async execute<TInput, TOutput>(
    capability: CapabilityId,
    input: TInput,
    options: RouteOptions = {},
    onTrace?: (trace: RouteTrace) => void
  ): Promise<TOutput> {
    const startedAt = Date.now();
    const registered = this.adaptersByCapability.get(capability) ?? [];
    const attempts: RouteAttempt[] = [];
    const strict = options.strictCapabilities !== false;
    const { signal } = options;
    const notify = (trace: RouteTrace) => this.emitTrace(trace, onTrace);
    if (signal?.aborted) {
      notify({ capability, degraded: false, attempts, totalDurationMs: 0 });
      throw new AbortedError();
    }

    const effectiveSource = options.source ?? this.forcedSource;
    const explicitList: readonly ProviderId[] | undefined =
      effectiveSource === undefined
        ? undefined
        : Array.isArray(effectiveSource)
          ? effectiveSource
          : [effectiveSource];
    const explicitSet = explicitList ? new Set(explicitList) : undefined;

    // 1. 能力与约束过滤
    const qualified: SourceAdapter<TInput, TOutput>[] = [];
    for (const raw of registered) {
      const adapter = raw as SourceAdapter<TInput, TOutput>;
      if (explicitSet && !explicitSet.has(adapter.provider)) {
        attempts.push({
          provider: adapter.provider,
          adapterId: adapter.id,
          durationMs: 0,
          status: 'skipped',
          skipReason: 'not_in_allowlist',
        });
        continue;
      }
      if (!explicitSet && this.disabledProviders.has(adapter.provider)) {
        attempts.push({
          provider: adapter.provider,
          adapterId: adapter.id,
          durationMs: 0,
          status: 'skipped',
          skipReason: 'disabled',
        });
        continue;
      }
      if (options.requiredFields && options.requiredFields.length > 0) {
        const missing = options.requiredFields.some((f) => !adapter.providedFields.has(f));
        if (missing) {
          attempts.push({
            provider: adapter.provider,
            adapterId: adapter.id,
            durationMs: 0,
            status: 'skipped',
            skipReason: 'missing_fields',
          });
          continue;
        }
      }
      if (strict && !adapter.supports(input)) {
        attempts.push({
          provider: adapter.provider,
          adapterId: adapter.id,
          durationMs: 0,
          status: 'skipped',
          skipReason: 'unsupported_input',
        });
        continue;
      }
      qualified.push(adapter);
    }

    if (qualified.length === 0) {
      const trace: RouteTrace = {
        capability,
        degraded: false,
        attempts,
        totalDurationMs: Date.now() - startedAt,
      };
      notify(trace);
      throw new SdkError({
        code: 'INVALID_ARGUMENT',
        message: `No qualified data source available for capability "${capability}"`,
        details: {
          capability,
          source: options.source,
          requiredFields: options.requiredFields,
          attempts,
        },
      });
    }

    // 2. 确定基础偏好顺序：单次 source 列表 > 全局 preferredSources > 静态 priority
    const preferenceOrder = explicitList ?? this.preferredSources[capability];
    const rankOf = (adapter: SourceAdapter<TInput, TOutput>): number => {
      if (preferenceOrder) {
        const idx = preferenceOrder.indexOf(adapter.provider);
        if (idx >= 0) return idx;
        return preferenceOrder.length + adapter.priority;
      }
      return adapter.priority;
    };

    const byBaseRank = [...qualified].sort((a, b) => rankOf(a) - rankOf(b));
    const defaultPrimaryId = byBaseRank[0].id;

    // 3. 叠加动态健康状态：健康源排前，冷却中源按最早到期时间沉底兜底
    const now = Date.now();
    const healthy = byBaseRank.filter(
      (a) => !this.health.isCooling(capability, a.provider, now)
    );
    const cooling = byBaseRank
      .filter((a) => this.health.isCooling(capability, a.provider, now))
      .sort(
        (a, b) =>
          this.health.getCooldownUntil(capability, a.provider) -
          this.health.getCooldownUntil(capability, b.provider)
      );
    const ordered = [...healthy, ...cooling];

    // 4. 按序执行与容错切换
    let primaryError: unknown;
    let softEmptyFallback:
      | { output: TOutput; provider: ProviderId; adapterId: string }
      | undefined;
    for (let i = 0; i < ordered.length; i++) {
      const adapter = ordered[i];
      const hasFallback = i < ordered.length - 1;
      const attemptStart = Date.now();
      try {
        signal?.throwIfAborted();
        const output = await raceWithAbort(signal, adapter.fetch(input, {
          hasFallback,
          attemptIndex: i,
          signal,
          strictCapabilities: strict,
        }));
        signal?.throwIfAborted();
        validateRequiredFields(output, options.requiredFields, adapter.provider);
        const durationMs = Date.now() - attemptStart;
        this.health.recordSuccess(capability, adapter.provider, durationMs);
        attempts.push({
          provider: adapter.provider,
          adapterId: adapter.id,
          durationMs,
          status: 'success',
        });

        // 软空集探测：如东财 datacenter 对软限流与真实无记录均返回空数组，
        // 允许在不惩罚主源健康度的前提下顺带问询备源；若备源有数据则采纳，否则安全回退 []。
        if (
          adapter.probeFallbackOnEmpty &&
          Array.isArray(output) &&
          output.length === 0
        ) {
          if (!softEmptyFallback) {
            softEmptyFallback = {
              output,
              provider: adapter.provider,
              adapterId: adapter.id,
            };
          }
          if (hasFallback) {
            continue;
          }
          notify({
            capability,
            selectedProvider: softEmptyFallback.provider,
            selectedAdapterId: softEmptyFallback.adapterId,
            degraded: softEmptyFallback.adapterId !== defaultPrimaryId,
            attempts,
            totalDurationMs: Date.now() - startedAt,
          });
          return softEmptyFallback.output;
        }

        notify({
          capability,
          selectedProvider: adapter.provider,
          selectedAdapterId: adapter.id,
          degraded: adapter.id !== defaultPrimaryId,
          attempts,
          totalDurationMs: Date.now() - startedAt,
        });
        return output;
      } catch (cause) {
        const error = signal?.aborted && getSdkErrorCode(cause) !== 'ABORTED'
          ? new AbortedError()
          : cause;
        const durationMs = Date.now() - attemptStart;
        const code = getSdkErrorCode(error);
        const message = error instanceof Error ? error.message : String(error);
        attempts.push({
          provider: adapter.provider,
          adapterId: adapter.id,
          durationMs,
          status: 'failed',
          errorCode: code,
          errorMessage: message,
        });

        if (primaryError === undefined) {
          primaryError = error;
        }

        // 确定性错误（参数错误/非法代码/外部取消）不切源、不惩罚源健康度
        if (!isFallbackableError(error)) {
          notify({
            capability,
            degraded: false,
            attempts,
            totalDurationMs: Date.now() - startedAt,
          });
          throw error;
        }

        this.health.recordFailure(capability, adapter.provider, code);
      }
    }

    if (softEmptyFallback) {
      notify({
        capability,
        selectedProvider: softEmptyFallback.provider,
        selectedAdapterId: softEmptyFallback.adapterId,
        degraded: softEmptyFallback.adapterId !== defaultPrimaryId,
        attempts,
        totalDurationMs: Date.now() - startedAt,
      });
      return softEmptyFallback.output;
    }

    const trace: RouteTrace = {
      capability,
      degraded: false,
      attempts,
      totalDurationMs: Date.now() - startedAt,
    };
    notify(trace);

    // 所有候选源均失败：保留主错误（便于调用方按原错误码分类），同时在 details 上补充完整路由链路
    if (primaryError instanceof SdkError) {
      Reflect.set(primaryError, 'details', {
        ...(primaryError.details ?? {}),
        routeAttempts: attempts,
      });
    }
    throw primaryError;
  }
}
