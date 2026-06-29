/**
 * 工具函数
 */
import { InvalidArgumentError } from './errors';

const KLINE_PERIODS = new Set(['daily', 'weekly', 'monthly']);
const MINUTE_PERIODS = new Set(['1', '5', '15', '30', '60']);
const ADJUST_TYPES = new Set(['', 'qfq', 'hfq']);
const SPECIAL_INDEX_MARKET_CODE_MAP: Record<string, string> = {
  H30533: '2',
  H11136: '2',
  HSHCI: '124',
  GDAXI: '100',
  '932000': '2',
  '930955': '2',
};

export function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new InvalidArgumentError(`${name} must be a positive integer`, {
      argument: name,
      value,
    });
  }
}

export function assertKlinePeriod(
  period: string
): asserts period is 'daily' | 'weekly' | 'monthly' {
  if (!KLINE_PERIODS.has(period)) {
    throw new InvalidArgumentError(
      'period must be one of: daily, weekly, monthly',
      { argument: 'period', value: period }
    );
  }
}

export function assertMinutePeriod(
  period: string
): asserts period is '1' | '5' | '15' | '30' | '60' {
  if (!MINUTE_PERIODS.has(period)) {
    throw new InvalidArgumentError('period must be one of: 1, 5, 15, 30, 60', {
      argument: 'period',
      value: period,
    });
  }
}

export function assertAdjustType(
  adjust: string
): asserts adjust is '' | 'qfq' | 'hfq' {
  if (!ADJUST_TYPES.has(adjust)) {
    throw new InvalidArgumentError("adjust must be one of: '', 'qfq', 'hfq'", {
      argument: 'adjust',
      value: adjust,
    });
  }
}

/**
 * 校验北向资金方向参数。
 * TS 类型只防编译期；MCP/CLI 等运行时入口可传任意字符串，此前非 'south' 的
 * 垃圾值会被静默当作 'north' 返回错误方向的数据。
 */
export function assertNorthboundDirection(
  direction: string
): asserts direction is 'north' | 'south' {
  if (direction !== 'north' && direction !== 'south') {
    throw new InvalidArgumentError("direction must be one of: 'north', 'south'", {
      argument: 'direction',
      value: direction,
    });
  }
}

/**
 * 将数组分割成指定大小的块
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  assertPositiveInteger(chunkSize, 'chunkSize');
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 并发控制执行异步任务
 * @param tasks 任务函数数组
 * @param concurrency 最大并发数
 */
export async function asyncPool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  preserveOrder = false
): Promise<T[]> {
  assertPositiveInteger(concurrency, 'concurrency');
  if (tasks.length === 0) {
    return [];
  }

  const results = preserveOrder ? new Array<T>(tasks.length) : [];
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    async () => {
      while (true) {
        const currentIndex = nextIndex++;
        if (currentIndex >= tasks.length) {
          return;
        }
        const result = await tasks[currentIndex]();
        if (preserveOrder) {
          results[currentIndex] = result;
        } else {
          results.push(result);
        }
      }
    }
  );

  await Promise.all(workers);
  return results;
}

/**
 * 根据股票代码获取东方财富市场代码
 * 支持带前缀(sh/sz/bj)或纯代码
 */
export function getMarketCode(symbol: string): string {
  const normalizedSymbol = symbol.toLowerCase();
  const pureSymbol = normalizedSymbol.replace(/^(sh|sz|bj)/i, '').toUpperCase();
  const specialMarketCode = SPECIAL_INDEX_MARKET_CODE_MAP[pureSymbol];
  if (specialMarketCode) {
    return specialMarketCode;
  }

  // 如果有前缀，直接根据前缀判断
  if (normalizedSymbol.startsWith('sh')) return '1';
  if (normalizedSymbol.startsWith('sz') || normalizedSymbol.startsWith('bj')) return '0';
  // 纯代码（按首位字符判断）：
  //   上海(1): 6 开头（主板/科创板）、5 开头（场内 ETF/LOF/封基）、9 开头（B 股）
  //   深圳/北交所(0): 0/3 开头（深圳主板/创业板）、4/8 开头（北交所）
  //   1 开头（深圳 ETF 159xxx / LOF 16xxxx 等）建议带 sz 前缀以避免歧义
  const first = normalizedSymbol[0];
  return first === '6' || first === '5' || first === '9' ? '1' : '0';
}

/**
 * 获取 K 线周期代码
 */
export function getPeriodCode(period: 'daily' | 'weekly' | 'monthly'): string {
  const periodMap = { daily: '101', weekly: '102', monthly: '103' } as const;
  return periodMap[period];
}

/**
 * 获取复权类型代码
 */
export function getAdjustCode(adjust: '' | 'qfq' | 'hfq'): string {
  const adjustMap = { '': '0', qfq: '1', hfq: '2' } as const;
  return adjustMap[adjust];
}
