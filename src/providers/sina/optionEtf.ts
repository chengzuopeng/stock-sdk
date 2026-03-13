/**
 * 新浪财经 - 上交所 ETF 期权
 */
import {
  jsonpRequest,
  SINA_SSE_OPTION_LIST_URL,
  SINA_SSE_OPTION_EXPIRE_URL,
  SINA_SSE_OPTION_MINUTE_URL,
  SINA_SSE_OPTION_DAILY_URL,
  SINA_SSE_OPTION_5DAY_URL,
} from '../../core';
import { toNumberSafe } from '../../core/parser';
import type {
  ETFOptionCate,
  ETFOptionMonth,
  ETFOptionExpireDay,
  OptionMinute,
  OptionKline,
} from '../../types';

interface SinaListResponse {
  result?: {
    data?: {
      contractMonth?: string[];
      stockId?: string;
      cateId?: string;
      cateList?: string[];
    };
  };
}

/**
 * 获取上交所 ETF 期权到期月份列表
 * @param cate - 品种名称
 * @returns 到期月份信息
 */
export async function getETFOptionMonths(
  cate: ETFOptionCate
): Promise<ETFOptionMonth> {
  const url = `${SINA_SSE_OPTION_LIST_URL}?exchange=null&cate=${encodeURIComponent(cate)}`;
  const data = await jsonpRequest<SinaListResponse>(url);

  const d = data?.result?.data;
  const months = d?.contractMonth ?? [];

  return {
    months: months.length > 1 ? months.slice(1) : months,
    stockId: d?.stockId ?? '',
    cateId: d?.cateId ?? '',
    cateList: d?.cateList ?? [],
  };
}

interface SinaExpireResponse {
  result?: {
    data?: {
      expireDay?: string;
      remainderDays?: number;
      stockId?: string;
      other?: { name?: string };
    };
  };
}

/**
 * 获取上交所 ETF 期权到期日与剩余天数
 * @param cate - 品种名称
 * @param month - 到期月份 YYYY-MM
 * @returns 到期日信息
 */
export async function getETFOptionExpireDay(
  cate: ETFOptionCate,
  month: string
): Promise<ETFOptionExpireDay> {
  const url = `${SINA_SSE_OPTION_EXPIRE_URL}?exchange=null&cate=${encodeURIComponent(cate)}&date=${month}`;
  let data = await jsonpRequest<SinaExpireResponse>(url);

  // 如果剩余天数为负，说明合约已过期，使用 XD 前缀重试
  const days = data?.result?.data?.remainderDays;
  if (typeof days === 'number' && days < 0) {
    const xdUrl = `${SINA_SSE_OPTION_EXPIRE_URL}?exchange=null&cate=${encodeURIComponent('XD' + cate)}&date=${month}`;
    data = await jsonpRequest<SinaExpireResponse>(xdUrl);
  }

  const d = data?.result?.data;
  return {
    expireDay: d?.expireDay ?? '',
    remainderDays: d?.remainderDays ?? 0,
    stockId: d?.stockId ?? '',
    name: d?.other?.name ?? '',
  };
}

interface SinaMinuteItem {
  i: string;
  p: string;
  v: string;
  t: string;
  a: string;
  d?: string;
}

interface SinaMinuteResponse {
  result?: {
    data?: SinaMinuteItem[];
  };
}

function parseMinuteList(items: SinaMinuteItem[]): OptionMinute[] {
  let currentDate = '';
  return items.map((item) => {
    if (item.d) {
      currentDate = item.d;
    }
    return {
      time: item.i,
      date: currentDate,
      price: toNumberSafe(item.p),
      volume: toNumberSafe(item.v),
      openInterest: toNumberSafe(item.t),
      avgPrice: toNumberSafe(item.a),
    };
  });
}

/**
 * 获取上交所 ETF 期权当日分钟行情
 * @param code - 期权代码（纯数字），如 '10009633'
 * @returns 分钟行情数据
 */
export async function getETFOptionMinute(
  code: string
): Promise<OptionMinute[]> {
  const symbol = `CON_OP_${code}`;
  const url = `${SINA_SSE_OPTION_MINUTE_URL}?symbol=${symbol}`;
  const data = await jsonpRequest<SinaMinuteResponse>(url);

  const items = data?.result?.data;
  if (!Array.isArray(items)) {
    return [];
  }

  return parseMinuteList(items);
}

interface SinaKlineItem {
  d: string;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}

/**
 * 获取上交所 ETF 期权历史日 K 线
 * @param code - 期权代码（纯数字），如 '10009633'
 * @returns 日 K 线数据
 */
export async function getETFOptionDailyKline(
  code: string
): Promise<OptionKline[]> {
  const symbol = `CON_OP_${code}`;
  const url = `${SINA_SSE_OPTION_DAILY_URL}?symbol=${symbol}`;
  const data = await jsonpRequest<SinaKlineItem[] | null>(url, {
    callbackMode: 'path',
  });

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => ({
    date: item.d,
    open: toNumberSafe(item.o),
    high: toNumberSafe(item.h),
    low: toNumberSafe(item.l),
    close: toNumberSafe(item.c),
    volume: toNumberSafe(item.v),
  }));
}

interface Sina5DayResponse {
  result?: {
    data?: SinaMinuteItem[][];
  };
}

/**
 * 获取上交所 ETF 期权 5 日分钟行情
 * @param code - 期权代码（纯数字），如 '10009633'
 * @returns 5 日分钟数据（按天分组展平为一维数组）
 */
export async function getETFOption5DayMinute(
  code: string
): Promise<OptionMinute[]> {
  const symbol = `CON_OP_${code}`;
  const url = `${SINA_SSE_OPTION_5DAY_URL}?symbol=${symbol}`;
  const data = await jsonpRequest<Sina5DayResponse>(url);

  const days = data?.result?.data;
  if (!Array.isArray(days)) {
    return [];
  }

  const result: OptionMinute[] = [];
  for (const dayItems of days) {
    if (Array.isArray(dayItems)) {
      result.push(...parseMinuteList(dayItems));
    }
  }
  return result;
}
