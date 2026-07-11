/**
 * 东方财富 - 通用工具函数
 */
import { RequestClient, addDays, asyncPool } from '../../core';

/** {@link fetchPagesInWaves} 单页取数结果。 */
export interface WavePage<T> {
  value: T;
  /**
   * 本页是"终止页"（如 clist 短页 = 已到结尾）：保留本页内容，
   * 但其后所有页不再请求 / 不再采信。
   */
  terminal?: boolean;
}

/**
 * 波次并发翻页（R7-14，datacenter / fetchPaginatedData / fetchClistAllPages 共用）。
 *
 * 首页由调用方串行探明总页数后，其余页按 concurrency 一波波并发拉取。
 * 语义与串行 break 对齐 —— fetchPage 返回 null（坏页/空页）时丢弃该页
 * 及其后所有内容并停止调度后续波，结果恒为**连续前缀**：时序数据不会
 * 出现中部静默空洞，跨页行号（rank/index 契约）与串行完全一致。
 * 单波内已发出的请求无法取消，请求浪费上限 = 并发数 - 1 页
 * （对齐 F7 的请求放大防护思路；futuresGlobal 因 F7 钉死用例不并行化）。
 *
 * ⚠️ 默认部署无 RateLimiter（仅用户显式配置时创建），并发直接打上游，
 * 因此默认并发取保守值；已按 request-governance 示例配置限速的用户，
 * 墙钟收益受限速地板约束。
 */
export async function fetchPagesInWaves<T>(
  firstPage: number,
  lastPage: number,
  concurrency: number,
  fetchPage: (page: number) => Promise<WavePage<T> | null>
): Promise<T[]> {
  const out: T[] = [];
  const width = Math.max(1, concurrency);
  for (let start = firstPage; start <= lastPage; start += width) {
    const pages: number[] = [];
    for (let p = start; p <= Math.min(start + width - 1, lastPage); p++) {
      pages.push(p);
    }
    const wave = await asyncPool(
      pages.map((p) => () => fetchPage(p)),
      width,
      true
    );
    for (const page of wave) {
      if (page === null) {
        return out; // 坏页：前缀截断（与串行 break 一致）
      }
      out.push(page.value);
      if (page.terminal) {
        return out; // 终止页：保留本页，其后丢弃
      }
    }
  }
  return out;
}

/**
 * 把 YYYYMMDD 转为 YYYY-MM-DD（datacenter filter 要求横线格式）。
 * 其它格式原样返回。dragonTiger/blockTrade/northbound/futuresInventory 共用：
 * CLI help 文档的日期格式是 YYYYMMDD，若不归一直接插进
 * `(TRADE_DATE>='...')` 过滤式，字典序比较会把所有行排除（静默空结果）。
 */
export function toIsoDate(date: string): string {
  if (/^\d{8}$/.test(date)) {
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  }
  return date;
}

/**
 * 把分钟K线的 startDate/endDate 归一成可与行时间（'YYYY-MM-DD HH:mm'）
 * 做字符串比较的窗口：
 * - 'YYYYMMDD'（8 位）补横线 —— 否则 '20250601' 在 index 4 处 '0' > '-'，
 *   会把所有行整天误过滤成空结果
 * - 仅日期（10 位）的 end 补 ' 23:59' —— 否则 'YYYY-MM-DD HH:mm' > 'YYYY-MM-DD'
 *   同样整天误过滤
 * - 'YYYY-MM-DDTHH:mm' 的 'T' 归一为空格，并截到分钟精度
 */
export function normalizeMinuteWindow(
  startDate: string,
  endDate: string
): { start: string; end: string } {
  // 8 位转横线复用 toIsoDate(P3-13:同文件此前内联了一份逐字相同的转换)
  const norm = (v: string): string =>
    toIsoDate(v.replace('T', ' ').trim()).slice(0, 16);
  const start = norm(startDate);
  let end = norm(endDate);
  if (end.length === 10) end += ' 23:59';
  return { start, end };
}

/**
 * F34:把分钟K线(5/15/30/60)的 startDate/endDate【日期部分】下推为
 * kline/get 端点的 beg/end(YYYYMMDD),让服务端先按天裁剪。
 *
 * 此前该分支硬编码 `beg=0&end=20500000` 全量下载数年分钟历史(查 1 天也要
 * 拉数百 KB,并对每行跑 CSV 解析 + 时间换算)再本地丢弃;同端点的日 K 路径
 * (getHistoryKline)已证明 beg/end 可做服务端裁剪。
 *
 * - 兼容 'YYYY-MM-DD HH:mm' / 'YYYY-MM-DDTHH:mm' / 'YYYY-MM-DD' / 'YYYYMMDD'
 *   等形式:仅提取日期部分并去横线
 * - 未传或无法识别的格式保留全量窗口('0' / '20500000'),与历史行为一致
 * - 这里只做"天"级裁剪(服务端窗口必须是目标数据的超集),
 *   HH:mm 精度仍由调用方的 normalizeMinuteWindow 本地过滤保证
 * - `endExtraDays`:上游 beg/end 按【北京时间】日期裁剪,而 startDate/endDate
 *   语义是市场本地时区。美股(UTC-4/-5)的下午盘对应北京时间次日凌晨,
 *   end 若取本地日期当天会把这些行裁掉,故美股调用方需传 1(详见 usKline.ts);
 *   beg 无此问题 —— 北京时间恒早于/等于西半球本地时间,本地日期 D 的行
 *   其北京日期只会 >= D,beg=D 不会漏数据
 */
