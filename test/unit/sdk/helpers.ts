/**
 * sdk 层测试共享 fixture：完整 HistoryKline 行构造（14 字段单一来源，
 * 字段增删只改这里；perf-request 与 klineSignals 此前各自内联同一形状）。
 */
import type { HistoryKline } from '../../../src/types';

export function makeHistoryKline(
  date: string,
  close: number,
  overrides: Partial<HistoryKline> = {}
): HistoryKline {
  return {
    date,
    timestamp: Date.parse(`${date}T00:00:00+08:00`),
    tz: 'Asia/Shanghai',
    code: '600519',
    open: close,
    close,
    high: close + 1,
    low: close - 1,
    volume: 1000,
    amount: 100000,
    amplitude: 1,
    changePercent: 0,
    change: 0,
    turnoverRate: 1,
    ...overrides,
  };
}

/** 以 UTC 日历做整天位移的 ISO 日期（测试用，不处理时区语义） */
export function shiftDateISO(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}
