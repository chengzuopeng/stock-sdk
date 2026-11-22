import type { SdkErrorCode } from '../core/errors';
import type { ProviderName } from '../core/providerPolicy';

/**
 * 路由引擎支持的数据源标识（超集于双端 ProviderName，支持 Node 专属数据源与用户自定义源）。
 */
export type ProviderId =
  | ProviderName
  | 'xueqiu'
  | 'cninfo'
  | 'hkexnews'
  | 'cnbc'
  | 'nasdaq'
  | 'sec'
  | 'cls'
  | 'sse'
  | 'szse'
  | 'bse'
  | 'csindex'
  | 'jisilu'
  | 'ths'
  | (string & {});

/**
 * 标准化能力 ID。
 */
export type CapabilityId =
  | 'quotes.cn'
  | 'quotes.cnSimple'
  | 'quotes.hk'
  | 'quotes.us'
  | 'batch.cn'
  | 'batch.hk'
  | 'batch.us'
  | 'reference.dividendDetail'
  | 'kline.cn.history'
  | 'kline.cn.minute'
  | 'kline.hk.history'
  | 'kline.us.history'
  | 'financial.income'
  | 'financial.balance'
  | 'financial.cashflow'
  | 'financial.indicators'
  | 'financial.forecast'
  | 'financial.express'
  | 'news.flash'
  | 'news.stock'
  | 'news.announcements'
  | 'corporate.topHolders'
  | 'corporate.holderCount'
  | 'corporate.insiderTrading'
  | 'bond.convertibleSpot'
  | 'macro.cnIndicator'
  | (string & {});

/**
 * 单次路由调用的可选约束（默认零配置，全部可选）。
 */
export interface RouteOptions {
  /**
   * 逃生舱：强制指定单一数据源或自定义尝试优先级。
   * 传入单个 ProviderId 时仅尝试该源；传入数组时仅按给定顺序尝试列表内的源。
   */
  source?: ProviderId | readonly ProviderId[];
  /**
   * 数据完整性约束：要求选中的数据源必须保证提供所有指定字段（如 `['turnoverRate', 'amount']`）。
   */
  requiredFields?: readonly string[];
  /**
   * 当为 true 时（默认 true），跳过 `supports(input)` 返回 false 的源；
   * 仅用于极少数兼容场景下允许降级到不满足某项严格语义的源。
   */
  strictCapabilities?: boolean;
  /** 外部取消信号 */
  signal?: AbortSignal;
}

/**
 * 单次尝试记录。
 */
export interface RouteAttempt {
  provider: ProviderId;
  adapterId: string;
  durationMs: number;
  status: 'success' | 'failed' | 'skipped';
  skipReason?: 'unsupported_input' | 'missing_fields' | 'disabled' | 'not_in_allowlist';
  errorCode?: SdkErrorCode;
  errorMessage?: string;
}

/**
 * 完整路由追踪元数据（供 hooks / withMeta 溯源使用，不污染业务返回类型）。
 */
export interface RouteTrace {
  capability: CapabilityId;
  selectedProvider?: ProviderId;
  selectedAdapterId?: string;
  /** 是否发生了从默认首选源降级到备用源 */
  degraded: boolean;
  attempts: RouteAttempt[];
  totalDurationMs: number;
}

/**
 * 适配器执行上下文。
 */
export interface AdapterContext {
  /** 是否还有后续备用源可切（用于决定主源是否快速失败而非反复重试） */
  hasFallback: boolean;
  /** 当前是第几个尝试的合格源（0 表示首选） */
  attemptIndex: number;
  /** 外部取消信号 */
  signal?: AbortSignal;
}

/**
 * 标准数据源适配器契约。
 * 每个数据源独立实现该接口，禁止 Adapter 之间直接互相 import。
 */
export interface SourceAdapter<TInput = unknown, TOutput = unknown> {
  /** 唯一标识，如 `'eastmoney:kline.cn.history'` */
  readonly id: string;
  /** 所属能力 ID */
  readonly capability: CapabilityId;
  /** 数据源标识 */
  readonly provider: ProviderId;
  /** 基础静态优先级（数字越小越优先，例如 10 优先于 20） */
  readonly priority: number;
  /** 声明该适配器保证输出的字段集合（供 requiredFields 过滤） */
  readonly providedFields: ReadonlySet<string>;
  /**
   * 当该适配器返回合法空数组 `[]` 且仍有后续备用源时，是否顺带探测备用源。
   * 若备用源返回非空数组则采纳备用源；若备用源同样为空或全部失败，则安全回退返回本源的 `[]`（绝不向调用方误抛异常）。
   */
  readonly probeFallbackOnEmpty?: boolean;
  /**
   * 能力前置校验（纯函数）。
   * 返回 false 表示该数据源不支持当前输入条件（如新浪不支持 qfq/hfq 复权），路由器将跳过该源。
   */
  supports(input: TInput): boolean;
  /** 执行取数并归一化为统一 Schema */
  fetch(input: TInput, ctx: AdapterContext): Promise<TOutput>;
}

/**
 * 单条 `(capability, provider)` 健康度快照。
 */
export interface SourceHealthStats {
  capability: CapabilityId;
  provider: ProviderId;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  cooldownUntil: number;
  isCooling: boolean;
  avgDurationMs: number;
  lastErrorCode?: SdkErrorCode;
  lastFailureAt: number;
  lastSuccessAt: number;
}

/**
 * 全局路由策略配置。
 */
export interface SourceRouterOptions {
  /** 全局强制数据源或白名单优先级（当单次调用未传 RouteOptions.source 时生效，便于 CLI `--source` 全局控制） */
  forcedSource?: ProviderId | readonly ProviderId[];
  /** 按能力覆盖默认数据源优先级 */
  preferredSources?: Partial<Record<CapabilityId, readonly ProviderId[]>>;
  /** 全局禁用的数据源名单 */
  disabledProviders?: readonly ProviderId[];
  /** 连续失败触发冷却的阈值，默认 2（RATE_LIMITED 会立即触发冷却） */
  failureThreshold?: number;
  /** 源级冷却时长（毫秒），默认 60_000 */
  cooldownMs?: number;
  /** 路由完成后的可观测性钩子 */
  onRoute?: (trace: RouteTrace) => void;
}
