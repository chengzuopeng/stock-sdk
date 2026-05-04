/**
 * Playground 内部共享工具
 */

/**
 * 计算近 30 天的默认日期范围（YYYYMMDD 格式），用于不能直接使用 ISO 格式的场景
 * （如直接拼到 SDK 调用代码示例中保持惯例）。
 */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const fmt = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  return { startDate: fmt(start), endDate: fmt(end) };
}

/**
 * 同上，但返回 ISO 格式（YYYY-MM-DD），用于 `<input type="date">` 的默认值。
 */
export function getDefaultDateRangeISO(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  const fmt = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return { startDate: fmt(start), endDate: fmt(end) };
}

// ============================================================
// JS 代码片段生成辅助（用于 spec.code 函数）
// ============================================================

/** 把字符串包成单引号字面量，单引号会被转义。 */
export function jsStr(s: string | undefined | null): string {
  if (s === undefined || s === null) return "''";
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** 把逗号分隔字符串转为 JS 数组字面量，如 "a,b" → "['a', 'b']" */
export function jsCsvArray(input: string | undefined): string {
  if (!input) return '[]';
  const items = input.split(',').map((s) => s.trim()).filter(Boolean);
  return `[${items.map(jsStr).join(', ')}]`;
}

/**
 * 把 ISO 日期 (YYYY-MM-DD) 转成紧凑格式 (YYYYMMDD)。
 *
 * 用于 K 线 / 板块 K 线 / 期货 K 线等接口：这些 API 把 startDate/endDate
 * 直接当作 `beg`/`end` 透传到东方财富，服务端只接受 YYYYMMDD 格式。
 *
 * - 已经是 8 位数字 → 原样返回
 * - 任何其他格式 → 原样返回（datacenter 系接口有自己的归一化逻辑）
 * - 空值 → undefined
 */
export function toCompactDate(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  const trimmed = String(input).trim();
  if (!trimmed) return undefined;
  if (/^\d{8}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.replace(/-/g, '');
  return trimmed;
}

/**
 * 渲染对象字面量，自动跳过 undefined / 空字符串字段。
 * 用于动态构造 `getXxx(symbol, { period: 'daily', adjust: 'qfq' })` 这种 options。
 *
 * `quotedKeys` 中的 key 输出为字符串字面量，其余为原始值（数字、true 等）。
 */
export function jsObject(obj: Record<string, unknown>, quotedKeys?: Set<string>): string {
  const entries: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    const valueLiteral =
      quotedKeys && !quotedKeys.has(k)
        ? String(v)
        : jsStr(String(v));
    entries.push(`${k}: ${valueLiteral}`);
  }
  if (entries.length === 0) return '{}';
  return `{ ${entries.join(', ')} }`;
}


/**
 * 把逗号分隔的代码字符串切成数组并去重去空。
 */
export function splitCsvCodes(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * K 线 / 复权 / 周期 等共享 select options，避免在每个 spec 里重复定义。
 */
export const KLINE_PERIOD_OPTIONS = [
  { value: 'daily', label: '日线' },
  { value: 'weekly', label: '周线' },
  { value: 'monthly', label: '月线' },
];

export const ADJUST_OPTIONS = [
  { value: '', label: '不复权' },
  { value: 'qfq', label: '前复权' },
  { value: 'hfq', label: '后复权' },
];

export const A_SHARE_MARKET_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'sh', label: '上交所 (6开头)' },
  { value: 'sz', label: '深交所 (0/3开头)' },
  { value: 'bj', label: '北交所 (92开头)' },
  { value: 'kc', label: '科创板 (688开头)' },
  { value: 'cy', label: '创业板 (30开头)' },
];

export const US_MARKET_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'NASDAQ', label: '纳斯达克 (105)' },
  { value: 'NYSE', label: '纽交所 (106)' },
  { value: 'AMEX', label: '美交所 (107)' },
];

export const FUND_FLOW_INDICATOR_OPTIONS = [
  { value: 'today', label: '今日' },
  { value: '3day', label: '3 日' },
  { value: '5day', label: '5 日' },
  { value: '10day', label: '10 日' },
];

export const SECTOR_TYPE_OPTIONS = [
  { value: 'industry', label: '行业' },
  { value: 'concept', label: '概念' },
  { value: 'region', label: '地域' },
];

export const NORTHBOUND_DIRECTION_OPTIONS = [
  { value: 'north', label: '北向' },
  { value: 'south', label: '南向' },
];

export const NORTHBOUND_RANK_PERIOD_OPTIONS = [
  { value: 'today', label: '今日' },
  { value: '3day', label: '3 日' },
  { value: '5day', label: '5 日' },
  { value: '10day', label: '10 日' },
  { value: 'month', label: '月排行' },
  { value: 'quarter', label: '季排行' },
  { value: 'year', label: '年排行' },
];

export const DRAGON_TIGER_PERIOD_OPTIONS = [
  { value: '1month', label: '近一月' },
  { value: '3month', label: '近三月' },
  { value: '6month', label: '近六月' },
  { value: '1year', label: '近一年' },
];
