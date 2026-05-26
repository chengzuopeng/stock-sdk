/**
 * 东方财富 - 公募基金扩展数据
 *
 * 数据源：https://fund.eastmoney.com/Data/funddataIndex_Interface.aspx
 *
 * 该接口返回一段 JS 变量声明（`var pageinfo = ...; var jjfh_data = ...;`），
 * 通过 fetchJsVars 双端解析。
 */
import { fetchJsVars } from '../../core/jsVars';
import type {
  FundDividend,
  FundDividendListOptions,
  FundDividendListResult,
  FundNavHistory,
  FundNavPoint,
} from '../../types';

const FUND_DATA_INDEX_URL =
  'https://fund.eastmoney.com/Data/funddataIndex_Interface.aspx';

const FUND_PINGZHONGDATA_URL = 'https://fund.eastmoney.com/pingzhongdata';

interface FundDividendRaw {
  /** `[总页数, 每页条数, 当前页]` */
  pageinfo?: [number, number, number];
  /** 每条 7 个字段：`[code, name, 登记日, 除息日, 分红, 发放日, 类型]` */
  jjfh_data?: string[][];
}

function currentYearShanghai(): number {
  // 简化实现：用本地时间取年份。A 股时区 UTC+8，跨年瞬间在 UTC-8~+8 时区
  // 之间可能出现 ±1 天误差，但对"年"维度足够（用户也可显式传 year 覆盖）。
  return new Date().getFullYear();
}

function buildUrl(opts: FundDividendListOptions, page: number): string {
  const params = new URLSearchParams({
    dt: '8',
    page: String(page),
    rank: opts.rank ?? 'FSRQ',
    sort: opts.sort ?? 'desc',
    gs: '',
    ftype: opts.fundType ?? '',
    year: String(opts.year ?? currentYearShanghai()),
  });
  return `${FUND_DATA_INDEX_URL}?${params.toString()}`;
}

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function parseNumber(s: string | undefined): number | null {
  if (s === undefined || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: string[]): FundDividend {
  return {
    code: row[0] ?? '',
    name: row[1] ?? '',
    equityRecordDate: parseDate(row[2]),
    exDividendDate: parseDate(row[3]),
    dividendPerShare: parseNumber(row[4]),
    payDate: parseDate(row[5]),
    raw: row,
  };
}

/** 拉取单页（不做客户端过滤、不做翻页聚合） */
async function fetchOnePage(
  opts: FundDividendListOptions,
  page: number
): Promise<FundDividendListResult> {
  const url = buildUrl(opts, page);
  const vars = await fetchJsVars<FundDividendRaw>(url, [
    'pageinfo',
    'jjfh_data',
  ]);
  const info = vars.pageinfo ?? [0, 0, page];
  const [totalPages = 0, pageSize = 0, currentPage = page] = info;
  const rawRows = vars.jjfh_data ?? [];
  return {
    items: rawRows.map(mapRow),
    totalPages,
    pageSize,
    currentPage,
  };
}

/**
 * 获取基金分红明细列表（来自东方财富 / 天天基金分红送配频道）。
 *
 * 接口本身只支持「年份 + 全市场 + 翻页」查询，不能服务端按基金代码精确查。
 * SDK 提供 `code` 选项在客户端过滤；若要拿到某只基金该年完整分红记录，
 * 应搭配 `page: 'all'` 一起使用。
 *
 * @example
 * // 拉 2024 年第 1 页（默认按除息日倒序）
 * await sdk.getFundDividendList({ year: 2024 });
 *
 * @example
 * // 拉 2024 年 110011 的全部分红
 * await sdk.getFundDividendList({ year: 2024, page: 'all', code: '110011' });
 */
export async function getFundDividendList(
  options: FundDividendListOptions = {}
): Promise<FundDividendListResult> {
  if (options.page === 'all') {
    const first = await fetchOnePage(options, 1);
    let items = first.items;
    for (let p = 2; p <= first.totalPages; p++) {
      const next = await fetchOnePage(options, p);
      items = items.concat(next.items);
    }
    if (options.code) {
      items = items.filter((it) => it.code === options.code);
    }
    return {
      items,
      totalPages: first.totalPages,
      pageSize: first.pageSize,
      currentPage: -1,
    };
  }

  const page = options.page ?? 1;
  const result = await fetchOnePage(options, page);
  if (options.code) {
    return {
      ...result,
      items: result.items.filter((it) => it.code === options.code),
    };
  }
  return result;
}

// ============================================================
// 历史净值（pingzhongdata.js）
// ============================================================

interface FundNavRaw {
  fS_code?: string;
  fS_name?: string;
  /** `[{x, y, equityReturn, unitMoney}, ...]` —— 单位净值走势 */
  Data_netWorthTrend?: Array<{
    x: number;
    y: number;
    equityReturn: number | string;
    unitMoney: string;
  }>;
  /** `[[x, accNav], ...]` —— 累计净值走势 */
  Data_ACWorthTrend?: Array<[number, number]>;
}

function toDailyReturn(v: number | string | undefined): number | null {
  if (v === undefined || v === '' || v === null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function timestampToDate(ts: number): string {
  // pingzhongdata 的 x 是 UTC 当日 00:00 的毫秒数（每条对应 A 股一个交易日）
  // 直接用 ISO 字符串切前 10 位即可得到 YYYY-MM-DD
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * 获取基金历史净值（单位净值 + 累计净值，按 timestamp 对齐合并）。
 *
 * 数据源：`https://fund.eastmoney.com/pingzhongdata/{code}.js`
 *
 * 一次请求拿到该基金从成立日到最新交易日的全部净值（数千条），
 * 无需翻页。开放式基金、ETF、LOF、货币、QDII 均通用。
 *
 * @param code 基金代码（纯数字，如 `'110011'`）
 *
 * @example
 * const h = await sdk.getFundNavHistory('110011');
 * console.log(h.name, h.items.length, h.items[h.items.length - 1]);
 */
export async function getFundNavHistory(code: string): Promise<FundNavHistory> {
  const url = `${FUND_PINGZHONGDATA_URL}/${encodeURIComponent(code)}.js`;
  const vars = await fetchJsVars<FundNavRaw>(url, [
    'fS_code',
    'fS_name',
    'Data_netWorthTrend',
    'Data_ACWorthTrend',
  ]);

  const trend = vars.Data_netWorthTrend ?? [];
  // 把累计净值按 timestamp 建索引，O(1) 对齐
  const accMap = new Map<number, number>();
  for (const row of vars.Data_ACWorthTrend ?? []) {
    if (Array.isArray(row) && row.length >= 2) {
      accMap.set(row[0], row[1]);
    }
  }

  const items: FundNavPoint[] = trend.map((p) => ({
    date: timestampToDate(p.x),
    timestamp: p.x,
    nav: p.y,
    accNav: accMap.has(p.x) ? (accMap.get(p.x) as number) : null,
    dailyReturn: toDailyReturn(p.equityReturn),
    unitMoney: p.unitMoney ?? '',
  }));

  return {
    code: vars.fS_code ?? code,
    name: vars.fS_name ?? null,
    items,
  };
}
