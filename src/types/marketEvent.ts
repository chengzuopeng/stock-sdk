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
  /** 异动类型 */
  changeType: StockChangeType;
  /** 异动类型对应的中文标签 */
  changeTypeLabel: string;
  /** 相关信息（来自原始接口） */
  info: string;
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
