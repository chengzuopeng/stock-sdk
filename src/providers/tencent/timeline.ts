/**
 * 腾讯财经 - 分时数据
 */
import { RequestClient, TENCENT_MINUTE_URL } from '../../core';
import type { TodayTimeline, TodayTimelineResponse } from '../../types';

/**
 * 获取当日分时走势数据
 * @param client 请求客户端
 * @param code 股票代码，如 'sz000001' 或 'sh600000'
 */
export async function getTodayTimeline(
  client: RequestClient,
  code: string
): Promise<TodayTimelineResponse> {
  const timeout = client.getTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const resp = await fetch(`${TENCENT_MINUTE_URL}?code=${code}`, {
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }

    const json = await resp.json();

    if (json.code !== 0) {
      throw new Error(json.msg || 'API error');
    }

    const stockData = json.data?.[code];
    if (!stockData) {
      return {
        code,
        date: '',
        data: [],
      };
    }

    const rawData: string[] = stockData.data?.data || [];
    const date: string = stockData.data?.date || '';

    // 解析分时数据："0930 11.47 1715 1967105.00"
    // 格式：时间 成交价 累计成交量 累计成交额
    // 注意：接口返回的成交量单位不一致，主板/创业板是"手"，科创板是"股"
    // 需要通过首条数据的 成交额/成交量 与 价格 的比值来判断单位
    // 输出统一为"股"
    let isVolumeInLots = false; // 成交量是否以"手"为单位
    if (rawData.length > 0) {
      const firstParts = rawData[0].split(' ');
      const firstPrice = parseFloat(firstParts[1]) || 0;
      const firstVolume = parseInt(firstParts[2], 10) || 0;
      const firstAmount = parseFloat(firstParts[3]) || 0;
      if (firstVolume > 0 && firstPrice > 0) {
        // 计算 成交额/成交量，如果接近 价格×100，说明单位是"手"
        const ratio = firstAmount / firstVolume;
        if (ratio > firstPrice * 50) {
          isVolumeInLots = true;
        }
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
      return {
        time,
        price: parseFloat(parts[1]) || 0,
        volume,
        amount,
        avgPrice: Math.round(avgPrice * 100) / 100, // 保留两位小数
      };
    });

    return {
      code,
      date,
      data,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

