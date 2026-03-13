/**
 * 东方财富 - 中金所期权实时行情列表
 * 数据来源：https://futsseapi.eastmoney.com/list/option/221
 */
import {
  RequestClient,
  EM_OPTION_CFFEX_URL,
  EM_FUTURES_GLOBAL_SPOT_TOKEN,
} from '../../core';
import { toNumberSafe } from '../../core/parser';
import type { CFFEXOptionQuote } from '../../types';

interface FutsseResponse {
  total?: number;
  list?: Record<string, unknown>[];
}

export interface CFFEXOptionQuotesOptions {
  /** 每页条数，默认 20000 */
  pageSize?: number;
}

/**
 * 获取中金所全部期权实时行情列表
 * @param client - 请求客户端
 * @param options - 配置选项
 * @returns 中金所期权实时行情列表
 */
export async function getCFFEXOptionQuotes(
  client: RequestClient,
  options: CFFEXOptionQuotesOptions = {}
): Promise<CFFEXOptionQuote[]> {
  const { pageSize = 20000 } = options;

  const params = new URLSearchParams({
    orderBy: 'zdf',
    sort: 'desc',
    pageSize: String(pageSize),
    pageIndex: '0',
    token: EM_FUTURES_GLOBAL_SPOT_TOKEN,
    field: 'dm,sc,name,p,zsjd,zde,zdf,f152,vol,cje,ccl,xqj,syr,rz,zjsj,o',
  });

  const url = `${EM_OPTION_CFFEX_URL}?${params.toString()}`;
  const json = await client.get<FutsseResponse>(url, { responseType: 'json' });

  const list = json?.list;
  if (!Array.isArray(list)) {
    return [];
  }

  return list.map((item) => ({
    code: String(item.dm ?? ''),
    name: String(item.name ?? ''),
    price: toNumberSafe(item.p),
    change: toNumberSafe(item.zde),
    changePercent: toNumberSafe(item.zdf),
    volume: toNumberSafe(item.vol),
    amount: toNumberSafe(item.cje),
    openInterest: toNumberSafe(item.ccl),
    strikePrice: toNumberSafe(item.xqj),
    remainDays: toNumberSafe(item.syr),
    dailyChange: toNumberSafe(item.rz),
    prevSettle: toNumberSafe(item.zjsj),
    open: toNumberSafe(item.o),
  }));
}
