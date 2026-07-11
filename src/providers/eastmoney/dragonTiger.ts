/**
 * 东方财富 - 龙虎榜
 * 数据来源：datacenter-web RPT_DAILYBILLBOARD_* / RPT_BILLBOARD_*
 */
import { type RequestClient, toNumberSafe, InvalidArgumentError } from '../../core';
import { normalizeSymbol, toPlainCode } from '../../symbols';
import type {
  DragonTigerDateOptions,
  DragonTigerPeriod,
  DragonTigerDetailItem,
  DragonTigerStockStatItem,
  DragonTigerInstitutionItem,
  DragonTigerBranchItem,
  DragonTigerSeatItem,
} from '../../types';
import { fetchDatacenterList, parseDcDate } from './datacenter';
import { toIsoDate } from './utils';

/** 龙虎榜统计周期 → STATISTICS_CYCLE 映射 */
const PERIOD_MAP: Record<DragonTigerPeriod, string> = {
  '1month': '01',
  '3month': '02',
  '6month': '03',
  '1year': '04',
};

/**
 * 获取龙虎榜详情
 *
 * @param client - 请求客户端
 * @param options - 起止日期 YYYYMMDD
 */
export async function getDragonTigerDetail(
  client: RequestClient,
  options: DragonTigerDateOptions
): Promise<DragonTigerDetailItem[]> {
  const startDate = toIsoDate(options.startDate);
  const endDate = toIsoDate(options.endDate);

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_DAILYBILLBOARD_DETAILSNEW',
      columns:
        'SECURITY_CODE,SECUCODE,SECURITY_NAME_ABBR,TRADE_DATE,EXPLAIN,CLOSE_PRICE,CHANGE_RATE,BILLBOARD_NET_AMT,BILLBOARD_BUY_AMT,BILLBOARD_SELL_AMT,BILLBOARD_DEAL_AMT,ACCUM_AMOUNT,DEAL_NET_RATIO,DEAL_AMOUNT_RATIO,TURNOVERRATE,FREE_MARKET_CAP,EXPLANATION,D1_CLOSE_ADJCHRATE,D2_CLOSE_ADJCHRATE,D5_CLOSE_ADJCHRATE,D10_CLOSE_ADJCHRATE',
      sortColumns: 'SECURITY_CODE,TRADE_DATE',
      sortTypes: '1,-1',
      pageSize: 5000,
      filter: `(TRADE_DATE<='${endDate}')(TRADE_DATE>='${startDate}')`,
    },
    (item) => ({
      code: String(item.SECURITY_CODE ?? ''),
      name: String(item.SECURITY_NAME_ABBR ?? ''),
      date: parseDcDate(item.TRADE_DATE),
      close: toNumberSafe(item.CLOSE_PRICE),
      changePercent: toNumberSafe(item.CHANGE_RATE),
      netBuyAmount: toNumberSafe(item.BILLBOARD_NET_AMT),
      buyAmount: toNumberSafe(item.BILLBOARD_BUY_AMT),
      sellAmount: toNumberSafe(item.BILLBOARD_SELL_AMT),
      dealAmount: toNumberSafe(item.BILLBOARD_DEAL_AMT),
      totalAmount: toNumberSafe(item.ACCUM_AMOUNT),
      netBuyRatio: toNumberSafe(item.DEAL_NET_RATIO),
      dealAmountRatio: toNumberSafe(item.DEAL_AMOUNT_RATIO),
      turnoverRate: toNumberSafe(item.TURNOVERRATE),
      floatMarketValue: toNumberSafe(item.FREE_MARKET_CAP),
      reason: String(item.EXPLANATION ?? item.EXPLAIN ?? ''),
      afterChange1d: toNumberSafe(item.D1_CLOSE_ADJCHRATE),
      afterChange2d: toNumberSafe(item.D2_CLOSE_ADJCHRATE),
      afterChange5d: toNumberSafe(item.D5_CLOSE_ADJCHRATE),
      afterChange10d: toNumberSafe(item.D10_CLOSE_ADJCHRATE),
    })
  );
}

