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
} from '../../types';

const FUND_DATA_INDEX_URL =
  'https://fund.eastmoney.com/Data/funddataIndex_Interface.aspx';

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
