/**
 * 东方财富 - 期权龙虎榜
 * 数据来源：https://datacenter-web.eastmoney.com/api/data/get
 */
import { RequestClient, EM_OPTION_LHB_URL, EM_DATA_TOKEN } from '../../core';
import { toNumberSafe } from '../../core/parser';
import type { OptionLHBItem } from '../../types';

interface DatacenterResponse {
  result?: {
    pages?: number;
    data?: Record<string, unknown>[];
  };
  success?: boolean;
  code?: number;
}

function inferLegacySide(tradeType: string): 'buy' | 'sell' | 'net' | null {
  if (tradeType.includes('净')) {
    return 'net';
  }
  if (tradeType.includes('买')) {
    return 'buy';
  }
  if (tradeType.includes('卖')) {
    return 'sell';
  }
  return null;
}

/**
 * 获取期权龙虎榜
 * @param client - 请求客户端
 * @param symbol - 标的代码 '510050' / '510300' / '159919'
 * @param date - 交易日期 YYYY-MM-DD
 * @returns 龙虎榜数据
 */
export async function getOptionLHB(
  client: RequestClient,
  symbol: string,
  date: string
): Promise<OptionLHBItem[]> {
  const params = new URLSearchParams({
    type: 'RPT_IF_BILLBOARD_TD',
    sty: 'ALL',
    p: '1',
    ps: '200',
    source: 'IFBILLBOARD',
    client: 'WEB',
    ut: EM_DATA_TOKEN,
    filter: `(SECURITY_CODE="${symbol}")(TRADE_DATE='${date}')`,
  });

  const url = `${EM_OPTION_LHB_URL}?${params.toString()}`;
  const json = await client.get<DatacenterResponse>(url, { responseType: 'json' });

  const data = json?.result?.data;
  if (!Array.isArray(data)) {
    return [];
  }

  function parseDate(val: unknown): string {
    if (!val) return '';
    const str = String(val);
    const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : str;
  }

  return data.map((item) => ({
    tradeType: String(item.TRADE_TYPE ?? ''),
    date: parseDate(item.TRADE_DATE),
    symbol: String(item.SECURITY_CODE ?? ''),
    targetName: String(item.TARGET_NAME ?? ''),
    memberName: String(item.MEMBER_NAME_ABBR ?? ''),
    rank: toNumberSafe(item.MEMBER_RANK) ?? 0,
    sellVolume: toNumberSafe(item.SELL_VOLUME),
    sellVolumeChange: toNumberSafe(item.SELL_VOLUME_CHANGE),
    netSellVolume: toNumberSafe(item.NET_SELL_VOLUME),
    sellVolumeRatio: toNumberSafe(item.SELL_VOLUME_RATIO),
    buyVolume: toNumberSafe(item.BUY_VOLUME),
    buyVolumeChange: toNumberSafe(item.BUY_VOLUME_CHANGE),
    netBuyVolume: toNumberSafe(item.NET_BUY_VOLUME),
    buyVolumeRatio: toNumberSafe(item.BUY_VOLUME_RATIO),
    sellPosition: toNumberSafe(item.SELL_POSITION),
    sellPositionChange: toNumberSafe(item.SELL_POSITION_CHANGE),
    netSellPosition: toNumberSafe(item.NET_SELL_POSITION),
    sellPositionRatio: toNumberSafe(item.SELL_POSITION_RATIO),
    buyPosition: toNumberSafe(item.BUY_POSITION),
    buyPositionChange: toNumberSafe(item.BUY_POSITION_CHANGE),
    netBuyPosition: toNumberSafe(item.NET_BUY_POSITION),
    buyPositionRatio: toNumberSafe(item.BUY_POSITION_RATIO),
    tradeDate: parseDate(item.TRADE_DATE),
    volume:
      toNumberSafe(item.BUY_VOLUME) ??
      toNumberSafe(item.SELL_VOLUME) ??
      toNumberSafe(item.NET_BUY_VOLUME) ??
      toNumberSafe(item.NET_SELL_VOLUME),
    volumeChange:
      toNumberSafe(item.BUY_VOLUME_CHANGE) ??
      toNumberSafe(item.SELL_VOLUME_CHANGE),
    amount:
      toNumberSafe(item.BUY_POSITION) ??
      toNumberSafe(item.SELL_POSITION) ??
      toNumberSafe(item.NET_BUY_POSITION) ??
      toNumberSafe(item.NET_SELL_POSITION),
    amountChange:
      toNumberSafe(item.BUY_POSITION_CHANGE) ??
      toNumberSafe(item.SELL_POSITION_CHANGE),
    openInterest:
      toNumberSafe(item.BUY_POSITION) ??
      toNumberSafe(item.SELL_POSITION),
    openInterestChange:
      toNumberSafe(item.BUY_POSITION_CHANGE) ??
      toNumberSafe(item.SELL_POSITION_CHANGE),
    side: inferLegacySide(String(item.TRADE_TYPE ?? '')),
  }));
}
