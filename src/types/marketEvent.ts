import type { MarketTz } from '../core/time';

/**
 * 涨停板 / 盘口异动 数据类型
 */

/** 涨停股池类型 */
export type ZTPoolType =
  | 'zt'         // 涨停股池
  | 'yesterday'  // 昨日涨停
  | 'strong'     // 强势股池
  | 'sub_new'    // 次新股池
  | 'broken'     // 炸板股池
  | 'dt';        // 跌停股池

/**
 * 涨停股池项（统一字段，部分类型某些字段为空）
 */
export interface ZTPoolItem {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 最新价(元) */
  price: number | null;
  /** 涨跌幅(%) */
  changePercent: number | null;
  /** 涨停价(元) - 仅部分池子返回 */
  limitPrice: number | null;
  /** 成交额(元) */
  amount: number | null;
  /** 流通市值(元) */
  floatMarketValue: number | null;
  /** 总市值(元) */
  totalMarketValue: number | null;
  /** 换手率(%) */
  turnoverRate: number | null;
  /** 连板数 - 仅涨停股池返回 */
  continuousBoardCount: number | null;
  /** 首次封板时间 HHMMSS - 涨停/炸板池 */
  firstBoardTime: string | null;
  /** 最后封板时间 HHMMSS - 涨停池 */
  lastBoardTime: string | null;
  /** 封板资金(元) - 涨停池 */
  boardAmount: number | null;
  /** 封单资金(元) - 跌停池 */
  sealAmount: number | null;
  /** 炸板次数 */
  failedCount: number | null;
  /** 所属行业 */
  industry: string;
  /** 涨停统计（如 '3/5' 表示 5 天内涨停 3 次） */
  ztStatistics: string;
  /** 振幅(%) - 部分池子返回 */
  amplitude: number | null;
  /** 涨速 - 部分池子返回 */
  speed: number | null;
}

/** 盘口异动类型 */
export type StockChangeType =
  | 'rocket_launch'       // 火箭发射
  | 'quick_rebound'       // 快速反弹
  | 'large_buy'           // 大笔买入
  | 'limit_up_seal'       // 封涨停板
  | 'limit_down_open'     // 打开跌停板
  | 'big_buy_order'       // 有大买盘
  | 'auction_up'          // 竞价上涨
  | 'high_open_5d'        // 高开 5 日线
  | 'gap_up'              // 向上缺口
  | 'high_60d'            // 60 日新高
  | 'surge_60d'           // 60 日大幅上涨
  | 'accelerate_down'     // 加速下跌
  | 'high_dive'           // 高台跳水
  | 'large_sell'          // 大笔卖出
  | 'limit_down_seal'     // 封跌停板
  | 'limit_up_open'       // 打开涨停板
  | 'big_sell_order'      // 有大卖盘
  | 'auction_down'        // 竞价下跌
  | 'low_open_5d'         // 低开 5 日线
  | 'gap_down'            // 向下缺口
  | 'low_60d'             // 60 日新低
  | 'drop_60d';           // 60 日大幅下跌

/**
 * 盘口异动项
 */
export interface StockChangeItem {
  /** 发生时间 HH:MM:SS */
  time: string;
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 异动类型(由响应 t 码反查;服务端新增的未知码为 'unknown',原始码见 typeCode) */
  changeType: StockChangeType | 'unknown';
  /** 原始类型码(服务端 t 字段) */
  typeCode: string;
  /** 异动类型对应的中文标签(未知码为空串) */
  changeTypeLabel: string;
  /** 相关信息（来自原始接口） */
  info: string;
}

/** 全市场盘口异动查询选项 */
export interface StockChangesOptions {
  /**
   * 页码，从 1 开始。`page` / `pageSize` 任传其一即只请求这一页（单次请求）；
   * 两者都不传时自动翻页返回当日全量（默认行为不变）。
   */
  page?: number;
  /** 每页条数，1–5000，默认 100（上游单页上限 5000）；仅在分页时生效 */
  pageSize?: number;
}

/**
 * 个股盘口异动事件(个股按日接口,字段比全市场接口更丰富)
 */
export interface IndividualStockChangeItem {
  /** 发生时间 HH:MM:SS */
  time: string;
  /** 原始类型码(个股接口会返回 22 类之外的码,如 8219) */
  typeCode: string;
  /** 异动类型(未知码为 'unknown') */
  changeType: StockChangeType | 'unknown';
  /** 中文标签(未知码为空串) */
  changeTypeLabel: string;
  /** 触发价(元) */
  price: number | null;
  /** 触发时涨跌幅(%) */
  changePercent: number | null;
  /** 相关信息（来自原始接口,CSV 格式因类型而异） */
  info: string;
  /** 上游未文档化字段(疑似异动量级),原样透传 */
  v: number | null;
}

