/**
 * 东方财富 - 涨停板 / 盘口异动
 * 数据来源：https://push2ex.eastmoney.com/...
 */
import { type RequestClient, EM_TOPIC_BASE_URL, toNumberSafe } from '../../core';
import type {
  ZTPoolType,
  ZTPoolItem,
  StockChangeType,
  StockChangeItem,
  BoardChangeItem,
} from '../../types';

/**
 * 涨停股池接口路径与默认排序映射
 */
const ZT_POOL_ENDPOINTS: Record<ZTPoolType, { path: string; sort: string }> = {
  zt: { path: '/getTopicZTPool', sort: 'fbt:asc' },
  yesterday: { path: '/getYesterdayZTPool', sort: 'zs:desc' },
  strong: { path: '/getTopicQSPool', sort: 'zdp:desc' },
  sub_new: { path: '/getTopicCXPool', sort: 'ods:asc' },
  broken: { path: '/getTopicZBPool', sort: 'fbt:asc' },
  dt: { path: '/getTopicDTPool', sort: 'fund:asc' },
};

/** 涨停股池响应 */
interface ZTPoolResponse {
  data?: {
    pool?: Record<string, unknown>[];
  } | null;
}

/** 个股盘口异动响应 */
interface StockChangesResponse {
  data?: {
    allstock?: Array<{
      tm?: number | string;
      c?: string;
      n?: string;
      t?: number | string;
      i?: string;
      [key: string]: unknown;
    }>;
  } | null;
}

/** 板块异动响应 */
interface BoardChangesResponse {
  data?: {
    allbk?: Array<{
      bkn?: string;
      bkz?: number | string;
      bkj?: number | string;
      bkc?: number | string;
      ms?: { m?: number; c?: string; n?: string };
      [key: string]: unknown;
    }>;
  } | null;
}

/**
 * 盘口异动类型 → 服务端代码 映射（双向）
 */
const STOCK_CHANGE_TYPE_TO_CODE: Record<StockChangeType, string> = {
  rocket_launch: '8201',
  quick_rebound: '8202',
  large_buy: '8193',
  limit_up_seal: '4',
  limit_down_open: '32',
  big_buy_order: '64',
  auction_up: '8207',
  high_open_5d: '8209',
  gap_up: '8211',
  high_60d: '8213',
  surge_60d: '8215',
  accelerate_down: '8204',
  high_dive: '8203',
  large_sell: '8194',
  limit_down_seal: '8',
  limit_up_open: '16',
  big_sell_order: '128',
  auction_down: '8208',
  low_open_5d: '8210',
  gap_down: '8212',
  low_60d: '8214',
  drop_60d: '8216',
};

/** 服务端代码 → 中文标签 */
const STOCK_CHANGE_CODE_TO_LABEL: Record<string, string> = {
  '8201': '火箭发射',
  '8202': '快速反弹',
  '8193': '大笔买入',
  '4': '封涨停板',
  '32': '打开跌停板',
  '64': '有大买盘',
  '8207': '竞价上涨',
  '8209': '高开5日线',
  '8211': '向上缺口',
  '8213': '60日新高',
  '8215': '60日大幅上涨',
  '8204': '加速下跌',
  '8203': '高台跳水',
  '8194': '大笔卖出',
  '8': '封跌停板',
  '16': '打开涨停板',
  '128': '有大卖盘',
  '8208': '竞价下跌',
  '8210': '低开5日线',
  '8212': '向下缺口',
  '8214': '60日新低',
  '8216': '60日大幅下跌',
};

/**
 * 把 HHMMSS 数字转为 HH:MM:SS 字符串。
 * 服务端返回的 tm 字段是整数（如 93055 → 09:30:55）。
 */