/**
 * 获取个股上榜统计
 *
 * @param client - 请求客户端
 * @param period - 统计周期，默认 '1month'
 */
export async function getDragonTigerStockStats(
  client: RequestClient,
  period: DragonTigerPeriod = '1month'
): Promise<DragonTigerStockStatItem[]> {
  const cycle = PERIOD_MAP[period];
  if (!cycle) {
    throw new InvalidArgumentError(`Invalid period: ${period}.`);
  }

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_BILLBOARD_TRADEALL',
      columns: 'ALL',
      sortColumns: 'BILLBOARD_TIMES,LATEST_TDATE,SECURITY_CODE',
      sortTypes: '-1,-1,1',
      pageSize: 5000,
      filter: `(STATISTICS_CYCLE="${cycle}")`,
    },
    (item) => ({
      code: String(item.SECURITY_CODE ?? ''),
      name: String(item.SECURITY_NAME_ABBR ?? ''),
      latestDate: parseDcDate(item.LATEST_TDATE),
      close: toNumberSafe(item.CLOSE_PRICE),
      changePercent: toNumberSafe(item.CHANGE_RATE),
      count: toNumberSafe(item.BILLBOARD_TIMES),
      totalBuyAmount: toNumberSafe(item.BILLBOARD_BUY_AMT),
      totalSellAmount: toNumberSafe(item.BILLBOARD_SELL_AMT),
      totalNetAmount: toNumberSafe(item.BILLBOARD_NET_AMT),
      totalDealAmount: toNumberSafe(item.BILLBOARD_DEAL_AMT),
      buyOrgCount: toNumberSafe(item.ORG_BUY_TIMES),
      sellOrgCount: toNumberSafe(item.ORG_SELL_TIMES),
    })
  );
}

/**
 * 获取机构买卖统计（按上榜日期范围筛选）
 *
 * @param client - 请求客户端
 * @param options - 起止日期 YYYYMMDD
 */
export async function getDragonTigerInstitution(
  client: RequestClient,
  options: DragonTigerDateOptions
): Promise<DragonTigerInstitutionItem[]> {
  const startDate = toIsoDate(options.startDate);
  const endDate = toIsoDate(options.endDate);

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_ORGANIZATION_TRADE_DETAILS',
      columns: 'ALL',
      sortColumns: 'TRADE_DATE,SECURITY_CODE',
      sortTypes: '-1,1',
      pageSize: 5000,
      filter: `(TRADE_DATE<='${endDate}')(TRADE_DATE>='${startDate}')`,
    },
    (item) => ({
      code: String(item.SECURITY_CODE ?? ''),
      name: String(item.SECURITY_NAME_ABBR ?? ''),
      date: parseDcDate(item.TRADE_DATE),
      close: toNumberSafe(item.CLOSE_PRICE),
      changePercent: toNumberSafe(item.CHANGE_RATE),
      buyOrgCount: toNumberSafe(item.BUY_TIMES),
      sellOrgCount: toNumberSafe(item.SELL_TIMES),
      orgBuyAmount: toNumberSafe(item.BUY_AMT),
      orgSellAmount: toNumberSafe(item.SELL_AMT),
      orgNetAmount: toNumberSafe(item.NET_AMT),
    })
  );
}

/**
 * 获取营业部排行
 *
 * @param client - 请求客户端
 * @param period - 统计周期，默认 '1month'
 */