/**
 * 个股单个交易日的异动数据
 */
export interface IndividualChangesDay {
  /** 交易日 YYYY-MM-DD */
  date: string;
  /**
   * 服务端该交易日是否有数据。false = 无数据(changes 恒为空),与
   * "当日无异动"(true + 空数组)区分。
   *
   * 注意:服务端仅保留约最近数周(实测 1 个月左右),且窗口**不保证连续**
   * ——实测存在个别日期空洞(更早的日期反而有数据)。永远以逐日返回的
   * available 为准,不要按固定天数推断。
   */
  available: boolean;
  /** 股票代码 */
  code: string;
  /** 股票名称(超窗时为空串) */
  name: string;
  /** 异动事件流(服务端顺序,最新在前) */
  changes: IndividualStockChangeItem[];
}

/**
 * 单个异动类型的计数(IndividualChangesHistory.stats 的值)
 */
export interface ChangeTypeCount {
  /** 出现次数 */
  count: number;
  /** 中文标签(未知类型码为空串) */
  label: string;
}

/**
 * 个股近 N 天异动历史(逐交易日聚合)
 */
export interface IndividualChangesHistory {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 请求的自然日跨度 */
  requestedDays: number;
  /** 实际覆盖情况 */
  coverage: {
    /** 请求窗口起点(自然日)YYYY-MM-DD */
    from: string;
    /** 请求窗口终点(北京时间今天)YYYY-MM-DD */
    to: string;
    /** 窗口内首个有数据的交易日(其后仍可能有个别空洞日);全部无数据时为 null */
    availableFrom: string | null;
  };
  /** 逐交易日数据(按日期升序;available=false 表示服务端该日无数据) */
  days: IndividualChangesDay[];
  /**
   * 异动类型计数概览(仅统计 available 日)。
   * key 为**原始类型码**(typeCode,稳定、可跨会话程序化比较),
   * 中文标签见值内 label(未知码为空串)。
   */
  stats: Record<string, ChangeTypeCount>;
}

/**
 * 板块异动项
 */
export interface BoardChangeItem {
  /** 板块名称 */
  name: string;
  /** 涨跌幅(%) */
  changePercent: number | null;
  /** 主力净流入(元) */
  mainNetInflow: number | null;
  /** 异动总次数 */
  totalChangeCount: number | null;
  /** 异动最频繁个股代码 */
  topStockCode: string;
  /** 异动最频繁个股名称 */
  topStockName: string;
  /** 异动最频繁个股方向：'大笔买入' | '大笔卖出' */
  topStockDirection: string;
  /** 异动类型分布（key 为类型代码，value 为出现次数） */
  changeTypeDistribution: Record<string, number>;
}

/**
 * 监管异动（交易所股票交易异常波动）项
 */
export interface UnusualFluctuationItem {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 交易日 YYYY-MM-DD */
  date: string;
  /** 交易日对应当日 00:00 (`Asia/Shanghai`) 的 UTC 毫秒时间戳;无法解析时为 `null` */
  timestamp: number | null;
  /** 交易日所属市场时区 (`Asia/Shanghai`) */
  tz: MarketTz;
  /** 触发规则原文，如「连续十个交易日内日收盘价涨跌幅偏离值累计达到+100%」 */
  rule: string;
  /** 是否已触发（`false` 表示逼近阈值但尚未触发） */
  triggered: boolean;
  /** 累计涨跌幅偏离值(%)，与规则中的阈值同口径 */
  deviationValue: number | null;
  /** 规则统计窗口天数 */
  windowDays: number | null;
  /** 当日涨跌幅(%) */
  changePercent: number | null;
  /** 异动方向：`'up'` 同向上涨 / `'down'` 同向下跌 */
  direction: 'up' | 'down';
  /** 上游 CHANGE_RATE_TARGET 原值(%)，语义以上游为准 */
  targetChangePercent: number | null;
}

/** 监管异动查询选项 */
export interface UnusualFluctuationOptions {
  /** 指定交易日 YYYYMMDD 或 YYYY-MM-DD；与 startDate/endDate 互斥 */
  date?: string;
  /** 起始交易日 YYYYMMDD 或 YYYY-MM-DD */
  startDate?: string;
  /** 结束交易日 YYYYMMDD 或 YYYY-MM-DD */
  endDate?: string;
  /** 仅返回已触发(`true`) 或仅返回逼近未触发(`false`)；缺省返回全部 */
  triggered?: boolean;
}