function formatTime(tm: unknown): string {
  if (tm === null || tm === undefined) return '';
  const padded = String(tm).padStart(6, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
}

/**
 * 计算涨停统计 'days/ct' 字符串。
 */
function buildZtStat(stat: unknown): string {
  if (!stat || typeof stat !== 'object') return '';
  const obj = stat as { days?: number; ct?: number };
  return `${obj.days ?? ''}/${obj.ct ?? ''}`;
}

/**
 * 解析涨停池单条记录为统一结构。
 *
 * 不同池子的字段命名略有差异，这里基于实际 API 字段名做兼容（缺失字段返回 null）：
 *  - c/m: 代码/代码 (m 用于 zt 池)
 *  - n: 名称
 *  - p: 最新价（× 1000）
 *  - zdp: 涨跌幅
 *  - amount/zb: 成交额
 *  - ltsz: 流通市值
 *  - tshare: 总市值
 *  - hs: 换手率
 *  - lbc: 连板数
 *  - fbt: 首次封板时间, lbt: 最后封板时间
 *  - fund: 封板/封单资金
 *  - zbc: 炸板次数
 *  - hybk: 所属行业
 *  - zttj: 涨停统计 { days, ct }
 *  - zf: 振幅
 *  - zs: 涨速
 *  - tp: 涨停价（× 1000）
 */
function parseZTPoolRow(item: Record<string, unknown>): ZTPoolItem {
  const priceRaw = toNumberSafe(item.p);
  const limitPriceRaw = toNumberSafe(item.tp);
  return {
    code: String(item.c ?? item.m ?? ''),
    name: String(item.n ?? ''),
    price: priceRaw !== null ? priceRaw / 1000 : null,
    changePercent: toNumberSafe(item.zdp),
    limitPrice: limitPriceRaw !== null ? limitPriceRaw / 1000 : null,
    amount: toNumberSafe(item.amount ?? item.zb),
    floatMarketValue: toNumberSafe(item.ltsz),
    totalMarketValue: toNumberSafe(item.tshare),
    turnoverRate: toNumberSafe(item.hs),
    continuousBoardCount: toNumberSafe(item.lbc),
    firstBoardTime: item.fbt !== undefined && item.fbt !== null ? formatTime(item.fbt) : null,
    lastBoardTime: item.lbt !== undefined && item.lbt !== null ? formatTime(item.lbt) : null,
    boardAmount: toNumberSafe(item.fund),
    sealAmount: toNumberSafe(item.fund),
    failedCount: toNumberSafe(item.zbc),
    industry: String(item.hybk ?? ''),
    ztStatistics: buildZtStat(item.zttj),
    amplitude: toNumberSafe(item.zf),
    speed: toNumberSafe(item.zs),
  };
}

/**
 * 把 YYYY-MM-DD 转为 YYYYMMDD（push2ex 接口要求）。
 */
function normalizeDate(date?: string): string | undefined {
  if (!date) return undefined;
  if (/^\d{8}$/.test(date)) return date;
  return date.replace(/-/g, '');
}

/**
 * 获取涨停股池（涨停 / 昨日涨停 / 强势 / 次新 / 炸板 / 跌停）
 *
 * @param client - 请求客户端
 * @param type - 池子类型
 * @param date - 交易日 YYYYMMDD 或 YYYY-MM-DD（默认为最近交易日）
 * @returns 股池列表
 */
export async function getZTPool(
  client: RequestClient,
  type: ZTPoolType = 'zt',
  date?: string
): Promise<ZTPoolItem[]> {
  const config = ZT_POOL_ENDPOINTS[type];
  if (!config) {
    throw new RangeError(`Invalid ZTPool type: ${type}.`);
  }

  const today = new Date();
  const defaultDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const queryDate = normalizeDate(date) ?? defaultDate;

  const params = new URLSearchParams({
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    dpt: 'wz.ztzt',
    Pageindex: '0',
    pagesize: '10000',
    sort: config.sort,
    date: queryDate,
  });

  const url = `${EM_TOPIC_BASE_URL}${config.path}?${params.toString()}`;
  const json = await client.get<ZTPoolResponse>(url, { responseType: 'json' });

  const pool = json?.data?.pool;
  if (!Array.isArray(pool) || pool.length === 0) return [];

  return pool.map(parseZTPoolRow);
}

/**
 * 获取个股盘口异动
 *
 * @param client - 请求客户端
 * @param type - 异动类型（如 'large_buy' 大笔买入）
 * @returns 当日异动列表
 */
export async function getStockChanges(
  client: RequestClient,
  type: StockChangeType = 'large_buy'
): Promise<StockChangeItem[]> {
  const code = STOCK_CHANGE_TYPE_TO_CODE[type];
  if (!code) {
    throw new RangeError(`Invalid StockChangeType: ${type}.`);
  }

  // 反向构建 code → label，以便从原始 t 字段还原中文标签
  const params = new URLSearchParams({
    type: code,
    pageindex: '0',
    pagesize: '5000',
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    dpt: 'wzchanges',
  });

  const url = `${EM_TOPIC_BASE_URL}/getAllStockChanges?${params.toString()}`;
  const json = await client.get<StockChangesResponse>(url, { responseType: 'json' });

  const list = json?.data?.allstock;
  if (!Array.isArray(list) || list.length === 0) return [];

  return list.map((item) => {
    const tCode = String(item.t ?? code);
    return {
      time: formatTime(item.tm),
      code: String(item.c ?? ''),
      name: String(item.n ?? ''),
      changeType: type,
      changeTypeLabel: STOCK_CHANGE_CODE_TO_LABEL[tCode] ?? '',
      info: String(item.i ?? ''),
    };
  });
}

/**
 * 获取板块异动详情
 *
 * @param client - 请求客户端
 * @returns 当日板块异动详情列表
 */
export async function getBoardChanges(
  client: RequestClient
): Promise<BoardChangeItem[]> {
  const params = new URLSearchParams({
    ut: '7eea3edcaed734bea9cbfc24409ed989',
    dpt: 'wzchanges',
    pageindex: '0',
    pagesize: '5000',
  });

  const url = `${EM_TOPIC_BASE_URL}/getAllBKChanges?${params.toString()}`;
  const json = await client.get<BoardChangesResponse>(url, { responseType: 'json' });

  const list = json?.data?.allbk;
  if (!Array.isArray(list) || list.length === 0) return [];

  return list.map((item) => {
    const ms = (item.ms ?? {}) as { m?: number; c?: string; n?: string };
    // 服务端 m: 0 = 大笔买入, 1 = 大笔卖出
    const direction = ms.m === 0 ? '大笔买入' : ms.m === 1 ? '大笔卖出' : '';
    const distribution: Record<string, number> = {};
    const distRaw = item.bkdf ?? item.bkdfdis;
    if (distRaw && typeof distRaw === 'object') {
      for (const [k, v] of Object.entries(distRaw as Record<string, unknown>)) {
        distribution[k] = Number(v) || 0;
      }
    }
    return {
      name: String(item.bkn ?? ''),
      changePercent: toNumberSafe(item.bkz),
      mainNetInflow: toNumberSafe(item.bkj),
      totalChangeCount: toNumberSafe(item.bkc),
      topStockCode: String(ms.c ?? ''),
      topStockName: String(ms.n ?? ''),
      topStockDirection: direction,
      changeTypeDistribution: distribution,
    };
  });
}
