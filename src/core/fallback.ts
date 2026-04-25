import type { ProviderName } from './providerPolicy';
import {
  HttpError,
  getSdkErrorCode,
  type RequestError,
  type SdkErrorCode,
} from './errors';

interface HostHealthState {
  host: string;
  failureCount: number;
  successCount: number;
  cooldownUntil: number;
  lastFailureAt: number;
  lastErrorCode?: SdkErrorCode;
}

export interface HostHealthStats extends HostHealthState {}

const DEFAULT_COOLDOWN_MS = 30_000;
const DEFAULT_FAILURE_THRESHOLD = 1;

const EASTMONEY_PUSH2_HIS_HOSTS = [
  'push2his.eastmoney.com',
  '7.push2his.eastmoney.com',
  '33.push2his.eastmoney.com',
  '63.push2his.eastmoney.com',
  '91.push2his.eastmoney.com',
];

const EASTMONEY_PUSH2_HOSTS = [
  '17.push2.eastmoney.com',
  '29.push2.eastmoney.com',
  '79.push2.eastmoney.com',
  '91.push2.eastmoney.com',
];

function resolveHostPool(host: string, provider: ProviderName): string[] {
  if (provider !== 'eastmoney') {
    return [host];
  }

  if (host.includes('push2his.eastmoney.com')) {
    return EASTMONEY_PUSH2_HIS_HOSTS;
  }

  if (host.includes('push2.eastmoney.com')) {
    return EASTMONEY_PUSH2_HOSTS;
  }

  return [host];
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/**
 * Host fallback 管理器
 */
export class HostFallbackManager {
  private readonly states = new Map<string, HostHealthState>();

  constructor(
    private readonly cooldownMs: number = DEFAULT_COOLDOWN_MS,
    private readonly failureThreshold: number = DEFAULT_FAILURE_THRESHOLD
  ) {}

  /**
   * 生成可尝试的候选 URL 列表
   */
  getCandidateUrls(url: string, provider: ProviderName): string[] {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return [url];
    }

    const now = Date.now();
    const hostPool = resolveHostPool(parsedUrl.hostname, provider);

    if (hostPool.length <= 1) {
      return [url];
    }

    const healthyHosts = hostPool.filter((host) => {
      const state = this.states.get(host);
      return !state || state.cooldownUntil <= now;
    });

    const coolingHosts = hostPool.filter((host) => {
      const state = this.states.get(host);
      return state && state.cooldownUntil > now;
    });

    const orderedHosts = unique([
      parsedUrl.hostname,
      ...healthyHosts.filter((host) => host !== parsedUrl.hostname),
      ...coolingHosts.filter((host) => host !== parsedUrl.hostname),
    ]);

    return orderedHosts.map((host) => {
      const candidate = new URL(url);
      candidate.hostname = host;
      return candidate.toString();
    });
  }

  /**
   * 请求成功，重置 host 失败状态
   */
  recordSuccess(url: string): void {
    const host = this.safeGetHost(url);
    if (!host) {
      return;
    }

    const state = this.getState(host);
    state.failureCount = 0;
    state.cooldownUntil = 0;
    state.successCount++;
    state.lastErrorCode = undefined;
  }

  /**
   * 请求失败，记录 host 健康状态
   */
  recordFailure(url: string, error: RequestError): void {
    const host = this.safeGetHost(url);
    if (!host) {
      return;
    }

    const state = this.getState(host);
    state.failureCount++;
    state.lastFailureAt = Date.now();
    state.lastErrorCode = getSdkErrorCode(error);

    if (state.failureCount >= this.failureThreshold) {
      state.cooldownUntil = Date.now() + this.cooldownMs;
    }
  }

  /**
   * 判断错误是否值得切换到 fallback host
   */
  shouldFallback(error: RequestError): boolean {
    const code = getSdkErrorCode(error);

    if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') {
      return true;
    }

    if (error instanceof HttpError) {
      return error.status === 408 || error.status === 429 || error.status >= 500;
    }

    return false;
  }

  /**
   * 读取 host 健康状态
   */
  getStats(provider?: ProviderName): HostHealthStats[] {
    const stats = Array.from(this.states.values()).map((state) => ({ ...state }));

    if (!provider) {
      return stats;
    }

    const allowedHosts = new Set<string>();
    for (const host of [
      ...EASTMONEY_PUSH2_HIS_HOSTS,
      ...EASTMONEY_PUSH2_HOSTS,
    ]) {
      if (provider === 'eastmoney') {
        allowedHosts.add(host);
      }
    }

    return stats.filter((state) =>
      allowedHosts.size > 0 ? allowedHosts.has(state.host) : true
    );
  }

  private safeGetHost(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  private getState(host: string): HostHealthState {
    const cached = this.states.get(host);
    if (cached) {
      return cached;
    }

    const nextState: HostHealthState = {
      host,
      failureCount: 0,
      successCount: 0,
      cooldownUntil: 0,
      lastFailureAt: 0,
    };
    this.states.set(host, nextState);
    return nextState;
  }
}
