/**
 * 公募基金扩展数据类型
 *
 * 对应数据源：天天基金 / 东方财富的基金数据频道
 * （https://fund.eastmoney.com/data/fundfenhong.html 等）。
 */

/** 分红查询排序字段（与东方财富接口 `rank` 参数一一对应） */
export type FundDividendRank =
  | 'BZDM' // 基金代码
  | 'ABBNAME' // 基金简称
  | 'DJR' // 权益登记日
  | 'FSRQ' // 除息日期
  | 'FHFCZ' // 分红(元/份)
  | 'FFR'; // 分红发放日

/** 通用排序方向（升序 / 降序） */
export type FundSortDirection = 'asc' | 'desc';

/** 基金分红查询选项 */
export interface FundDividendListOptions {
  /** 查询年份；默认当前年（Asia/Shanghai） */
  year?: number | string;
  /**
   * 页码：从 1 开始；默认 `1`。
   * 设为 `'all'` 时自动翻完该年份所有页面并聚合结果。
   */
  page?: number | 'all';
  /**
   * 基金类型筛选，空 / undefined 表示全部。
   * 例如 `'股票型'`、`'指数型-股票'`、`'混合型-偏股'`、`'REITs'` 等
   * （字符串与东方财富接口 `ftype` 参数原样对应）。
   */
  fundType?: string;
  /** 排序字段，默认 `'FSRQ'`（除息日期） */
  rank?: FundDividendRank;
  /** 排序方向，默认 `'desc'` */
  sort?: FundSortDirection;
  /**
   * 按基金代码过滤（客户端过滤，因为接口本身不支持按代码精确查）。
   * 一般搭配 `page: 'all'` 使用，否则可能因目标记录不在当前页而无结果。
   */
  code?: string;
}

/** 一条基金分红记录 */
export interface FundDividend {
  /** 基金代码 */
  code: string;
  /** 基金简称 */
  name: string;
  /** 权益登记日（`YYYY-MM-DD`），无则 `null` */
  equityRecordDate: string | null;
  /** 除息日期（`YYYY-MM-DD`），无则 `null` */
  exDividendDate: string | null;
  /** 分红金额（元/份），无则 `null` */
  dividendPerShare: number | null;
  /** 分红发放日（`YYYY-MM-DD`），无则 `null` */
  payDate: string | null;
  /** 分红类型代码（接口第 7 列原始口径，如拆分/派现的类型标识），无则 `null` */
  dividendType: string | null;
}

/** 基金分红查询结果 */
export interface FundDividendListResult {
  /** 当前页（或聚合后）的分红记录 */
  items: FundDividend[];
  /** 数据源汇报的总页数 */
  totalPages: number;
  /** 数据源汇报的每页条数 */
  pageSize: number;
  /** 当前页码；`page: 'all'` 模式下为 `-1` 表示已聚合 */
  currentPage: number;
}

/** 单条历史净值点 */
export interface FundNavPoint {
  /** 净值日期 `YYYY-MM-DD`（与时间戳的 UTC 日期一致，对应 A 股交易日） */
  date: string;
  /** 净值日期对应的毫秒时间戳（数据源原值，UTC 当日 00:00） */
  timestamp: number | null;
  /**
   * 单位净值；上游该行净值缺失 / 非数值时为 `null`
   * （v2.4.0 起从 `number` 放宽，与 accNav / dailyReturn 的可空口径一致）
   */
  nav: number | null;
  /** 累计净值；与单位净值数组按 timestamp 对齐，无法对齐时为 `null` */
  accNav: number | null;
  /** 日增长率（%）；无值时为 `null` */
  dailyReturn: number | null;
  /** 每万份收益（货币 / 短债基金有意义，其余通常为空串） */
  unitMoney: string;
}

/** 基金历史净值查询结果 */
export interface FundNavHistory {
  /** 基金代码（来自 pingzhongdata 的 `fS_code`，若缺失则回填入参） */
  code: string;
  /** 基金简称（来自 pingzhongdata 的 `fS_name`，无则 `null`） */
  name: string | null;
  /** 历史净值序列；按日期升序（与数据源一致） */
  items: FundNavPoint[];
}

