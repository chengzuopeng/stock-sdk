/**
 * 东方财富 - 通用工具函数
 */
import { RequestClient } from '../../core';

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
  const allData: T[] = [];
  let page = 1;
  let total = 0;

  do {
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
      break;
    }

    if (page === 1) {
      total = data.total ?? 0;
    }

    const items = data.diff.map((item, idx) =>
      dataMapper(item, allData.length + idx + 1)
    );
    allData.push(...items);

    page++;
  } while (allData.length < total);

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
