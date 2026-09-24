/**
 * 东方财富 - 涨停板 / 盘口异动
 * 数据来源：https://push2ex.eastmoney.com/...
 */
import {
  type RequestClient,
  EM_TOPIC_BASE_URL,
  EM_PUSH_TOKEN,
  toNumberSafe,
  InvalidArgumentError,
  todayInTz,
  MARKET_TZ,
  buildTimeMeta,
} from '../../core';
import {
  normalizeSymbol,
  toEastmoneySecid,
  type NormalizedSymbol,
} from '../../symbols';
import { toIsoDate, resolvePageQuery } from './utils';
import { fetchDatacenterList, parseDcDate } from './datacenter';
import type {
  ZTPoolType,
  ZTPoolItem,
  StockChangeType,
  StockChangeItem,
  StockChangesOptions,
  BoardChangeItem,
  IndividualStockChangeItem,
  IndividualChangesDay,
  UnusualFluctuationItem,
  UnusualFluctuationOptions,
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

/** 全市场盘口异动响应 */
interface StockChangesResponse {
  data?: {
    /** 符合条件的事件总数(分页依据) */
    tc?: number | string;
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

/** 个股按日盘口异动响应(getStockChanges?code=&market=&date=) */
interface IndividualStockChangesResponse {
  data?: {
    d?: number | string;
    c?: string;
    m?: number | string;
    n?: string;
    data?: Array<{
      tm?: number | string;
      t?: number | string;
      p?: number | string;
      i?: string;
      u?: string;
      v?: number | string;
      [key: string]: unknown;
    }>;
  } | null;
}

/** 板块异动响应 */
interface BoardChangesResponse {
  data?: {
    allbk?: Array<{
      n?: string;
      u?: number | string;
      zjl?: number | string;
      ct?: number | string;
      ydl?: Array<{ t?: number | string; ct?: number | string }>;
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

/** 服务端代码 → 异动类型(响应 t 码反查;个股接口会返回 22 类之外的码,查不到即 'unknown') */
const STOCK_CHANGE_CODE_TO_TYPE: Record<string, StockChangeType> = Object.fromEntries(
  (Object.entries(STOCK_CHANGE_TYPE_TO_CODE) as [StockChangeType, string][]).map(
    ([type, code]) => [code, type]
  )
) as Record<string, StockChangeType>;

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
 * 获取北京时间（UTC+8）当天的 YYYYMMDD 字符串。
 *
 * 不直接用 `new Date()` + `getFullYear()` 是为了避免本地时区与北京时区不一致：
 * 例如美西用户半夜的本地日期可能比北京时区早一天，会拿到无数据。
 * F43: 收编到 core/time 的 todayInTz（缓存 formatter），不再手写 +8h UTC 算术。
 *
 * 注：服务端对非交易日（周末 / 节假日）会回退到最近一个交易日，
 * 因此这里不需要显式判断是否是交易日。
 */
function getBeijingDateString(): string {
  return todayInTz(MARKET_TZ.CN).replace(/-/g, '');
}

/**
 * 获取涨停股池（涨停 / 昨日涨停 / 强势 / 次新 / 炸板 / 跌停）
 *
 * @param client - 请求客户端
 * @param type - 池子类型
 * @param date - 交易日 YYYYMMDD 或 YYYY-MM-DD；不传时使用北京时间今天的日期。
 *               服务端对非交易日会自动回退到最近一个交易日。
 * @returns 股池列表
 */
export async function getZTPool(
  client: RequestClient,
  type: ZTPoolType = 'zt',
  date?: string
): Promise<ZTPoolItem[]> {
  const config = ZT_POOL_ENDPOINTS[type];
  if (!config) {
    throw new InvalidArgumentError(`Invalid ZTPool type: ${type}.`);
  }

  // push2ex 接口必须传 date 参数：
  // - 不传 date → 服务端返回 { rc:102, data:null }（拿不到数据）
  // - 传非交易日 → 服务端会自动归到最近交易日
  // 因此这里默认始终传北京时间今天的日期
  const queryDate = normalizeDate(date) ?? getBeijingDateString();

  const params = new URLSearchParams({
    ut: EM_PUSH_TOKEN,
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

/** 全市场异动单页大小(服务端上限;全类型当日总量可达 1.5 万+,需按 tc 翻页) */
const STOCK_CHANGES_PAGE_SIZE = 5000;
/** 翻页安全上限(5 万条,远超实测全类型单日总量,防服务端 tc 异常导致死循环) */
const STOCK_CHANGES_MAX_PAGES = 10;
/** 对外分页(#65)未传 pageSize 时的每页条数 */
const STOCK_CHANGES_DEFAULT_PAGE_SIZE = 100;

/**
 * 获取全市场盘口异动
 *
 * @param client - 请求客户端
 * @param type - 异动类型:单个(如 'large_buy')/ 数组(一次请求多类型)/ 'all'(全部 22 类)。
 *               总量超单页 5000 时自动按服务端 tc 翻页收全。
 * @param options - `page` / `pageSize` 分页:任传其一只请求该页;都不传则翻页收全(默认)
 * @returns 当日异动列表(每条的实际类型由响应 t 码标注,见 changeType / typeCode)
 */
export async function getStockChanges(
  client: RequestClient,
  type: StockChangeType | StockChangeType[] | 'all' = 'large_buy',
  options: StockChangesOptions = {}
): Promise<StockChangeItem[]> {
  const types: StockChangeType[] =
    type === 'all'
      ? (Object.keys(STOCK_CHANGE_TYPE_TO_CODE) as StockChangeType[])
      : Array.isArray(type)
        ? type
        : [type];
  if (types.length === 0) {
    throw new InvalidArgumentError('StockChangeType 数组不能为空。');
  }
  const codes = types.map((t) => {
    const c = STOCK_CHANGE_TYPE_TO_CODE[t];
    if (!c) {
      throw new InvalidArgumentError(`Invalid StockChangeType: ${t}.`);
    }
    return c;
  });
  const paging = resolvePageQuery(
    options,
    {
      defaultPageSize: STOCK_CHANGES_DEFAULT_PAGE_SIZE,
      maxPageSize: STOCK_CHANGES_PAGE_SIZE,
    },
    'marketEvent.stockChanges'
  );
  // 单类型请求且响应缺 t 字段时,回退到请求的类型码(兼容旧行为)
  const singleCodeFallback = codes.length === 1 ? codes[0] : '';

  /** 拉取服务端第 pageIndex 页(从 0 开始),返回事件总数 tc 与本页原始行 */
  const fetchPage = async (pageIndex: number, pageSize: number) => {
    const params = new URLSearchParams({
      pageindex: String(pageIndex),
      pagesize: String(pageSize),
      ut: EM_PUSH_TOKEN,
      dpt: 'wzchanges',
    });

    // type 必须保持【裸逗号】拼接:URLSearchParams 会把 ',' 编码成 '%2C',
    // 服务端不解码,实测只会识别第一个类型码(多类型静默退化为单类型)。
    // codes 均为纯数字串,直拼无注入风险。
    const url = `${EM_TOPIC_BASE_URL}/getAllStockChanges?type=${codes.join(',')}&${params.toString()}`;
    const json = await client.get<StockChangesResponse>(url, { responseType: 'json' });
    const list = json?.data?.allstock;
    return {
      tc: toNumberSafe(json?.data?.tc),
      list: Array.isArray(list) ? list : [],
    };
  };

  const toItem = (
    item: NonNullable<NonNullable<StockChangesResponse['data']>['allstock']>[number]
  ): StockChangeItem => {
    const tCode = String(item.t ?? singleCodeFallback);
    return {
      time: formatTime(item.tm),
      code: String(item.c ?? ''),
      name: String(item.n ?? ''),
      typeCode: tCode,
      changeType: STOCK_CHANGE_CODE_TO_TYPE[tCode] ?? 'unknown',
      changeTypeLabel: STOCK_CHANGE_CODE_TO_LABEL[tCode] ?? '',
      info: String(item.i ?? ''),
    };
  };

  // 分页(#65):只请求调用方指定的一页;对外 page 从 1 开始,服务端 pageindex 从 0 开始
  if (paging) {
    const { list } = await fetchPage(paging.page - 1, paging.pageSize);
    return list.map(toItem);
  }

  const all: StockChangeItem[] = [];
  let total: number | null = null;
  for (let page = 0; page < STOCK_CHANGES_MAX_PAGES; page++) {
    const { tc, list } = await fetchPage(page, STOCK_CHANGES_PAGE_SIZE);
    if (tc !== null) total = tc;
    if (list.length === 0) break;

    for (const item of list) {
      all.push(toItem(item));
    }

    // 非满页 → 已到末页;已知总数且收满 → 提前结束
    if (list.length < STOCK_CHANGES_PAGE_SIZE) break;
    if (total !== null && all.length >= total) break;
  }
  return all;
}

/**
 * 获取单只 A 股某个交易日的盘口异动事件流。
 *
 * 数据源为 push2ex 的个股接口(akshare 未收录):返回该股当日**全部类型**的
 * 异动事件(含 22 类之外的类型码,如 8219,解析按未知码容错),
 * 事件顺序与服务端一致(最新在前)。
 *
 * 服务端仅保留约最近数周的数据(实测 1 个月左右,且**不保证连续**,
 * 存在个别日期空洞):无数据的日期返回 `available: false` 且 `changes` 为空,
 * 与"当日无异动"(`available: true` + 空数组)可区分。
 *
 * @param client - 请求客户端
 * @param symbol - 股票代码(如 '600519' / 'sh600519',经 symbols 层归一)
 * @param date - 交易日 YYYYMMDD 或 YYYY-MM-DD;不传为北京时间今天
 */
/**
 * 校验并归一 A 股【个股】符号(盘口异动个股接口仅个股有语义)。
 *
 * 板块(secid 前缀 90)/指数等传给该接口会被服务端静默回 data:null,
 * 与"超保留窗口"不可区分 —— 零请求即拒更诚实。provider 与 service 层
 * (individualChangesHistory 取日历前)共用本守卫,文案单一来源。
 *
 * 已知边界:交易所同码歧义(如 sh000001 上证指数 vs 平安银行)在 symbols
 * 层归类为 stock,守卫放行、由服务端回空 —— 只拦"确定非个股"的输入。
 */
export function assertCnStockSymbol(symbol: string): NormalizedSymbol {
  const ns = normalizeSymbol(symbol, { market: 'CN' });
  if (ns.assetType !== 'stock') {
    throw new InvalidArgumentError(
      `个股盘口异动仅支持 A 股个股,收到 assetType='${ns.assetType}'(symbol=${symbol})`,
      { argument: 'symbol', value: symbol, assetType: ns.assetType }
    );
  }
  return ns;
}

export async function getIndividualStockChanges(
  client: RequestClient,
  symbol: string,
  date?: string
): Promise<IndividualChangesDay> {
  const ns = assertCnStockSymbol(symbol);
  // secid 形如 '1.603087' / '0.000001' → 接口要求拆分的 market= 与 code= 参数
  const [market, code] = toEastmoneySecid(ns).split('.');
  const queryDate = normalizeDate(date) ?? getBeijingDateString();
  const isoDate = toIsoDate(queryDate);

  const params = new URLSearchParams({
    ut: EM_PUSH_TOKEN,
    dpt: 'wzchanges',
    code,
    market,
    date: queryDate,
  });

  const url = `${EM_TOPIC_BASE_URL}/getStockChanges?${params.toString()}`;
  const json = await client.get<IndividualStockChangesResponse>(url, {
    responseType: 'json',
  });

  const data = json?.data;
  // data 为 null = 超出服务端保留窗口(与"当日无异动"的空事件列表区分)
  if (!data) {
    return { date: isoDate, available: false, code: ns.code, name: '', changes: [] };
  }

  const list = Array.isArray(data.data) ? data.data : [];
  const changes: IndividualStockChangeItem[] = list.map((item) => {
    const tCode = String(item.t ?? '');
    const priceRaw = toNumberSafe(item.p);
    return {
      time: formatTime(item.tm),
      typeCode: tCode,
      changeType: STOCK_CHANGE_CODE_TO_TYPE[tCode] ?? 'unknown',
      changeTypeLabel: STOCK_CHANGE_CODE_TO_LABEL[tCode] ?? '',
      price: priceRaw !== null ? priceRaw / 1000 : null,
      changePercent: toNumberSafe(item.u),
      info: String(item.i ?? ''),
      v: toNumberSafe(item.v),
    };
  });

  // date 优先取服务端回显(data.d):请求非交易日时服务端会回退到最近交易日,
  // 用请求日标注会把上一交易日的事件标错日期(类型契约承诺 date 是交易日)
  const echoed = String(data.d ?? '');
  const resultDate = /^\d{8}$/.test(echoed) ? toIsoDate(echoed) : isoDate;

  return {
    date: resultDate,
    available: true,
    code: String(data.c ?? ns.code),
    name: String(data.n ?? ''),
    changes,
  };
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
    ut: EM_PUSH_TOKEN,
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
    if (Array.isArray(item.ydl)) {
      for (const entry of item.ydl) {
        if (entry?.t === undefined || entry.t === null) continue;
        distribution[String(entry.t)] = Number(entry.ct) || 0;
      }
    } else {
      const distRaw = item.bkdf ?? item.bkdfdis;
      if (distRaw && typeof distRaw === 'object') {
        for (const [k, v] of Object.entries(distRaw as Record<string, unknown>)) {
          distribution[k] = Number(v) || 0;
        }
      }
    }
    return {
      name: String(item.n ?? item.bkn ?? ''),
      changePercent: toNumberSafe(item.u ?? item.bkz),
      mainNetInflow: toNumberSafe(item.zjl ?? item.bkj),
      totalChangeCount: toNumberSafe(item.ct ?? item.bkc),
      topStockCode: String(ms.c ?? ''),
      topStockName: String(ms.n ?? ''),
      topStockDirection: direction,
      changeTypeDistribution: distribution,
    };
  });
}

export async function getUnusualFluctuation(
  client: RequestClient,
  options: UnusualFluctuationOptions = {}
): Promise<UnusualFluctuationItem[]> {
  const { date, startDate, endDate, triggered } = options;
  if (date && (startDate || endDate)) {
    throw new InvalidArgumentError(
      'UnusualFluctuation: date 与 startDate/endDate 不能同时指定。'
    );
  }

  const clauses: string[] = [];
  if (date) {
    clauses.push(`(TRADE_DATE='${toIsoDate(normalizeDate(date)!)}')`);
  } else {
    if (startDate) clauses.push(`(TRADE_DATE>='${toIsoDate(normalizeDate(startDate)!)}')`);
    if (endDate) clauses.push(`(TRADE_DATE<='${toIsoDate(normalizeDate(endDate)!)}')`);
  }
  if (triggered !== undefined) {
    clauses.push(`(IS_HAPPEN="${triggered ? 1 : 0}")`);
  }

  return fetchDatacenterList(
    client,
    {
      reportName: 'RPT_WATCH_UNUSUAL_FLUCTUATE',
      columns: 'ALL',
      sortColumns: 'TRADE_DATE,SECURITY_CODE',
      sortTypes: '-1,1',
      pageSize: 500,
      filter: clauses.length > 0 ? clauses.join('') : undefined,
    },
    (item) => {
      const tradeDate = parseDcDate(item.TRADE_DATE);
      const meta = buildTimeMeta(tradeDate, MARKET_TZ.CN);
      return {
        code: String(item.SECURITY_CODE ?? ''),
        name: String(item.SECURITY_NAME_ABBR ?? ''),
        date: tradeDate,
        timestamp: meta.timestamp,
        tz: meta.tz,
        rule: String(item.UNUSUAL_TYPE ?? ''),
        triggered: String(item.IS_HAPPEN ?? '') === '1',
        deviationValue: toNumberSafe(item.DEVUATION_VALUE),
        windowDays: toNumberSafe(item.MAX_DAYS),
        changePercent: toNumberSafe(item.CHANGE_RATE),
        direction: String(item.IS_POSITIVE ?? '') === '1' ? 'up' : 'down',
        targetChangePercent: toNumberSafe(item.CHANGE_RATE_TARGET),
      };
    }
  );
}
