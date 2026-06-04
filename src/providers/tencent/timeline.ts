/**
 * 腾讯财经 - 分时数据
 */
import {
  RequestClient,
  TENCENT_MINUTE_URL,
  buildTimeMeta,
  buildTimeMetaFromDateAndTime,
  MARKET_TZ,
} from '../../core';
import type { TodayTimeline, TodayTimelineResponse } from '../../types';

/**
 * 腾讯分时接口里单只股票的 payload 形状：
 *   {
 *     data: { data: ['0930 11.47 ...', ...], date: '20260522' },
 *     qt:   { 'sz000001': [field0, field1, ...] }
 *   }
 *
 * 拆成独立 interface 主要为了在 TS 严格模式下避免使用 `any`，
 * 并把后续字段访问（rawData / date / preClose）的语义集中标注。
 */
interface TencentStockTimelineInner {
  /** 分时点字符串数组，格式："HHmm 价格 累计成交量 累计成交额" */
  data?: string[];
  /** 日期字符串：腾讯返回 YYYYMMDD，但保险起见两种格式都允许 */
  date?: string;
}

interface TencentStockTimeline {
  data?: TencentStockTimelineInner;
  /** quote fields 字典，key 为股票代码，value 是行情字段数组 */
  qt?: Record<string, string[] | undefined>;
}

interface TencentTimelineResponse {
  code?: number;
  msg?: string;
  data?: Record<string, TencentStockTimeline | undefined>;
}

/**
 * 获取当日分时走势数据
 * @param client 请求客户端
 * @param code 股票代码，如 'sz000001' 或 'sh600000'
 */
export async function getTodayTimeline(
  client: RequestClient,
  code: string
): Promise<TodayTimelineResponse> {
  // 走 RequestClient 以继承 retry / rateLimit / circuitBreaker / providerPolicies /
  // host fallback；之前用裸 fetch 导致此接口与同实例其它接口的请求治理行为不一致。
  const url = `${TENCENT_MINUTE_URL}?code=${encodeURIComponent(code)}`;
  const json = await client.get<TencentTimelineResponse>(url, {
    responseType: 'json',
    provider: 'tencent',
  });

  if (json.code !== 0) {
    throw new Error(json.msg || 'API error');
  }

  const stockData = json.data?.[code];
  if (!stockData) {
    const emptyMeta = buildTimeMeta('', MARKET_TZ.CN);
    return {
      code,
      date: '',
      timestamp: emptyMeta.timestamp,
      tz: emptyMeta.tz,
      preClose: 0,
      data: [],
    };
  }

  const rawData: string[] = stockData.data?.data ?? [];
  const date: string = stockData.data?.date ?? '';
  const quoteFields: string[] = stockData.qt?.[code] ?? [];
  const preClose = parseFloat(quoteFields[4] ?? '') || 0;

  // 解析分时数据："0930 11.47 1715 1967105.00"
  // 格式：时间 成交价 累计成交量 累计成交额
  // 注意：接口返回的成交量单位不一致，主板/创业板是"手"，科创板是"股"
  // 需要通过首条数据的 成交额/成交量 与 价格 的比值来判断单位
  // 输出统一为"股"
  let isVolumeInLots = false; // 成交量是否以"手"为单位
  // 用首个"成交量>0 且价格>0"的有效 tick 判定单位。
  // 原实现只看 rawData[0]，若首条是集合竞价/冷门股的 0 成交量 tick，会判不出单位，
  // 导致整天主板成交量少 100 倍、均价虚高 100 倍。这里向后扫描到首个有效 tick 即判定，
  // 对"首条即有效"的常见情况行为与原来完全一致。
  for (const line of rawData) {
    const parts = line.split(' ');
    const tickPrice = parseFloat(parts[1]) || 0;
    const tickVolume = parseInt(parts[2], 10) || 0;
    const tickAmount = parseFloat(parts[3]) || 0;
    if (tickVolume > 0 && tickPrice > 0) {
      // 计算 成交额/成交量，如果接近 价格×100，说明单位是"手"
      const ratio = tickAmount / tickVolume;
      if (ratio > tickPrice * 50) {
        isVolumeInLots = true;
      }
      break;
    }
  }

  const data: TodayTimeline[] = rawData.map((line: string) => {
    const parts = line.split(' ');
    const timeRaw = parts[0]; // "0930"
    const time = `${timeRaw.slice(0, 2)}:${timeRaw.slice(2, 4)}`; // "09:30"
    const rawVolume = parseInt(parts[2], 10) || 0;
    const amount = parseFloat(parts[3]) || 0;
    // 统一成交量为"股"：如果原始单位是"手"，则乘以 100
    const volume = isVolumeInLots ? rawVolume * 100 : rawVolume;
    // 计算均价：累计成交额 / 累计成交量（股）
    const avgPrice = volume > 0 ? amount / volume : 0;
    // 利用外层 `date`（YYYYMMDD 或 YYYY-MM-DD）与本行 `HH:mm` 拼接出 UTC 时间戳
    const tickMeta = buildTimeMetaFromDateAndTime(date, time, MARKET_TZ.CN);
    return {
      time,
      timestamp: tickMeta.timestamp,
      tz: tickMeta.tz,
      price: parseFloat(parts[1]) || 0,
      volume,
      amount,
      avgPrice: Math.round(avgPrice * 100) / 100, // 保留两位小数
    };
  });

  const dayMeta = buildTimeMeta(date, MARKET_TZ.CN);
  return {
    code,
    date,
    timestamp: dayMeta.timestamp,
    tz: dayMeta.tz,
    preClose,
    data,
  };
}