export function resolveMinuteBegEnd(
  startDate: string | undefined,
  endDate: string | undefined,
  endExtraDays = 0
): { beg: string; end: string } {
  const toCompactDay = (value?: string): string | undefined => {
    if (!value) return undefined;
    const m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(value.trim());
    return m ? `${m[1]}${m[2]}${m[3]}` : undefined;
  };

  const beg = toCompactDay(startDate) ?? '0';
  let end = toCompactDay(endDate);
  if (end !== undefined && endExtraDays > 0) {
    // 日历日加法收编到 core/time.addDays(P3-13:此前与 indicatorService 各持一份)
    end = addDays(
      `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`,
      endExtraDays
    ).replace(/-/g, '');
  }
  return { beg, end: end ?? '20500000' };
}

/**
 * 分页获取数据
 * @param client 请求客户端
 * @param baseUrl 基础 URL
 * @param baseParams 基础参数
 * @param fieldsStr 字段字符串
 * @param pageSize 每页数量
 * @param dataMapper 数据映射函数
 */
export async function fetchPaginatedData<T>(
  client: RequestClient,
  baseUrl: string,
  baseParams: Record<string, string>,
  fieldsStr: string,
  pageSize: number = 100,
  dataMapper: (item: Record<string, unknown>, index: number) => T
): Promise<T[]> {
  const fetchPage = async (
    page: number
  ): Promise<{ total?: number; diff: Record<string, unknown>[] } | null> => {
    const params = new URLSearchParams({
      ...baseParams,
      pn: String(page),
      pz: String(pageSize),
      fields: fieldsStr,
    });
    const url = `${baseUrl}?${params.toString()}`;
    const json = await client.get<{
      data?: { total?: number; diff?: Record<string, unknown>[] };
    }>(url, { responseType: 'json' });
    const data = json?.data;
    if (!data || !Array.isArray(data.diff)) {
      return null;
    }
    return { total: data.total, diff: data.diff };
  };

  // R7-14: 首页串行探明 total，其余页波次并发（前缀连续语义，见 fetchPagesInWaves）。
  // 空页保护（F7 同款）：服务端高报 total 时越界页返回空 diff —— 空页即结束，
  // 并行版由 null 前缀截断承接，不再有无限翻页面。
  const allData: T[] = [];
  const first = await fetchPage(1);
  if (!first || first.diff.length === 0) {
    return allData;
  }
  const total = first.total ?? 0;
  const appendRows = (rows: Record<string, unknown>[]) => {
    // 保持既有 1-based 跨页连续行号契约
    allData.push(...rows.map((item, idx) => dataMapper(item, allData.length + idx + 1)));
  };
  appendRows(first.diff);

  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 1;
  if (totalPages <= 1 || allData.length >= total) {
    return allData;
  }

  const restPages = await fetchPagesInWaves(2, totalPages, 3, async (page) => {
    const result = await fetchPage(page);
    if (!result || result.diff.length === 0) {
      return null; // 坏页/空页：结束（与串行 break 一致）
    }
    return { value: result.diff };
  });
  for (const rows of restPages) {
    appendRows(rows);
  }

  return allData;
}

/**
 * 东方财富 K 线数据结构（CSV 解析后）
 */
export interface EmKlineItem {
  date: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  changePercent: number | null;
  change: number | null;
  turnoverRate: number | null;
}

/**
 * 导入核心工具函数
 */
import { toNumber } from '../../core/parser';

/**
 * 通用 K 线 CSV 解析器
 */
export function parseEmKlineCsv(line: string): EmKlineItem {
  const [
    date,
    open,
    close,
    high,
    low,
    volume,
    amount,
    amplitude,
    changePercent,
    change,
    turnoverRate,
  ] = line.split(',');

  return {
    date,
    open: toNumber(open),
    close: toNumber(close),
    high: toNumber(high),
    low: toNumber(low),
    volume: toNumber(volume),
    amount: toNumber(amount),
    amplitude: toNumber(amplitude),
    changePercent: toNumber(changePercent),
    change: toNumber(change),
    turnoverRate: toNumber(turnoverRate),
  };
}

/**
 * 获取东方财富历史 K 线通用函数
 */
export async function fetchEmHistoryKline(
  client: RequestClient,
  url: string,
  params: URLSearchParams
): Promise<{ klines: string[]; name?: string; code?: string }> {
  const fullUrl = `${url}?${params.toString()}`;
  const json = await client.get<any>(fullUrl, { responseType: 'json' });

  return {
    klines: json?.data?.klines || [],
    name: json?.data?.name,
    code: json?.data?.code,
  };
}