/**
 * 基金当日实时估值（来自天天基金 fundgz 接口）。
 *
 * 含两类净值：
 * - `nav` / `navDate`：最新已结算的单位净值（T-1 或当日盘后）
 * - `estimatedNav` / `estimatedChangePercent` / `estimateTime`：盘中实时估值
 */
export interface FundEstimate {
  /** 基金代码 */
  code: string;
  /** 基金简称 */
  name: string | null;
  /** 最新已结算单位净值的日期 `YYYY-MM-DD`，无则 `null` */
  navDate: string | null;
  /** 最新已结算单位净值，无则 `null` */
  nav: number | null;
  /** 当日实时估值（盘中刷新），无则 `null`（如非交易日、QDII 等） */
  estimatedNav: number | null;
  /** 估算涨跌幅 `%`，无则 `null` */
  estimatedChangePercent: number | null;
  /** 估算时间原始字符串（如 `"2026-05-26 15:00"`，A 股时区），无则 `null` */
  estimateTime: string | null;
}

/** 单条同类排名点（与 `Data_rateInSimilarType` 一一对应） */
export interface FundRankPoint {
  /** 报告日期 `YYYY-MM-DD` */
  date: string;
  /** 报告日期对应的毫秒时间戳（数据源原值） */
  timestamp: number | null;
  /** 同类近三月排名（数字越小越靠前），无值时为 `null` */
  rank: number | null;
  /** 同类基金总数，无值时为 `null` */
  total: number | null;
  /**
   * 同类近三月排名百分位（%，越小越好），按 timestamp 与 rank 对齐；
   * 无对应数据时为 `null`
   */
  percentile: number | null;
}

/** 基金同类排名走势查询结果 */
export interface FundRankHistory {
  /** 基金代码（来自 pingzhongdata 的 `fS_code`，若缺失则回填入参） */
  code: string;
  /** 基金简称（来自 pingzhongdata 的 `fS_name`，无则 `null`） */
  name: string | null;
  /** 排名走势序列；按日期升序 */
  items: FundRankPoint[];
}

// ============================================================
// 基金深度资料（pingzhongdata 全量字段）
// ============================================================

/** 前十大重仓股 */
export interface FundHolding {
  /** 股票代码（纯数字 6 位，如 `"600519"`） */
  code: string;
  /** 新市场号（`"0"`=深圳, `"1"`=上海），用于拼接东财 secid */
  marketId: string;
}

/** 前五大债券持仓 */
export interface FundBondHolding {
  /** 债券代码 */
  code: string;
  /** 新市场号 */
  marketId: string;
}

/** 资产配置项（单季度） */
export interface FundAssetAllocation {
  /** 报告期 `YYYY-MM-DD` */
  date: string;
  /** 报告期 UTC 毫秒时间戳；日期串无法解析时为 `null`（不产出 NaN） */
  timestamp: number | null;
  /** 股票占净值比（%） */
  stockRatio: number;
  /** 债券占净值比（%） */
  bondRatio: number;
  /** 现金占净值比（%） */
  cashRatio: number;
  /** 其他资产占净值比（%）；上游部分基金不提供该项，缺失时为 `0` */
  otherRatio: number;
  /** 净资产（亿元） */
  netAsset: number;
}

/** 股票仓位测算点（每日） */
export interface FundPositionPoint {
  /** 日期 `YYYY-MM-DD` */
  date: string;
  /** UTC 毫秒时间戳 */
  timestamp: number;
  /** 股票仓位占比（%） */
  position: number;
}

