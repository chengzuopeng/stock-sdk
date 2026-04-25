/**
 * A 股交易日历
 */
import type { RequestClient } from '../../core';
import { getSharedCache } from '../../core';
import { TRADE_CALENDAR_URL } from '../../core/constants';

const tradeCalendarCache = getSharedCache<string[]>('tencent:trade-calendar', {
  defaultTTL: 12 * 60 * 60 * 1000,
  maxSize: 4,
});

/**
 * 获取 A 股交易日历
 * @param client 请求客户端
 * @returns 交易日期字符串数组，格式如 ['1990-12-19', '1990-12-20', ...]
 */
export async function getTradingCalendar(client: RequestClient): Promise<string[]> {
  const calendar = await tradeCalendarCache.getOrFetch('a-share', async () => {
    const text = await client.get<string>(TRADE_CALENDAR_URL);

    if (!text || text.trim() === '') {
      return [];
    }

    return text
      .trim()
      .split(',')
      .map((date) => date.trim())
      .filter((date) => date.length > 0);
  });

  return calendar.slice();
}
