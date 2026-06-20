/**
 * Playground 内部共享工具（日期默认值生成等，自 v1 移植并扩充）。
 */

/** 近 N 天日期范围（YYYYMMDD），用于 K 线 / 龙虎榜等接口的默认区间 */
export function recentRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

/** 昨天的 ISO 日期（YYYY-MM-DD） */
export function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 当前月份 + offset 的 YYMM（期权 / 期货合约月份默认值，如 '2607'） */
export function contractYYMM(offsetMonths: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return `${String(d.getFullYear() % 100).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 当前月份 + offset 的 YYYY-MM（ETF 期权到期日查询默认值） */
export function monthISO(offsetMonths: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
