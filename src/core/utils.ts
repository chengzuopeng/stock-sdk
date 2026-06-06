/**
 * 工具函数
 */
import { InvalidArgumentError } from './errors';

const KLINE_PERIODS = new Set(['daily', 'weekly', 'monthly']);
const MINUTE_PERIODS = new Set(['1', '5', '15', '30', '60']);
const ADJUST_TYPES = new Set(['', 'qfq', 'hfq']);

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
