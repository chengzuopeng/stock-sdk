/**
 * 东方财富 datacenter-web 通用请求器
 * 统一封装分页拉取、参数构建、响应解析。
 *
 * 覆盖场景：北向资金、龙虎榜、融资融券、大宗交易、股东分析等所有
 * 走 `https://datacenter-web.eastmoney.com/api/data/v1/get` 的接口。
 */
import { type RequestClient, EM_DATACENTER_URL } from '../../core';

/**
 * datacenter-web 标准响应结构
 */
interface DatacenterApiResponse {
  result?: {
    pages?: number;
    count?: number;
    data?: Record<string, unknown>[];
  } | null;
}

/**
 * datacenter 查询参数
 */
export interface DatacenterQuery {
  /** 报表名称（如 RPT_MUTUAL_STOCK_NORTHSTA） */
  reportName: string;
  /** 返回字段，默认 'ALL' */
  columns?: string;
  /** 过滤表达式，如 (TRADE_DATE='2024-01-15') */
  filter?: string;
  /** 排序字段（多个用逗号分隔） */
  sortColumns?: string;
  /** 排序方向：'-1' 降序, '1' 升序（多个用逗号分隔） */
  sortTypes?: string;
  /** 每页大小，默认 500 */
  pageSize?: number;
  /** 起始页码，默认 1 */
  startPage?: number;
  /** 是否自动拉取全部分页，默认 true */
  fetchAllPages?: boolean;
  /**
   * 最大拉取页数（仅作为死循环安全阀，默认 1000）。
   *
   * 取较大默认值是为了恢复原 dividend / futuresInventory 等接口"拉完所有页"的语义；
   * 大多数 datacenter 接口分页远低于此上限。如果确实希望限制拉取页数，
   * 调用方应显式传入较小的 `maxPages` 值。
   *
   * 命中此上限时会在 console 输出 warning 提示，避免数据被静默截断。
   */
  maxPages?: number;
  /** 额外的 quoteColumns 参数（用于行情字段聚合） */
  quoteColumns?: string;
  /** 额外的 quoteType 参数 */
  quoteType?: string;
  /** 额外补充的查询参数（覆盖默认值，用于个别接口的特殊字段） */
  extraParams?: Record<string, string>;
}

/**
 * datacenter 分页响应
 */
export interface DatacenterResult<T> {
  /** 解析后的数据列表 */
  data: T[];
  /** 总记录数（来自首页） */
  total: number;
  /** 总页数（来自首页） */
  pages: number;
}

/**
 * 通用 datacenter-web 分页请求函数。
 *
 * 使用方法：
 * ```ts
 * const { data } = await fetchDatacenter(client, {
 *   reportName: 'RPT_MUTUAL_QUOTA',
 *   filter: `(TRADE_DATE='2024-01-15')`,
 * }, (item) => ({ date: String(item.TRADE_DATE ?? '') }));
 * ```
 *
 * @param client - 请求客户端
 * @param query - 查询参数
 * @param mapper - 将原始 Record 映射为目标类型的函数
 * @returns 合并后的分页数据
 */
export async function fetchDatacenter<T>(
  client: RequestClient,
  query: DatacenterQuery,
  mapper: (item: Record<string, unknown>, index: number) => T
): Promise<DatacenterResult<T>> {
  const {
    reportName,
    columns = 'ALL',
    filter,
    sortColumns,
    sortTypes,
    pageSize = 500,
    startPage = 1,
    fetchAllPages = true,
    maxPages = 1000,
    quoteColumns,
    quoteType,
    extraParams,
  } = query;

  const allData: T[] = [];
  let page = startPage;
  let totalPages = 1;
  let totalCount = 0;
  let pagesFetched = 0;

  do {
    const params = new URLSearchParams({
      reportName,
      columns,
      pageSize: String(pageSize),
      pageNumber: String(page),
      source: 'WEB',
      client: 'WEB',
    });

    if (filter) params.set('filter', filter);
    if (sortColumns) params.set('sortColumns', sortColumns);
    if (sortTypes) params.set('sortTypes', sortTypes);
    if (quoteColumns) params.set('quoteColumns', quoteColumns);
    if (quoteType) params.set('quoteType', quoteType);
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }

    const url = `${EM_DATACENTER_URL}?${params.toString()}`;
    const json = await client.get<DatacenterApiResponse>(url, {
      responseType: 'json',
    });

    const result = json?.result;
    if (!result || !Array.isArray(result.data)) {
      break;
    }

    if (page === startPage) {
      totalPages = result.pages ?? 1;
      totalCount = result.count ?? result.data.length;
    }

    const items = result.data.map((item, idx) =>
      mapper(item, allData.length + idx)
    );
    allData.push(...items);
    page++;
    pagesFetched++;

    if (!fetchAllPages) break;
  } while (page <= totalPages && pagesFetched < maxPages);

  // 命中安全阀且服务端还有更多数据时，提示调用方避免静默截断
  if (fetchAllPages && pagesFetched >= maxPages && page <= totalPages) {
    // eslint-disable-next-line no-console
    console.warn(
      `[stock-sdk] fetchDatacenter("${reportName}") truncated at maxPages=${maxPages} ` +
        `(server reports ${totalPages} pages). Pass a larger \`maxPages\` to fetch the full dataset.`
    );
  }

  return { data: allData, total: totalCount, pages: totalPages };
}

/**
 * 简化版：只返回 data 数组（多数业务场景只需数据本身）。
 */
export async function fetchDatacenterList<T>(
  client: RequestClient,
  query: DatacenterQuery,
  mapper: (item: Record<string, unknown>, index: number) => T
): Promise<T[]> {
  const result = await fetchDatacenter(client, query, mapper);
  return result.data;
}

/**
 * 提取 datacenter 响应中常见的日期字段为 YYYY-MM-DD 字符串。
 *
 * - 兼容 `2024-01-15`、`2024-01-15 00:00:00`、`2024-01-15T00:00:00.000` 等格式
 * - 无法识别的输入原样返回，空值返回空字符串
 */
export function parseDcDate(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str;
}