/** 基金经理信息 */
export interface FundManager {
  /** 基金经理 ID */
  id: string;
  /** 姓名 */
  name: string;
  /** 头像图片 URL；无则为 `null` */
  avatarUrl: string | null;
  /** 天天基金星级（0–5）；无评级为 `null` */
  star: number | null;
  /**
   * 任职年限描述（东财原文，如 `"14年又192天"`）；无则为 `null`。
   * 上游只提供这段中文描述，不提供可计算的天数/起始日，故原样透传。
   */
  workTime: string | null;
  /**
   * 在管基金规模描述（东财原文，如 `"78.91亿(4只基金)"`）；无则为 `null`。
   * 规模与只数被上游拼在同一段字符串里，原样透传不做拆解。
   */
  fundSize: string | null;
  /**
   * 基金经理能力评分（综合分 + 各维度雷达），结构同 {@link FundPerformanceEvaluation}；
   * 无评分为 `null`。
   */
  power: FundPerformanceEvaluation | null;
}

/** 业绩评价 */
export interface FundPerformanceEvaluation {
  /** 综合评分 */
  overall: number;
  /** 评价维度 */
  categories: string[];
  /** 各维度得分 */
  scores: number[];
  /** 各维度描述 */
  descriptions: string[];
}

/** 持有人结构（单期） */
export interface FundHolderStructure {
  /** 报告期 `YYYY-MM-DD` */
  date: string;
  /** 报告期 UTC 毫秒时间戳；日期串无法解析时为 `null`（不产出 NaN） */
  timestamp: number | null;
  /** 机构持有比例（%） */
  institutionRatio: number;
  /** 个人持有比例（%） */
  individualRatio: number;
  /** 内部持有比例（%） */
  internalRatio: number;
}

/** 规模变动（单季度） */
export interface FundScaleChange {
  /** 报告期 `YYYY-MM-DD` */
  date: string;
  /** 基金规模（亿元） */
  scale: number;
  /** 环比变动（东财原文，如 `"3.67%"` / `"-1.20%"`，不带前导 `+`） */
  mom: string;
}

/** 申购赎回（单季度） */
export interface FundBuySedemption {
  /** 报告期 `YYYY-MM-DD` */
  date: string;
  /** 报告期 UTC 毫秒时间戳；日期串无法解析时为 `null`（不产出 NaN） */
  timestamp: number | null;
  /** 期间申购（亿份） */
  buy: number;
  /** 期间赎回（亿份） */
  sell: number;
  /** 期末总份额（亿份）；上游 series 名为「总份额」 */
  total: number;
}

/** 阶段收益率 */
export interface FundStageReturns {
  /** 近一月收益率（%） */
  oneMonth: number | null;
  /** 近三月收益率（%） */
  threeMonth: number | null;
  /** 近六月收益率（%） */
  sixMonth: number | null;
  /** 近一年收益率（%） */
  oneYear: number | null;
}

/** 同类基金中的一只 */
export interface FundSameTypePeer {
  /** 基金代码（纯数字） */
  code: string;
  /** 基金简称 */
  name: string;
  /**
   * 东财附带的排序数值（随分组维度而定，通常为某区间收益或净值）；
   * 无法解析为 `null`。
   */
  value: number | null;
}

/**
 * 同类基金（用于「切换同类基金」对比）。
 *
 * 上游 `swithSameType` 是一个二维数组：东财按多个维度各取一组同类基金，
 * 故这里用 `groups`（外层为分组、内层为该组下的基金）如实表达。
 * 只想要去重后的代码列表可自行 `groups.flat()`。
 */
export interface FundSameType {
  /** 同类基金分组 */
  groups: FundSameTypePeer[][];
}

/**
 * 基金深度资料（pingzhongdata 全量字段，一次请求返回）。
 *
 * 数据源：`https://fund.eastmoney.com/pingzhongdata/{code}.js`
 */