export async function getDragonTigerBranchRank(
  client: RequestClient,
  period: DragonTigerPeriod = '1month'
): Promise<DragonTigerBranchItem[]> {
  const cycle = PERIOD_MAP[period];
  if (!cycle) {
    throw new InvalidArgumentError(`Invalid period: ${period}.`);
  }

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_BILLBOARD_TRADEDETAILS',
      columns: 'ALL',
      sortColumns: 'TOTAL_BUYER_SALESTIMES',
      sortTypes: '-1',
      pageSize: 5000,
      filter: `(STATISTICS_CYCLE="${cycle}")`,
    },
    (item) => ({
      code: String(item.OPERATEDEPT_CODE ?? ''),
      name: String(item.OPERATEDEPT_NAME ?? ''),
      totalBuyAmount: toNumberSafe(item.TOTAL_BUYAMT ?? item.BUY_AMT),
      totalSellAmount: toNumberSafe(item.TOTAL_SELLAMT ?? item.SELL_AMT),
      buyCount: toNumberSafe(item.TOTAL_BUYER_SALESTIMES ?? item.BUY_TIMES),
      sellCount: toNumberSafe(item.TOTAL_SELLER_SALESTIMES ?? item.SELL_TIMES),
      totalCount: toNumberSafe(item.TOTAL_TIMES),
    })
  );
}

/**
 * 获取个股某日上榜席位明细（买入榜 + 卖出榜合并）
 *
 * @param client - 请求客户端
 * @param symbol - 股票代码
 * @param date - 上榜日期 YYYYMMDD 或 YYYY-MM-DD
 */
export async function getDragonTigerStockSeatDetail(
  client: RequestClient,
  symbol: string,
  date: string
): Promise<DragonTigerSeatItem[]> {
  // R7-12: 收编到 symbols 层归一 —— 此前的正则各写各的（dividend 漏 /i，
  // 'SH600519' 静默返回空而兄弟接口正常），且 '600519.SH' / '1.600519' 等
  // normalizeSymbol 系工具接受的形态在 datacenter filter 里同样静默空。
  // 行为变化：无法解析的垃圾输入从"静默空数组"改为抛 InvalidSymbolError。
  const pureSymbol = toPlainCode(normalizeSymbol(symbol, { market: 'CN' }));
  const queryDate = toIsoDate(date);

  const filter = `(SECURITY_CODE="${pureSymbol}")(TRADE_DATE='${queryDate}')`;

  // 并行拉取买入榜和卖出榜
  const [buyList, sellList] = await Promise.all([
    fetchDatacenterList(
      client,
      {
        reportName: 'RPT_BILLBOARD_DAILYDETAILSBUY',
        columns: 'ALL',
        sortColumns: 'BUY_AMT_REAL',
        sortTypes: '-1',
        pageSize: 100,
        filter,
      },
      (item, index) => ({
        rank: toNumberSafe(item.RANK) ?? index + 1,
        branchName: String(item.OPERATEDEPT_NAME ?? ''),
        buyAmount: toNumberSafe(item.BUY_AMT_REAL ?? item.BUY_AMT),
        buyAmountRatio: toNumberSafe(item.BUY_RATIO_TOTAL ?? item.BUY_AMT_RATIO),
        sellAmount: toNumberSafe(item.SELL_AMT_REAL ?? item.SELL_AMT),
        sellAmountRatio: toNumberSafe(item.SELL_RATIO_TOTAL ?? item.SELL_AMT_RATIO),
        netAmount: toNumberSafe(item.NET_AMT),
        side: 'buy' as const,
      })
    ),
    fetchDatacenterList(
      client,
      {
        reportName: 'RPT_BILLBOARD_DAILYDETAILSSELL',
        columns: 'ALL',
        sortColumns: 'SELL_AMT_REAL',
        sortTypes: '-1',
        pageSize: 100,
        filter,
      },
      (item, index) => ({
        rank: toNumberSafe(item.RANK) ?? index + 1,
        branchName: String(item.OPERATEDEPT_NAME ?? ''),
        buyAmount: toNumberSafe(item.BUY_AMT_REAL ?? item.BUY_AMT),
        buyAmountRatio: toNumberSafe(item.BUY_RATIO_TOTAL ?? item.BUY_AMT_RATIO),
        sellAmount: toNumberSafe(item.SELL_AMT_REAL ?? item.SELL_AMT),
        sellAmountRatio: toNumberSafe(item.SELL_RATIO_TOTAL ?? item.SELL_AMT_RATIO),
        netAmount: toNumberSafe(item.NET_AMT),
        side: 'sell' as const,
      })
    ),
  ]);

  return [...buyList, ...sellList];
}
