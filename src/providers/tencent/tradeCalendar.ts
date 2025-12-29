/**
 * A 股交易日历
 */
import type { RequestClient } from '../../core';
import { TRADE_CALENDAR_URL } from '../../core/constants';

/**
 * 获取 A 股交易日历
 * @param client 请求客户端
 * @returns 交易日期字符串数组，格式如 ['1990-12-19', '1990-12-20', ...]
 */
export async function getTradingCalendar(client: RequestClient): Promise<string[]> {
  const text = await client.get<string>(TRADE_CALENDAR_URL);
  
  if (!text || text.trim() === '') {
    return [];
  }
  
  // 按逗号分割并过滤空字符串
  return text
    .trim()
    .split(',')
    .map((date) => date.trim())
    .filter((date) => date.length > 0);
}