export interface FundProfile {
  /** 基金代码 */
  code: string;
  /** 基金简称 */
  name: string | null;
  /** 原申购费率（%） */
  sourceRate: number | null;
  /** 现申购费率（%） */
  rate: number | null;
  /** 最小申购金额（元） */
  minSubscription: number | null;
  /** 前十大重仓股 */
  holdings: FundHolding[];
  /** 前五大债券持仓 */
  bondHoldings: FundBondHolding[];
  /** 资产配置（按季度，最近 4 期） */
  assetAllocation: FundAssetAllocation[];
  /** 股票仓位测算（每日，最近约 20 个交易日） */
  positions: FundPositionPoint[];
  /** 基金经理列表 */
  managers: FundManager[];
  /** 业绩评价 */
  performance: FundPerformanceEvaluation | null;
  /** 持有人结构（按报告期） */
  holderStructure: FundHolderStructure[];
  /** 规模变动（按季度） */
  scaleChanges: FundScaleChange[];
  /** 申购赎回（按季度） */
  buySedemption: FundBuySedemption[];
  /** 阶段收益率 */
  stageReturns: FundStageReturns;
  /** 同类基金 */
  sameType: FundSameType | null;
}

// ============================================================
// 主题基金（Theme Fund）
// ============================================================

/** 主题基金排序字段（对应 FundMNSubjectList / FundThemeList 的 RankItems） */
export type ThemeFundSort =
  | 'ZDF'    // 日涨幅
  | 'SYL_W'  // 近1周
  | 'SYL_M'  // 近1月
  | 'SYL_3M' // 近3月
  | 'SYL_6M' // 近6月
  | 'SYL_Y'  // 近1年
  | 'SYL_3Y' // 近3年
  | 'SYL_5Y'; // 近5年

/** 主题基金排序方向 */
export type ThemeFundOrder = 'desc' | 'asc';

/** 主题基金类型筛选 */
export type ThemeCategory = '0' | '1' | '2'; // 0=行业, 1=概念, 2=全部

/** 获取主题列表选项 */
export interface GetThemeListOptions {
  sort?: ThemeFundSort;
  order?: ThemeFundOrder;
  category?: ThemeCategory;
  pageSize?: number;
  page?: number;
}

/** 获取热门主题选项 */
export interface GetHotThemesOptions {
  sort?: ThemeFundSort;
  order?: ThemeFundOrder;
  category?: ThemeCategory;
  limit?: number;
}

/** 主题基金排行排序字段（对应 FundMNRank 的 SortColumn） */
export type ThemeFundRankSort =
  | 'SYL_Z'   // 近1周
  | 'SYL_Y'   // 近1月
  | 'SYL_3Y'  // 近3月
  | 'SYL_1N'  // 近1年
  | 'RZDF';   // 日涨幅

/** 获取主题下基金选项 */
export interface GetThemeFundsOptions {
  sortColumn?: ThemeFundRankSort;
  sort?: ThemeFundOrder;
  page?: number;
  pageSize?: number;
  fundType?: string;
}

/** 主题基金条目（主题列表） */
export interface ThemeFund {
  code: string;
  name: string;
  dailyChange: number | null;
  weeklyReturn: number | null;
  monthlyReturn: number | null;
  quarterlyReturn: number | null;
  halfYearReturn: number | null;
  yearlyReturn: number | null;
  threeYearReturn: number | null;
  fiveYearReturn: number | null;
  type: '行业' | '概念';
}

/** 主题基金列表结果 */
export interface ThemeFundListResult {
  items: ThemeFund[];
  totalPages: number;
  pageSize: number;
  currentPage: number;
}

/** 热门主题结果（直接返回数组） */
export type HotThemesResult = ThemeFund[];

/** 主题下基金条目 */
export interface ThemeFundItem {
  code: string;
  name: string;
  fundType: string;
  dailyChange: number | null;
  weeklyReturn: number | null;
  monthlyReturn: number | null;
  quarterlyReturn: number | null;
  yearlyReturn: number | null;
  nav: number | null;
  themeCode: string;
  /** 主题名称：上游 FundMNRank 不返回，通常缺省，调用方可用 themeCode 自行映射 */
  themeName?: string;
}

/** 主题下基金列表结果 */
export interface ThemeFundItemList {
  items: ThemeFundItem[];
  total: number;
  pageIndex: number;
  pageSize: number;
}
