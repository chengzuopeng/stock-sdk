/**
 * A 股交易日历
 */
import type { RequestClient } from '../../core';
import { getClientScopedCache, UpstreamEmptyError } from '../../core';
import { TRADE_CALENDAR_URL } from '../../core/constants';

/** R7-11: 交易日历缓存按 client 隔离（此前模块级共享跨实例串数据 12h） */
const TRADE_CALENDAR_CACHE_OPTIONS = { defaultTTL: 12 * 60 * 60 * 1000, maxSize: 4 };

/**
 * 获取 A 股交易日历
 * @param client 请求客户端
 * @returns 交易日期字符串数组，格式如 ['1990-12-19', '1990-12-20', ...]
 * @throws UpstreamEmptyError 上游返回空数据时（不落缓存，下次调用重新拉取）
 */
export async function getTradingCalendar(client: RequestClient): Promise<string[]> {
  const tradeCalendarCache = getClientScopedCache<string[]>(
    client,
    'tencent:trade-calendar',
    TRADE_CALENDAR_CACHE_OPTIONS
  );
  const calendar = await tradeCalendarCache.getOrFetch('a-share', async () => {
    const text = await client.get<string>(TRADE_CALENDAR_URL);

    const dates = (text ?? '')
      .trim()
      .split(',')
      .map((date) => date.trim())
      .filter((date) => date.length > 0);

    // 空日历必为上游异常（每年约 250 个交易日）：抛错且【不落缓存】。
    // 此前空响应会把 [] 缓存 12 小时，期间 isTradingDay 全 false、
    // nextTradingDay 抛错、withIndicators 静默降级。
    if (dates.length === 0) {
      throw new UpstreamEmptyError(
        '交易日历接口返回空数据',
        'tencent',
        TRADE_CALENDAR_URL
      );
    }

    return dates;
  });

  return calendar.slice();
}
