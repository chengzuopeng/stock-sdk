/**
 * 共享方法 spec —— CLI 与 MCP 的单一事实来源（SSOT）。
 *
 * 每个命名空间方法在此声明一次（路径 / 形态 / 参数 / 枚举 / 必填 / 文案 / MCP 工具名与分级），
 * 两端各自派生：
 * - CLI：`src/spec/derive-cli.ts` 的 `toCommandSpec` → `src/cli/manifest.ts` 的 NAMESPACE_COMMANDS；
 * - MCP：`src/spec/derive-mcp.ts` 的 `toToolDef` → `src/mcp/tools/index.ts` 的 TOOLS。
 *
 * 两端表面差异在 ParamSpec 上显式声明，杜绝两份手写清单各自漂移：
 * - `flag` 是 CLI flag 名；`field` 是 SDK options 字段名；`jsonKey` 是 MCP 属性名
 *   （如港/美分时 CLI 用 `--ndays`、MCP 对外名是 `recentDays`，SDK 字段是 `ndays`）；
 * - `map` 是 CLI 取值映射（adjust 的 `none` → `''`），MCP 线上枚举由 enum 经 map 映射派生；
 * - `cli: false` 表示该参数 CLI 不声明（该命令 CLI 现状为「未声明 flag 透传」，保持不变）；
 * - `mcp: false` 表示 MCP schema 不含该参数（仅 CLI 可达，如美股分时的 --start/--end）。
 *
 * 本模块是纯数据 + 类型：不 import CLI/MCP 的实现，两端可安全引用。
 */
import type { ArgShape } from '../cli/types';

/** 一个参数（CLI `--flag` / MCP inputSchema 属性）的统一声明。 */
export interface ParamSpec {
  /** CLI flag 名（不含 `--`）。 */
  flag: string;
  /** SDK options 字段名（缺省同 flag）。 */
  field?: string;
  /** MCP inputSchema 属性名（缺省 `field ?? flag`；如 recentDays vs --ndays）。 */
  jsonKey?: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'number[]';
  /** enum 类型的 CLI 取值；MCP 线上枚举 = 各取值经 `map` 映射（none→''）。 */
  enum?: string[];
  /** CLI 取值映射（命中则替换最终值），亦用于派生 MCP 线上枚举。 */
  map?: Record<string, string>;
  /** CLI 传 SDK 前 `toUpperCase()`（MCP 枚举本身就是最终取值，无需归一）。 */
  upper?: boolean;
  /** 必填：CLI 缺失报「缺少必填选项」；MCP 进 schema.required。 */
  required?: boolean;
  /** 仅 MCP schema 展示用默认值（两端均不注入实参，默认值由 SDK 自身落地）。 */
  default?: string | number | boolean;
  /** CLI help 文案。 */
  desc: string;
  /** MCP 属性 description（缺省用 desc）。 */
  mcpDesc?: string;
  /** false → CLI 不声明该 flag（保持该命令「未声明即透传」的现状）。 */
  cli?: false;
  /** false → MCP schema 不含该参数（仅 CLI 可达）。 */
  mcp?: false;
}

/** 一个位置参数的统一声明（MCP 侧派生为同名属性，required 跟随）。 */
export interface SpecPositional {
  name: string;
  required?: boolean;
  /** 收集剩余位置参数（仅 CLI 别名使用；spec 表内方法目前不用）。 */
  variadic?: boolean;
  enum?: string[];
  /** CLI 传 SDK 前 `toUpperCase()`。 */
  upper?: boolean;
  /** MCP 属性 description（有 MCP 工具的方法必填；CLI 帮助不展示）。 */
  desc?: string;
  /** 仅 MCP schema 展示用默认值。 */
  default?: string;
}

/** 一个命名空间方法的完整声明（一处定义，两端派生）。 */
export interface MethodSpec {
  /** 方法路径：['kline','hk'] → sdk.kline.hk；顶层 ['search'] → sdk.search。 */
  path: string[];
  /** MCP 工具名（mcp:false 时省略）。 */
  toolName?: string;
  /** MCP 工具集分级（缺省 full）。 */
  tier?: 'core' | 'full';
  /** CLI 一行摘要（help 用）。 */
  summary: string;
  /** MCP 工具 description（缺省用 summary；MCP 文案通常更richer）。 */
  mcpDesc?: string;
  argShape: ArgShape;
  positional?: SpecPositional[];
  params?: ParamSpec[];
  /** false → CLI-only 方法，MCP 无对应工具（如 batch.raw / blockTrade / margin）。 */
  mcp?: false;
  /**
   * true → MCP 工具 schema/invoke 手写（src/mcp/tools/ 下），spec 仅提供
   * toolName/tier/mcpDesc 与 CLI 派生面。目前仅 kline.withIndicators 一个
   * （MCP 用嵌套 indicators 对象、CLI 用 14 个扁平指标 flag，两端表面形态不同）。
   */
  mcpCustom?: true;
}

// ---------- 共享枚举（全库唯一定义处，两端引用） ----------
/** 复权 CLI 取值（MCP 线上取值 = 经 ADJUST.map 映射后的 ['qfq','hfq','']）。 */
export const ADJUST_VALUES: string[] = ['qfq', 'hfq', 'none'];
/** 历史 K 线周期。 */
export const PERIOD_DWM_VALUES: string[] = ['daily', 'weekly', 'monthly'];
/** 分钟 K 线周期。 */
export const PERIOD_MIN_VALUES: string[] = ['1', '5', '15', '30', '60'];
/** A 股板块筛选。 */
export const CN_BOARD_VALUES: string[] = ['sh', 'sz', 'bj', 'kc', 'cy'];
/** 美股交易所筛选。 */
export const US_MARKET_VALUES: string[] = ['NASDAQ', 'NYSE', 'AMEX'];
/** 市场（A/HK/US）。 */
export const SUPPORTED_MARKETS: string[] = ['A', 'HK', 'US'];
/** 沪深港通方向。 */
export const NB_DIRECTIONS: string[] = ['north', 'south'];
/** 涨停股池类型（见 src/types/marketEvent.ts ZTPoolType）。 */
export const ZT_POOL_TYPES: string[] = ['zt', 'yesterday', 'strong', 'sub_new', 'broken', 'dt'];
/** 龙虎榜统计周期（DragonTigerPeriod 全量取值）。 */
export const DRAGON_TIGER_PERIODS: string[] = ['1month', '3month', '6month', '1year'];
/** ETF 期权品种（src/types/options.ts: ETFOptionCate）。 */
export const ETF_OPTION_CATES: string[] = ['50ETF', '300ETF', '500ETF', '科创50', '科创板50'];
/** 中金所股指期权产品（src/types/options.ts: IndexOptionProduct）。 */
export const INDEX_OPTION_PRODUCTS: string[] = ['ho', 'io', 'mo'];
/** COMEX 库存品种。 */
export const COMEX_SYMBOLS: string[] = ['gold', 'silver'];
/** 盘口异动类型（见 src/types/marketEvent.ts StockChangeType，全 22 项）。 */
export const STOCK_CHANGE_TYPES: string[] = [
  'rocket_launch', // 火箭发射
  'quick_rebound', // 快速反弹
  'large_buy', // 大笔买入
  'limit_up_seal', // 封涨停板
  'limit_down_open', // 打开跌停板
  'big_buy_order', // 有大买盘
  'auction_up', // 竞价上涨
  'high_open_5d', // 高开 5 日线
  'gap_up', // 向上缺口
  'high_60d', // 60 日新高
  'surge_60d', // 60 日大幅上涨
  'accelerate_down', // 加速下跌
  'high_dive', // 高台跳水
  'large_sell', // 大笔卖出
  'limit_down_seal', // 封跌停板
  'limit_up_open', // 打开涨停板
  'big_sell_order', // 有大卖盘
  'auction_down', // 竞价下跌
  'low_open_5d', // 低开 5 日线
  'gap_down', // 向下缺口
  'low_60d', // 60 日新低
  'drop_60d', // 60 日大幅下跌
];

// ---------- 可复用参数片段（CLI 旧 manifest 的 option 片段在此单一来源化） ----------
/** 复权（个股/期货 K 线默认 qfq；板块用 BOARD_ADJUST 变体覆盖默认与 MCP 文案）。 */
export const ADJUST: ParamSpec = {
  flag: 'adjust',
  type: 'enum',
  enum: ADJUST_VALUES,
  map: { none: '' },
  default: 'qfq',
  desc: '复权：qfq 前复权(默认) / hfq 后复权 / none 不复权',
  mcpDesc: "复权：qfq=前复权(默认,看走势) / hfq=后复权(算收益) / ''=不复权",
};
/**
 * 板块复权：board provider 默认 ''（不复权），与个股的 qfq 默认不同 ——
 * 仅覆盖 default 与 MCP 文案，枚举仍引用唯一的 ADJUST_VALUES（无第三套变体）。
 */
const BOARD_ADJUST: ParamSpec = {
  ...ADJUST,
  default: '',
  mcpDesc: "复权方式，默认不复权（''）；需前复权传 qfq（看走势），后复权传 hfq（算收益）",
};
export const PERIOD_DWM: ParamSpec = {
  flag: 'period',
  type: 'enum',
  enum: PERIOD_DWM_VALUES,
  default: 'daily',
  desc: 'K 线周期 daily/weekly/monthly',
  mcpDesc: '历史 K 线周期',
};
export const PERIOD_MIN: ParamSpec = {
  flag: 'period',
  type: 'enum',
  enum: PERIOD_MIN_VALUES,
  default: '1',
  desc: '分钟周期 1/5/15/30/60',
  mcpDesc: '分钟周期；1=当日分时',
};
/** 板块分钟周期：board provider 默认 '5'（与共享 PERIOD_MIN 的默认 '1' 不同）。 */
const BOARD_PERIOD_MIN: ParamSpec = {
  ...PERIOD_MIN,
  default: '5',
  mcpDesc: '分钟周期；默认 5（5 分钟 K 线），当日分时请传 period=1',
};
export const START: ParamSpec = {
  flag: 'start',
  field: 'startDate',
  type: 'string',
  desc: '开始日期 YYYYMMDD',
  mcpDesc: '起始日期 YYYYMMDD',
};
export const END: ParamSpec = {
  flag: 'end',
  field: 'endDate',
  type: 'string',
  desc: '结束日期 YYYYMMDD',
  mcpDesc: '结束日期 YYYYMMDD',
};
const START_REQ: ParamSpec = { ...START, required: true };
const END_REQ: ParamSpec = { ...END, required: true };
// A 股分时窗口（MCP 现行文案为「开始/结束时间」）
const START_MIN_CN: ParamSpec = { ...START, mcpDesc: '开始时间' };
const END_MIN_CN: ParamSpec = { ...END, mcpDesc: '结束时间' };
// 港股分时窗口（本地时区时间格式）
const START_MIN_HK: ParamSpec = { ...START, mcpDesc: '开始时间 YYYY-MM-DD HH:mm（港股本地时区）' };
const END_MIN_HK: ParamSpec = { ...END, mcpDesc: '结束时间 YYYY-MM-DD HH:mm（港股本地时区）' };
// 美股分时：MCP 工具不暴露时间窗口（保持现行 schema），CLI 侧保留 --start/--end
const START_CLI_ONLY: ParamSpec = { ...START, mcp: false };
const END_CLI_ONLY: ParamSpec = { ...END, mcp: false };
// 北向系列日期为 YYYY-MM-DD
const START_NB: ParamSpec = { ...START, mcpDesc: '起始日期 YYYY-MM-DD' };
const END_NB: ParamSpec = { ...END, mcpDesc: '结束日期 YYYY-MM-DD' };
// northbound.individual 的 CLI 现状为未声明透传（--start 经 FLAG_ALIAS 仍可达）
const START_NB_MCP_ONLY: ParamSpec = { ...START_NB, cli: false };
const END_NB_MCP_ONLY: ParamSpec = { ...END_NB, cli: false };
/** 港/美股分时 ndays：CLI flag --ndays、MCP 对外名 recentDays、SDK 字段 ndays。 */
export const NDAYS: ParamSpec = {
  flag: 'ndays',
  jsonKey: 'recentDays',
  type: 'number',
  desc: '最近 N 个交易日分时(仅 period=1 生效)',
  mcpDesc: '仅 period=1 生效：返回最近 N 个交易日的分时，默认 1（当日）',
};
// A 股板块筛选与美股交易所筛选是两套取值，必须分开声明 ——
// 此前 codes.us/batch.us 复用 sh/sz/bj/kc/cy 的 desc 且无 enum 校验，
// 按 help 传 `--market sh` 会拼出 startsWith(undefined) 静默返回空列表。
const CN_BOARD: ParamSpec = {
  flag: 'market',
  type: 'enum',
  enum: CN_BOARD_VALUES,
  desc: '市场筛选 sh/sz/bj/kc/cy',
  mcpDesc: '按板块筛选',
};
const US_MARKET: ParamSpec = {
  flag: 'market',
  type: 'enum',
  enum: US_MARKET_VALUES,
  upper: true,
  desc: '交易所筛选 NASDAQ/NYSE/AMEX',
};
/** 带指标 K 线的市场（不传由 symbol 自动识别）。 */
export const MARKET_ENUM: ParamSpec = {
  flag: 'market',
  type: 'enum',
  enum: SUPPORTED_MARKETS,
  upper: true,
  desc: '市场(默认自动识别)',
  mcpDesc: '市场类型 A / HK / US；不传则由 symbol 自动识别',
};
const BATCH_SIZE: ParamSpec = {
  flag: 'batchSize',
  type: 'number',
  desc: '单批数量(默认 500)',
  mcpDesc: '单批代码数，默认 500',
};
const CONCURRENCY: ParamSpec = {
  flag: 'concurrency',
  type: 'number',
  desc: '并发数(默认 7)',
  mcpDesc: '并发数，默认 7',
};
const SIMPLE: ParamSpec = { flag: 'simple', type: 'boolean', desc: '去掉交易所前缀' };
const SIMPLE_US: ParamSpec = { ...SIMPLE, mcpDesc: '去掉市场前缀' };
/** northbound 的 --direction flag（CLI 专属：与位置参数二选一，custom invoke 消化）。 */
const DIRECTION_FLAG: ParamSpec = {
  flag: 'direction',
  type: 'enum',
  enum: NB_DIRECTIONS,
  mcp: false,
  desc: '方向 north / south',
};

// ---------- 指标参数（单一来源：周期型 / 布尔型列表驱动声明 + 解析） ----------
/** 周期型指标(number[]，如 ma 5,10,20)。 */
export const PERIOD_INDICATORS = ['ma', 'rsi', 'wr', 'bias'] as const;
/** 布尔型指标(开关启用)。 */
export const BOOL_INDICATORS = ['macd', 'kdj', 'boll', 'cci', 'atr', 'obv', 'roc', 'dmi', 'sar', 'kc'] as const;
/** 全部指标 flag（CLI 专属：MCP 侧 withIndicators 用嵌套 indicators 对象表达，工具手写）。 */
const INDICATOR_PARAMS: ParamSpec[] = [
  ...PERIOD_INDICATORS.map(
    (flag): ParamSpec => ({
      flag,
      type: 'number[]',
      mcp: false,
      desc: `${flag.toUpperCase()} 周期(逗号分隔，如 5,10；仅 --${flag} 用默认)`,
    })
  ),
  ...BOOL_INDICATORS.map(
    (flag): ParamSpec => ({ flag, type: 'boolean', mcp: false, desc: `启用 ${flag.toUpperCase()}` })
  ),
];

// fundFlow 排名参数（CLI 现状未声明 → 保持透传，仅 MCP 声明）
const FF_INDICATOR: ParamSpec = {
  flag: 'indicator',
  type: 'enum',
  enum: ['today', '3day', '5day', '10day'],
  default: 'today',
  cli: false,
  desc: '排名周期 today/3day/5day/10day',
  mcpDesc: '排名周期：today=今日(默认) / 3day / 5day / 10day',
};
const FF_SECTOR_TYPE: ParamSpec = {
  flag: 'sectorType',
  type: 'enum',
  enum: ['industry', 'concept', 'region'],
  default: 'industry',
  cli: false,
  desc: '板块类型 industry/concept/region',
  mcpDesc: '板块类型：industry=行业(默认) / concept=概念 / region=地域',
};
// northbound.holdingRank 参数（CLI 现状未声明 → 保持透传）
const NB_HOLDING_MARKET: ParamSpec = {
  flag: 'market',
  type: 'enum',
  enum: ['all', 'shanghai', 'shenzhen'],
  default: 'all',
  cli: false,
  desc: '市场 all/shanghai/shenzhen',
  mcpDesc: '市场:all(默认) / shanghai=沪股通 / shenzhen=深股通',
};
const NB_RANK_PERIOD: ParamSpec = {
  flag: 'period',
  type: 'enum',
  enum: ['today', '3day', '5day', '10day', 'month', 'quarter', 'year'],
  default: '5day',
  cli: false,
  desc: '排名周期 today/3day/5day/10day/month/quarter/year',
  mcpDesc: '排名周期:today / 3day / 5day(默认) / 10day / month / quarter / year',
};
const NB_RANK_DATE: ParamSpec = {
  flag: 'date',
  type: 'string',
  cli: false,
  desc: '指定交易日 YYYY-MM-DD',
  mcpDesc: '指定交易日 YYYY-MM-DD（默认服务端最新交易日）',
};
// futures / options 的分页与扩展参数（CLI 现状未声明 → 保持透传或拒绝，详见各方法注释）
const PAGE_SIZE_20: ParamSpec = { flag: 'pageSize', type: 'number', cli: false, desc: '每页条数，默认 20' };
const PAGE_SIZE_20000: ParamSpec = { flag: 'pageSize', type: 'number', cli: false, desc: '每页条数，默认 20000' };
const PAGE_SIZE_500: ParamSpec = {
  flag: 'pageSize',
  type: 'number',
  cli: false,
  desc: '单页批量大小，默认 500；接口返回全量历史，过大时会被裁剪',
};
const FUTURES_MARKET_CODE: ParamSpec = {
  flag: 'marketCode',
  type: 'number',
  cli: false,
  desc: '东财市场代码（未内置品种时手动指定）',
};
const FUTURES_INV_START: ParamSpec = {
  flag: 'start',
  field: 'startDate',
  type: 'string',
  cli: false,
  desc: '开始日期 YYYY-MM-DD，默认 2020-10-28',
};
// 期货 K 线的 --adjust：SDK/MCP 不消费，但 CLI 现状声明且透传，保持 CLI 行为不变
const ADJUST_CLI_ONLY: ParamSpec = { ...ADJUST, mcp: false };
// 龙虎榜统计周期（位置参数对应的 MCP 文案）
const DT_PERIOD_DESC = '统计周期：1month / 3month / 6month / 1year，默认 1month';
// fund.dividendList 参数（CLI 现状未声明 → 保持透传，仅 MCP 声明）
const FUND_DIVIDEND_PARAMS: ParamSpec[] = [
  { flag: 'year', type: 'string', cli: false, desc: '查询年份，如 "2026"；默认当前年（Asia/Shanghai）' },
  {
    flag: 'page',
    type: 'string',
    cli: false,
    desc: "页码（从 1 开始）的数字字符串，或 'all' 自动翻完该年所有页并聚合；默认 1",
  },
  {
    flag: 'fundType',
    type: 'string',
    cli: false,
    desc: "基金类型筛选，空表示全部，如 '股票型' / '指数型-股票' / '混合型-偏股' / 'REITs'",
  },
  {
    flag: 'rank',
    type: 'enum',
    enum: ['BZDM', 'ABBNAME', 'DJR', 'FSRQ', 'FHFCZ', 'FFR'],
    default: 'FSRQ',
    cli: false,
    desc:
      '排序字段：BZDM=基金代码 / ABBNAME=基金简称 / DJR=权益登记日 / FSRQ=除息日期(默认) / FHFCZ=分红(元/份) / FFR=分红发放日',
  },
  {
    flag: 'sort',
    type: 'enum',
    enum: ['asc', 'desc'],
    default: 'desc',
    cli: false,
    desc: '排序方向：asc=升序 / desc=降序(默认)',
  },
  { flag: 'code', type: 'string', cli: false, desc: "按基金代码过滤（客户端过滤），一般搭配 page='all' 使用" },
];

// ---------- 常用位置参数 ----------
const SYMBOL_REQ = (desc: string): SpecPositional => ({ name: 'symbol', required: true, desc });
const CODE_REQ = (desc: string): SpecPositional => ({ name: 'code', required: true, desc });
const STOCK_SYMBOL_DESC = '单只股票代码，如 600519 / sh600519';

// ---------- 85 个方法定义（84 命名空间方法 + 顶层 search） ----------
export const METHOD_SPECS: MethodSpec[] = [
  // ===== quotes (8) =====
  {
    path: ['quotes', 'cn'],
    toolName: 'get_a_share_quotes',
    tier: 'core',
    summary: 'A股全量行情(含五档)',
    mcpDesc: '获取 A 股 / 指数全量行情（腾讯）：最新价、涨跌幅、五档盘口、市值、PE/PB 等。',
    argShape: 'codes[]',
  },
  {
    path: ['quotes', 'cnSimple'],
    toolName: 'get_a_share_simple_quotes',
    summary: 'A股简要行情',
    mcpDesc: '获取 A 股 / 指数简要行情（价格、涨跌幅、成交量额）。',
    argShape: 'codes[]',
  },
  {
    path: ['quotes', 'hk'],
    toolName: 'get_hk_quotes',
    tier: 'core',
    summary: '港股行情',
    mcpDesc: '获取港股行情。代码 5 位数字，带不带 hk 前缀均可（如 00700 / hk00700）。',
    argShape: 'codes[]',
  },
  {
    path: ['quotes', 'us'],
    toolName: 'get_us_quotes',
    tier: 'core',
    summary: '美股行情',
    mcpDesc: '获取美股行情。代码如 AAPL / BABA。',
    argShape: 'codes[]',
  },
  {
    path: ['quotes', 'fund'],
    toolName: 'get_fund_quotes',
    tier: 'core',
    summary: '基金行情',
    mcpDesc: '获取公募基金行情（场内 / 场外，净值类）。',
    argShape: 'codes[]',
  },
  {
    path: ['quotes', 'fundFlow'],
    toolName: 'get_fund_flow',
    summary: '资金流向(简版)',
    mcpDesc: '获取资金流向（简版，按代码批量）。',
    argShape: 'codes[]',
  },
  {
    path: ['quotes', 'largeOrder'],
    toolName: 'get_panel_large_order',
    summary: '盘口大单占比',
    mcpDesc: '获取盘口大单占比。',
    argShape: 'codes[]',
  },
  {
    path: ['quotes', 'timeline'],
    toolName: 'get_today_timeline',
    tier: 'core',
    summary: '当日分时',
    mcpDesc: '获取 A 股当日分时走势（单只）。',
    argShape: 'positional',
    positional: [CODE_REQ(STOCK_SYMBOL_DESC)],
  },
  // ===== codes (4) =====
  {
    path: ['codes', 'cn'],
    toolName: 'get_a_share_code_list',
    summary: 'A股代码列表',
    mcpDesc: '获取 A 股全量代码列表（可按市场筛选 / 去交易所前缀）。',
    argShape: 'options',
    params: [SIMPLE, CN_BOARD],
  },
  {
    path: ['codes', 'us'],
    toolName: 'get_us_code_list',
    summary: '美股代码列表',
    mcpDesc: '获取美股全量代码列表。',
    argShape: 'options',
    params: [SIMPLE_US, US_MARKET],
  },
  {
    path: ['codes', 'hk'],
    toolName: 'get_hk_code_list',
    summary: '港股代码列表',
    mcpDesc: '获取港股全量代码列表。',
    argShape: 'none',
  },
  {
    path: ['codes', 'fund'],
    toolName: 'get_fund_code_list',
    summary: '基金代码列表',
    mcpDesc: '获取基金全量代码列表。',
    argShape: 'none',
  },
  // ===== batch (5) =====
  {
    path: ['batch', 'cn'],
    toolName: 'get_all_a_share_quotes',
    summary: '全市场A股行情',
    mcpDesc: '批量拉取全市场 A 股行情。⚠️ 可能耗时数十秒、返回数千条（结果会被裁剪）。',
    argShape: 'options',
    params: [BATCH_SIZE, CONCURRENCY, CN_BOARD],
  },
  // hk/byCodes 的 SDK 选项没有 market(此前声明了也被静默忽略),只留批量参数
  {
    path: ['batch', 'hk'],
    toolName: 'get_all_hk_quotes',
    summary: '全市场港股行情',
    mcpDesc: '批量拉取全市场港股行情。⚠️ 耗时。',
    argShape: 'options',
    params: [BATCH_SIZE, CONCURRENCY],
  },
  {
    path: ['batch', 'us'],
    toolName: 'get_all_us_quotes',
    summary: '全市场美股行情',
    mcpDesc: '批量拉取全市场美股行情。⚠️ 耗时。',
    argShape: 'options',
    params: [BATCH_SIZE, CONCURRENCY, US_MARKET],
  },
  {
    path: ['batch', 'byCodes'],
    toolName: 'get_quotes_by_codes',
    summary: '按代码批量行情',
    mcpDesc: '按代码列表批量拉取完整行情。',
    argShape: 'codes+options',
    params: [BATCH_SIZE, CONCURRENCY],
  },
  {
    path: ['batch', 'raw'],
    summary: '腾讯原始批量',
    argShape: 'positional',
    positional: [{ name: 'params', required: true }],
    mcp: false, // 原始直通接口，不适合作为 LLM 工具暴露
  },
  // ===== kline (7) =====
  {
    path: ['kline', 'cn'],
    toolName: 'get_history_kline',
    tier: 'core',
    summary: 'A股历史K线',
    mcpDesc:
      'A 股 / 指数历史 K 线（日 / 周 / 月，含复权）：开高低收、成交量额、振幅、涨跌幅等。' +
      "复权默认 qfq（前复权，看走势）；做回测 / 收益计算请显式传 hfq（后复权）或 ''（不复权）。" +
      '日期格式 YYYYMMDD。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('股票 / 指数代码，如 600519 / sh600519')],
    params: [PERIOD_DWM, ADJUST, START, END],
  },
  {
    path: ['kline', 'cnMinute'],
    toolName: 'get_minute_kline',
    tier: 'core',
    summary: 'A股分钟K线/分时',
    mcpDesc:
      'A 股分钟 K 线 / 当日分时。period=1 返回最近约 5 个交易日的分时' +
      '（不支持复权，可用 startDate/endDate 收窄到当日）；' +
      'period=5/15/30/60 返回分钟 K 线（adjust 仅此时有效，默认 qfq）。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('股票 / 指数代码，如 600519 / sh600519')],
    params: [PERIOD_MIN, ADJUST, START_MIN_CN, END_MIN_CN],
  },
  {
    path: ['kline', 'hk'],
    toolName: 'get_hk_history_kline',
    tier: 'core',
    summary: '港股历史K线',
    mcpDesc:
      '港股历史 K 线（日 / 周 / 月，含复权，币种 HKD）。代码 5 位数字，带不带 hk 前缀均可' +
      '（如 00700 / hk00700）。复权默认 qfq；日期格式 YYYYMMDD。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('港股代码，如 00700 / hk00700')],
    params: [PERIOD_DWM, ADJUST, START, END],
  },
  // 港/美股分时支持 ndays(SDK/MCP 已支持,此前 CLI 不可达)
  {
    path: ['kline', 'hkMinute'],
    toolName: 'get_hk_minute_kline',
    summary: '港股分钟K线/分时',
    mcpDesc:
      '港股分钟 K 线 / 当日分时。period=1 返回当日分时（不支持复权，可用 recentDays 取近 N 日）；' +
      'period=5/15/30/60 返回分钟 K 线（adjust 仅此时有效，默认 qfq）。' +
      '时间格式 YYYY-MM-DD HH:mm（港股本地时区 Asia/Hong_Kong）。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('港股代码，如 00700 / hk00700')],
    params: [PERIOD_MIN, ADJUST, START_MIN_HK, END_MIN_HK, NDAYS],
  },
  {
    path: ['kline', 'us'],
    toolName: 'get_us_history_kline',
    tier: 'core',
    summary: '美股历史K线',
    mcpDesc:
      '美股历史 K 线（日 / 周 / 月，含复权，币种 USD）。代码格式 {market}.{ticker}' +
      '（如 105.AAPL / 106.BABA）。复权默认 qfq；日期格式 YYYYMMDD。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('美股代码，格式 {market}.{ticker}，如 105.AAPL / 106.BABA')],
    params: [PERIOD_DWM, ADJUST, START, END],
  },
  // 美股分时：MCP 现行 schema 不含时间窗口（仅 recentDays），CLI 侧 --start/--end 保留
  {
    path: ['kline', 'usMinute'],
    toolName: 'get_us_minute_kline',
    summary: '美股分钟K线/分时',
    mcpDesc:
      '美股分钟 K 线 / 当日分时（仅常规交易时段，不含盘前 / 盘后）。period=1 返回当日分时' +
      '（不支持复权，可用 recentDays 取近 N 日）；period=5/15/30/60 返回分钟 K 线' +
      '（adjust 仅此时有效，默认 qfq）。代码格式 {market}.{ticker}，如 105.AAPL。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('美股代码，格式 {market}.{ticker}，如 105.AAPL / 106.BABA')],
    params: [PERIOD_MIN, ADJUST, START_CLI_ONLY, END_CLI_ONLY, NDAYS],
  },
  // MCP 工具手写（mcpCustom）：MCP 用嵌套 indicators 对象，CLI 用 14 个扁平指标 flag
  {
    path: ['kline', 'withIndicators'],
    toolName: 'get_kline_with_indicators',
    tier: 'core',
    summary: '带指标K线(--ma 5,10 --macd --kdj --rsi ...)',
    mcpDesc:
      '带技术指标的历史 K 线（A 股 / 港股 / 美股，market 不传自动按 symbol 识别）。' +
      '周期默认 daily，复权默认按 SDK 默认（qfq）；日期支持 YYYYMMDD 或 YYYY-MM-DD。' +
      'indicators 为对象，键取自 14 个指标：ma / macd / boll / kdj / rsi / wr / bias / cci / ' +
      'atr / obv / roc / dmi / sar / kc，每个键传 true 即用默认参数开启，或传配置对象' +
      '（如 { ma: { periods: [5,10,20] }, macd: { short: 12, long: 26, signal: 9 } }）。' +
      'SDK 会按指标依赖自动向前多取若干 bar 保证首日有效。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('股票代码（A 股 / 港股 / 美股）')],
    params: [PERIOD_DWM, ADJUST, START, END, MARKET_ENUM, ...INDICATOR_PARAMS],
    mcpCustom: true,
  },
  // ===== board (10) =====
  {
    path: ['board', 'industry', 'list'],
    toolName: 'get_industry_list',
    tier: 'core',
    summary: '行业板块列表',
    mcpDesc: '获取行业板块列表（东方财富）：板块代码、名称、最新价、涨跌幅、成交额、领涨股等。无参。',
    argShape: 'none',
  },
  {
    path: ['board', 'industry', 'spot'],
    toolName: 'get_industry_spot',
    summary: '行业板块成分行情',
    mcpDesc:
      '获取指定行业板块的成分股实时行情列表（最新价、涨跌幅、成交量额等）。symbol 为行业板块代码（如 BK0475）或名称。',
    argShape: 'positional',
    positional: [SYMBOL_REQ('行业板块代码（如 BK0475）或板块名称')],
  },
  {
    path: ['board', 'industry', 'constituents'],
    toolName: 'get_industry_constituents',
    tier: 'core',
    summary: '行业板块成分股',
    mcpDesc:
      '获取指定行业板块的成分股列表（代码、名称等基础信息）。symbol 为行业板块代码（如 BK0475）或名称。',
    argShape: 'positional',
    positional: [SYMBOL_REQ('行业板块代码（如 BK0475）或板块名称')],
  },
  {
    path: ['board', 'industry', 'kline'],
    toolName: 'get_industry_kline',
    summary: '行业板块K线',
    mcpDesc:
      '获取行业板块历史 K 线（日/周/月）：日期、开高低收、成交量额、涨跌幅。价格单位为元。复权默认不复权，需前/后复权请显式传 adjust。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('行业板块代码（如 BK0475）或板块名称')],
    params: [PERIOD_DWM, BOARD_ADJUST, START, END],
  },
  // 板块分时的 SDK 选项只有 period(此前声明的 --adjust/--start/--end 过校验但被丢弃)
  {
    path: ['board', 'industry', 'minuteKline'],
    toolName: 'get_industry_minute_kline',
    summary: '行业板块分时',
    mcpDesc:
      '获取行业板块分时/分钟 K 线。period=1 返回当日分时；5/15/30/60 返回对应分钟 K 线。默认 5（5 分钟 K 线），当日分时请传 period=1。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('行业板块代码（如 BK0475）或板块名称')],
    params: [BOARD_PERIOD_MIN],
  },
  {
    path: ['board', 'concept', 'list'],
    toolName: 'get_concept_list',
    tier: 'core',
    summary: '概念板块列表',
    mcpDesc: '获取概念板块列表（东方财富）：板块代码、名称、最新价、涨跌幅、成交额、领涨股等。无参。',
    argShape: 'none',
  },
  {
    path: ['board', 'concept', 'spot'],
    toolName: 'get_concept_spot',
    summary: '概念板块成分行情',
    mcpDesc:
      '获取指定概念板块的成分股实时行情列表（最新价、涨跌幅、成交量额等）。symbol 为概念板块代码（如 BK0815）或名称。',
    argShape: 'positional',
    positional: [SYMBOL_REQ('概念板块代码（如 BK0815）或板块名称')],
  },
  {
    path: ['board', 'concept', 'constituents'],
    toolName: 'get_concept_constituents',
    tier: 'core',
    summary: '概念板块成分股',
    mcpDesc:
      '获取指定概念板块的成分股列表（代码、名称等基础信息）。symbol 为概念板块代码（如 BK0815）或名称。',
    argShape: 'positional',
    positional: [SYMBOL_REQ('概念板块代码（如 BK0815）或板块名称')],
  },
  {
    path: ['board', 'concept', 'kline'],
    toolName: 'get_concept_kline',
    summary: '概念板块K线',
    mcpDesc:
      '获取概念板块历史 K 线（日/周/月）：日期、开高低收、成交量额、涨跌幅。价格单位为元。复权默认不复权，需前/后复权请显式传 adjust。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('概念板块代码（如 BK0815）或板块名称')],
    params: [PERIOD_DWM, BOARD_ADJUST, START, END],
  },
  {
    path: ['board', 'concept', 'minuteKline'],
    toolName: 'get_concept_minute_kline',
    summary: '概念板块分时',
    mcpDesc:
      '获取概念板块分时/分钟 K 线。period=1 返回当日分时；5/15/30/60 返回对应分钟 K 线。默认 5（5 分钟 K 线），当日分时请传 period=1。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('概念板块代码（如 BK0815）或板块名称')],
    params: [BOARD_PERIOD_MIN],
  },
  // ===== options (11) =====
  {
    path: ['options', 'index', 'spot'],
    toolName: 'get_index_option_spot',
    summary: '股指期权T型报价',
    mcpDesc: '获取中金所股指期权 T 型实时报价（认购/认沽分列）。product=产品代码(ho/io/mo)；contract=合约月份。',
    argShape: 'positional',
    positional: [
      { name: 'product', required: true, enum: INDEX_OPTION_PRODUCTS, desc: '产品代码：ho / io / mo' },
      { name: 'contract', required: true, desc: '合约（月份），如 2406' },
    ],
  },
  {
    path: ['options', 'index', 'kline'],
    toolName: 'get_index_option_kline',
    summary: '股指期权日K',
    mcpDesc: '获取中金所股指期权某合约的日 K 线。',
    argShape: 'positional',
    positional: [SYMBOL_REQ('期权合约代码')],
  },
  {
    path: ['options', 'etf', 'months'],
    toolName: 'get_etf_option_months',
    summary: 'ETF期权月份',
    mcpDesc: '获取 ETF 期权可交易月份列表（含标的/品种信息）。cate=期权品种。',
    argShape: 'positional',
    positional: [
      { name: 'cate', required: true, enum: ETF_OPTION_CATES, desc: '期权品种：50ETF / 300ETF / 500ETF / 科创50 / 科创板50' },
    ],
  },
  {
    path: ['options', 'etf', 'expireDay'],
    toolName: 'get_etf_option_expire_day',
    summary: 'ETF期权到期日',
    mcpDesc:
      '获取 ETF 期权指定月份的到期日与剩余天数。month 格式 YYYY-MM（如 2024-06），可直接取自 get_etf_option_months 返回的月份。',
    argShape: 'positional',
    positional: [
      { name: 'cate', required: true, enum: ETF_OPTION_CATES, desc: '期权品种：50ETF / 300ETF / 500ETF / 科创50 / 科创板50' },
      { name: 'month', required: true, desc: '月份 YYYY-MM，如 2024-06（可取自 get_etf_option_months 返回的月份）' },
    ],
  },
  {
    path: ['options', 'etf', 'minute'],
    toolName: 'get_etf_option_minute',
    summary: 'ETF期权当日分时',
    mcpDesc: '获取 ETF 期权某合约的当日分时数据（价格、成交量、持仓量、均价）。',
    argShape: 'positional',
    positional: [CODE_REQ('期权合约代码')],
  },
  {
    path: ['options', 'etf', 'dailyKline'],
    toolName: 'get_etf_option_daily_kline',
    summary: 'ETF期权日K',
    mcpDesc: '获取 ETF 期权某合约的日 K 线。',
    argShape: 'positional',
    positional: [CODE_REQ('期权合约代码')],
  },
  {
    path: ['options', 'etf', 'fiveDayMinute'],
    toolName: 'get_etf_option_five_day_minute',
    summary: 'ETF期权5日分时',
    mcpDesc: '获取 ETF 期权某合约的近 5 日分时数据。',
    argShape: 'positional',
    positional: [CODE_REQ('期权合约代码')],
  },
  {
    path: ['options', 'commodity', 'spot'],
    toolName: 'get_commodity_option_spot',
    summary: '商品期权T型报价',
    mcpDesc: '获取商品期权 T 型实时报价（认购/认沽分列）。variety=品种代码（如 cu/m/au）；contract=合约月份。',
    argShape: 'positional',
    positional: [
      { name: 'variety', required: true, desc: '品种代码，如 cu / m / au' },
      { name: 'contract', required: true, desc: '合约（月份），如 2406' },
    ],
  },
  {
    path: ['options', 'commodity', 'kline'],
    toolName: 'get_commodity_option_kline',
    summary: '商品期权日K',
    mcpDesc: '获取商品期权某合约的日 K 线。',
    argShape: 'positional',
    positional: [SYMBOL_REQ('期权合约代码')],
  },
  // CLI 现状未声明 --pageSize（无声明 opts 的命令保持透传），仅 MCP 声明
  {
    path: ['options', 'cffex', 'quotes'],
    toolName: 'get_cffex_option_quotes',
    summary: '中金所期权当日报价',
    mcpDesc:
      '获取中金所全部期权实时行情列表（价格、涨跌、成交、持仓、行权价、剩余天数等）。⚠️ 体积大：默认 pageSize=20000 返回全市场合约。',
    argShape: 'options',
    params: [PAGE_SIZE_20000],
  },
  {
    path: ['options', 'lhb'],
    toolName: 'get_option_lhb',
    summary: '期权龙虎榜',
    mcpDesc: '获取期权龙虎榜（按标的与日期，含成交量/持仓量排名、会员席位、净买卖等）。date 格式 YYYY-MM-DD。',
    argShape: 'positional',
    positional: [
      { name: 'symbol', required: true, desc: '期权标的/合约代码' },
      { name: 'date', required: true, desc: '日期 YYYY-MM-DD，如 2024-06-03' },
    ],
  },
  // ===== futures (6) =====
  {
    path: ['futures', 'kline'],
    toolName: 'get_futures_kline',
    tier: 'core',
    summary: '国内期货K线',
    mcpDesc:
      '获取国内期货历史 K 线（东财）：开高低收、成交量、持仓量等。' +
      'symbol 为合约代码，如 rb2605(螺纹钢) / IF2604(沪深300股指) / au2606(黄金)，' +
      'period 默认 daily(日线)，startDate/endDate 为 YYYYMMDD。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('期货合约代码，如 rb2605 / IF2604 / au2606')],
    params: [PERIOD_DWM, ADJUST_CLI_ONLY, START, END],
  },
  {
    path: ['futures', 'globalSpot'],
    toolName: 'get_global_futures_spot',
    summary: '全球期货实时行情',
    mcpDesc:
      '获取全球期货实时行情（东财）：国际原油、黄金、外盘指数期货等的最新价、涨跌幅、成交量。' +
      'pageSize 为每页条数，默认 20。',
    argShape: 'options',
    params: [PAGE_SIZE_20],
  },
  // marketCode 仅 MCP 暴露（CLI 现状对未声明 flag 是严格拒绝，保持不变）
  {
    path: ['futures', 'globalKline'],
    toolName: 'get_global_futures_kline',
    summary: '全球期货K线',
    mcpDesc:
      '获取全球期货历史 K 线（东财）：开高低收、成交量等。' +
      'symbol 为合约代码，period 默认 daily，startDate/endDate 为 YYYYMMDD。' +
      'marketCode 为东财市场代码（用于未内置品种，可从全球期货实时行情结果反查）。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('全球期货合约代码，如 CONC(WTI 原油) / GC00Y(COMEX 黄金)')],
    params: [PERIOD_DWM, ADJUST_CLI_ONLY, START, END, FUTURES_MARKET_CODE],
  },
  {
    path: ['futures', 'inventorySymbols'],
    toolName: 'get_futures_inventory_symbols',
    summary: '期货库存品种列表',
    mcpDesc: '获取期货库存品种列表（东财）：可查库存的品种代码与名称，供 get_futures_inventory 使用。',
    argShape: 'none',
  },
  {
    path: ['futures', 'inventory'],
    toolName: 'get_futures_inventory',
    summary: '期货库存历史',
    mcpDesc:
      '获取指定品种的期货库存历史（东财）：交易所注册仓单 / 库存量及增减。' +
      'symbol 为品种代码（见 get_futures_inventory_symbols），' +
      'startDate 为 YYYY-MM-DD(默认 2020-10-28)。' +
      'pageSize 仅为单页批量大小（默认 500），接口返回全量历史，过大时会被裁剪。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('库存品种代码（见 get_futures_inventory_symbols）')],
    params: [FUTURES_INV_START, PAGE_SIZE_500],
  },
  {
    path: ['futures', 'comexInventory'],
    toolName: 'get_comex_inventory',
    summary: 'COMEX 库存',
    mcpDesc:
      '获取 COMEX 黄金 / 白银库存历史（东财）：注册库存、合格库存及总量变化。' +
      "symbol 必填，取 'gold'(黄金) 或 'silver'(白银)。" +
      'pageSize 仅为单页批量大小（默认 500），接口返回全量历史，过大时会被裁剪。',
    argShape: 'symbol+options',
    positional: [{ name: 'symbol', required: true, enum: COMEX_SYMBOLS, desc: '品种：gold=黄金 / silver=白银' }],
    params: [PAGE_SIZE_500],
  },
  // ===== fundFlow (5) =====
  {
    path: ['fundFlow', 'individual'],
    toolName: 'get_individual_fund_flow',
    tier: 'core',
    summary: '个股资金流历史',
    mcpDesc:
      '获取个股资金流历史（日 / 周 / 月）：主力 / 超大单 / 大单 / 中单 / 小单净流入（金额单位元、占比为百分比）。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('股票代码，带不带 sh/sz/bj 前缀均可，如 600519 / sh600519')],
    params: [{ ...PERIOD_DWM, cli: false }], // CLI 现状未声明 --period（透传可达），仅 MCP 声明
  },
  {
    path: ['fundFlow', 'market'],
    toolName: 'get_market_fund_flow',
    summary: '大盘资金流',
    mcpDesc: '获取大盘资金流（上证综指 + 深证成指(399001)）：各分类资金净流入金额（元）与占比（%）。',
    argShape: 'none',
  },
  {
    path: ['fundFlow', 'rank'],
    toolName: 'get_fund_flow_rank',
    tier: 'core',
    summary: '个股资金流排名',
    mcpDesc:
      '获取个股资金流排名（沪深北 A 股全市场）：按主力净流入排序，金额单位元、占比为百分比。⚠️ 返回全市场数千条，结果裁剪至前 200（按主力净流入降序），完整数据请直接用 SDK。',
    argShape: 'options',
    params: [FF_INDICATOR],
  },
  {
    path: ['fundFlow', 'sectorRank'],
    toolName: 'get_sector_fund_flow_rank',
    summary: '板块资金流排名',
    mcpDesc: '获取板块资金流排名（行业 / 概念 / 地域）：按板块主力净流入排序，金额单位元、占比为百分比。',
    argShape: 'options',
    params: [FF_INDICATOR, FF_SECTOR_TYPE],
  },
  {
    path: ['fundFlow', 'sectorHistory'],
    toolName: 'get_sector_fund_flow_history',
    summary: '单板块历史资金流',
    mcpDesc:
      '获取单个板块的历史资金流（日 / 周 / 月）：各分类资金净流入金额（元）与占比（%）。symbol 为板块编号，如 BK0438 或全前缀 90.BK0438。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ('板块编号，如 BK0438 或全前缀 90.BK0438')],
    params: [{ ...PERIOD_DWM, cli: false }],
  },
  // ===== northbound (5) =====
  // CLI 支持 --direction flag 或位置参数（custom invoke 消化）；MCP 暴露 direction 属性
  {
    path: ['northbound', 'minute'],
    toolName: 'get_northbound_minute',
    summary: '北向/南向分时(--direction north|south 或位置参数)',
    mcpDesc:
      '获取北向 / 南向资金分时数据（当日，按 HH:MM）。返回沪/深分项与合计净流入（单位:万元）。direction:north=北向(默认) / south=南向。',
    argShape: 'positional',
    positional: [
      { name: 'direction', enum: NB_DIRECTIONS, default: 'north', desc: '资金方向:north=北向(默认) / south=南向' },
    ],
    params: [DIRECTION_FLAG],
  },
  {
    path: ['northbound', 'summary'],
    toolName: 'get_northbound_flow_summary',
    tier: 'core',
    summary: '沪深港通资金汇总',
    mcpDesc:
      '获取沪深港通市场资金流向汇总（北向 + 南向 + 港股通拆分）：含板块名、净买额/净流入(元)、当日余额、相关指数涨跌幅等。',
    argShape: 'none',
  },
  {
    path: ['northbound', 'holdingRank'],
    toolName: 'get_northbound_holding_rank',
    summary: '北向持股排行',
    mcpDesc:
      '获取北向 / 沪股通 / 深股通持股个股排行：含持股股数、持股市值(元)、占流通股/总股本比(%)、区间增持估计等。market:all(默认)/shanghai/shenzhen;period 默认 5day;date 须为有数据的交易日，否则返回空。',
    argShape: 'options',
    params: [NB_HOLDING_MARKET, NB_RANK_PERIOD, NB_RANK_DATE],
  },
  {
    path: ['northbound', 'history'],
    toolName: 'get_northbound_history',
    summary: '北向/南向历史(--direction north|south；--start/--end)',
    mcpDesc:
      '获取北向 / 南向资金历史（按日）：成交净买额、买/卖成交额、历史累计净买额、当日资金流入/余额(元)及领涨股。direction:north(默认)/south;不传 startDate/endDate 取全量区间。',
    argShape: 'symbol+options',
    positional: [
      { name: 'direction', enum: NB_DIRECTIONS, default: 'north', desc: '资金方向:north=北向(默认) / south=南向' },
    ],
    params: [DIRECTION_FLAG, START_NB, END_NB],
  },
  {
    path: ['northbound', 'individual'],
    toolName: 'get_northbound_individual',
    summary: '个股北向持仓历史',
    mcpDesc:
      '获取个股的北向持仓历史（按日）：持股数量、持股市值(元)、占流通股/总股本比(%)、当日收盘价与涨跌幅。不传 startDate/endDate 取全量区间。',
    argShape: 'symbol+options',
    positional: [SYMBOL_REQ(STOCK_SYMBOL_DESC)],
    params: [START_NB_MCP_ONLY, END_NB_MCP_ONLY],
  },
  // ===== marketEvent (3) =====
  {
    path: ['marketEvent', 'ztPool'],
    toolName: 'get_zt_pool',
    tier: 'core',
    summary: '涨停股池',
    mcpDesc:
      '获取涨停股池（东方财富）：涨停 / 昨日涨停 / 强势 / 次新 / 炸板 / 跌停。' +
      '字段含价格(元)、涨跌幅(%)、成交额(元)、流通/总市值(元)、换手率(%)、连板数、封板时间(HHMMSS) 等。' +
      'type 默认 zt；date 不传为最新交易日。',
    argShape: 'positional',
    positional: [
      {
        name: 'type',
        enum: ZT_POOL_TYPES,
        default: 'zt',
        desc: '股池类型：zt=涨停 / yesterday=昨日涨停 / strong=强势 / sub_new=次新 / broken=炸板 / dt=跌停',
      },
      { name: 'date', desc: '日期 YYYYMMDD 或 YYYY-MM-DD，不传为最新交易日' },
    ],
  },
  {
    path: ['marketEvent', 'stockChanges'],
    toolName: 'get_stock_changes',
    summary: '盘口异动',
    mcpDesc:
      '获取当日盘口异动列表（东方财富）：每条含发生时间(HH:MM:SS)、代码、名称、异动类型及中文标签、相关信息。' +
      'type 不传默认 large_buy(大笔买入)。',
    argShape: 'positional',
    positional: [
      {
        name: 'type',
        enum: STOCK_CHANGE_TYPES,
        default: 'large_buy',
        desc:
          '异动类型筛选：rocket_launch=火箭发射 / quick_rebound=快速反弹 / large_buy=大笔买入 / ' +
          'limit_up_seal=封涨停板 / limit_down_open=打开跌停板 / big_buy_order=有大买盘 / auction_up=竞价上涨 / ' +
          'high_open_5d=高开5日线 / gap_up=向上缺口 / high_60d=60日新高 / surge_60d=60日大幅上涨 / ' +
          'accelerate_down=加速下跌 / high_dive=高台跳水 / large_sell=大笔卖出 / limit_down_seal=封跌停板 / ' +
          'limit_up_open=打开涨停板 / big_sell_order=有大卖盘 / auction_down=竞价下跌 / low_open_5d=低开5日线 / ' +
          'gap_down=向下缺口 / low_60d=60日新低 / drop_60d=60日大幅下跌',
      },
    ],
  },
  {
    path: ['marketEvent', 'boardChanges'],
    toolName: 'get_board_changes',
    summary: '板块异动',
    mcpDesc:
      '获取当日板块异动汇总（东方财富）：每条含板块名称、涨跌幅(%)、主力净流入(元)、异动总次数、' +
      '异动最频繁个股（代码 / 名称 / 方向）及异动类型分布。无参。',
    argShape: 'none',
  },
  // ===== dragonTiger (5) =====
  {
    path: ['dragonTiger', 'detail'],
    toolName: 'get_dragon_tiger_detail',
    tier: 'core',
    summary: '龙虎榜详情(必填 --start/--end)',
    mcpDesc:
      '获取龙虎榜上榜个股明细（按日期范围）：代码、名称、上榜日期、收盘价、涨跌幅(%)、净买额/买入额/卖出额/成交额(元)、占总成交比(%)、换手率(%)、流通市值(元)、上榜原因、上榜后 1/2/5/10 日涨跌幅(%)。日期格式 YYYYMMDD，startDate / endDate 均必填。日期区间过大时结果超 200 条会被裁剪，请收窄区间。',
    argShape: 'options',
    params: [START_REQ, END_REQ],
  },
  {
    path: ['dragonTiger', 'stockStats'],
    toolName: 'get_dragon_tiger_stock_stats',
    summary: '个股上榜统计',
    mcpDesc:
      '获取龙虎榜个股上榜统计（按周期聚合）：代码、名称、最近上榜日、收盘价、涨跌幅(%)、上榜次数、累计买入/卖出/净额/成交额(元)、累计买/卖方机构次数。period 可选，默认 1month。⚠️ 返回全市场，可能数百至上千条，超 200 条会被裁剪。',
    argShape: 'positional',
    positional: [{ name: 'period', enum: DRAGON_TIGER_PERIODS, default: '1month', desc: DT_PERIOD_DESC }],
  },
  {
    path: ['dragonTiger', 'institution'],
    toolName: 'get_dragon_tiger_institution',
    summary: '机构买卖统计(必填 --start/--end)',
    mcpDesc:
      '获取龙虎榜机构买卖明细（按日期范围）：代码、名称、上榜日期、收盘价、涨跌幅(%)、买/卖方机构数、机构买入额/卖出额/净额(元)。日期格式 YYYYMMDD，startDate / endDate 均必填。日期区间过大时结果超 200 条会被裁剪，请收窄区间。',
    argShape: 'options',
    params: [START_REQ, END_REQ],
  },
  {
    path: ['dragonTiger', 'branchRank'],
    toolName: 'get_dragon_tiger_branch_rank',
    summary: '营业部排行',
    mcpDesc:
      '获取龙虎榜营业部（席位）排行（按周期聚合）：营业部代码、名称、买入总额/卖出总额(元)、买入/卖出次数、上榜次数。period 可选，默认 1month。⚠️ 返回全市场，可能数百至上千条，超 200 条会被裁剪。',
    argShape: 'positional',
    positional: [{ name: 'period', enum: DRAGON_TIGER_PERIODS, default: '1month', desc: DT_PERIOD_DESC }],
  },
  {
    path: ['dragonTiger', 'seatDetail'],
    toolName: 'get_dragon_tiger_seat_detail',
    summary: '个股席位明细',
    mcpDesc:
      '获取个股某日龙虎榜席位明细：排名、营业部名称、买入额/卖出额/净额(元)、买入/卖出占总成交比(%)、买卖方向(buy/sell)。symbol 与 date 均必填；date 支持 YYYYMMDD 或 YYYY-MM-DD。',
    argShape: 'positional',
    positional: [
      { name: 'symbol', required: true, desc: STOCK_SYMBOL_DESC },
      { name: 'date', required: true, desc: '上榜日期，YYYYMMDD 或 YYYY-MM-DD' },
    ],
  },
  // ===== blockTrade (3) —— CLI-only（MCP 未暴露大宗交易工具） =====
  { path: ['blockTrade', 'marketStat'], summary: '大宗交易市场统计', argShape: 'none', mcp: false },
  { path: ['blockTrade', 'detail'], summary: '大宗交易明细', argShape: 'options', mcp: false },
  { path: ['blockTrade', 'dailyStat'], summary: '大宗交易每日统计', argShape: 'options', mcp: false },
  // ===== margin (2) —— CLI-only =====
  { path: ['margin', 'accountInfo'], summary: '融资融券账户统计', argShape: 'none', mcp: false },
  {
    path: ['margin', 'targetList'],
    summary: '融资融券标的',
    argShape: 'positional',
    positional: [{ name: 'date' }],
    mcp: false,
  },
  // ===== fund (4) =====
  {
    path: ['fund', 'dividendList'],
    toolName: 'get_fund_dividend_list',
    summary: '基金分红明细',
    mcpDesc:
      '获取基金分红明细列表（东方财富分红送配频道）。接口仅支持「年份+全市场+翻页」查询，' +
      "不支持服务端按代码精确查；要拿单只基金完整分红记录请同时设 page='all' 与 code（code 为客户端过滤）。" +
      '默认拉当前年第 1 页、按除息日(FSRQ)倒序。',
    argShape: 'options',
    params: FUND_DIVIDEND_PARAMS,
  },
  {
    path: ['fund', 'navHistory'],
    toolName: 'get_fund_nav_history',
    summary: '基金历史净值',
    mcpDesc:
      '获取基金历史净值（单位净值 + 累计净值，全历史一次返回，按日期升序）。' +
      '开放式 / ETF / LOF / 货币 / QDII 均通用。⚠️ 体积大：全历史数千条、响应体约 600KB，建议应用层缓存。',
    argShape: 'positional',
    positional: [CODE_REQ('基金代码，纯数字，如 110011')],
  },
  {
    path: ['fund', 'estimate'],
    toolName: 'get_fund_estimate',
    tier: 'core',
    summary: '基金当日估值',
    mcpDesc:
      '获取基金当日实时估值（天天基金 fundgz 接口）。同时返回最新已结算单位净值（nav/navDate）与盘中实时估算' +
      '（estimatedNav/estimatedChangePercent/estimateTime，涨跌幅单位 %）。QDII / 非交易日 / 部分小众基金的估算字段可能为 null。',
    argShape: 'positional',
    positional: [CODE_REQ('基金代码，纯数字，如 005827')],
  },
  {
    path: ['fund', 'rankHistory'],
    toolName: 'get_fund_rank_history',
    summary: '基金同类排名走势',
    mcpDesc:
      '获取基金同类排名走势（每日近三月排名 + 同类总数 + 排名百分位 %，按日期升序）。' +
      '适合画「该基金在同类里的相对表现」折线图。数据源同 get_fund_nav_history。',
    argShape: 'positional',
    positional: [CODE_REQ('基金代码，纯数字，如 110011')],
  },
  // ===== calendar (4) =====
  {
    path: ['calendar', 'isTradingDay'],
    toolName: 'is_trading_day',
    tier: 'core',
    summary: '是否交易日',
    mcpDesc:
      '判断某天是否为 A 股交易日（基于上游官方日历，能识别法定假日）。date 可选，支持 YYYY-MM-DD 或 YYYYMMDD；不传则判断今天。返回 boolean。',
    argShape: 'positional',
    positional: [{ name: 'date', desc: '日期 YYYY-MM-DD 或 YYYYMMDD；不传为今天' }],
  },
  {
    path: ['calendar', 'nextTradingDay'],
    toolName: 'next_trading_day',
    summary: '下一交易日',
    mcpDesc:
      '返回给定日期之后最近的一个 A 股交易日（YYYY-MM-DD）。date 可选，支持 YYYY-MM-DD 或 YYYYMMDD；不传则以今天为基准。',
    argShape: 'positional',
    positional: [{ name: 'date', desc: '基准日期 YYYY-MM-DD 或 YYYYMMDD；不传为今天' }],
  },
  {
    path: ['calendar', 'prevTradingDay'],
    toolName: 'prev_trading_day',
    summary: '上一交易日',
    mcpDesc:
      '返回给定日期之前最近的一个 A 股交易日（YYYY-MM-DD）。date 可选，支持 YYYY-MM-DD 或 YYYYMMDD；不传则以今天为基准。',
    argShape: 'positional',
    positional: [{ name: 'date', desc: '基准日期 YYYY-MM-DD 或 YYYYMMDD；不传为今天' }],
  },
  {
    path: ['calendar', 'marketStatus'],
    toolName: 'get_market_status',
    tier: 'core',
    summary: '市场状态',
    mcpDesc:
      "获取市场当前实时状态：pre_market(盘前) / open(交易中) / lunch_break(午休) / after_hours(盘后) / closed(休市)。market 可选枚举 A/HK/US，默认 A。⚠️ 同步本地时钟判断、不发请求：A 股基于交易时段但不识别法定假日，港股/美股退化为'周一-周五 + 已知交易时段'近似。",
    argShape: 'positional',
    positional: [
      { name: 'market', upper: true, enum: SUPPORTED_MARKETS, default: 'A', desc: '市场：A=A股 / HK=港股 / US=美股，默认 A' },
    ],
  },
  // ===== reference (2) =====
  {
    path: ['reference', 'dividendDetail'],
    toolName: 'get_dividend_detail',
    summary: '分红配股明细',
    mcpDesc:
      '获取 A 股分红配股明细：历年送转、派息（每 10 股派 X 元）、除权除息日、股权登记日等。代码带不带交易所前缀均可（如 600519 / sh600519）。',
    argShape: 'positional',
    positional: [SYMBOL_REQ(STOCK_SYMBOL_DESC)],
  },
  {
    path: ['reference', 'tradingCalendar'],
    toolName: 'get_trading_calendar',
    summary: '交易日历(原始数组)',
    mcpDesc:
      "获取 A 股交易日历原始数组（升序 'YYYY-MM-DD' 字符串列表，来自腾讯接口，带 12 小时缓存）。⚠️ 体积大：返回数千个交易日。只需判断某日是否交易日 / 取上一或下一交易日时，优先用 calendar 命名空间下的工具，无需拉全量。",
    argShape: 'none',
  },
  // ===== 顶层 search（不在命名空间下，cli.md §2/§3） =====
  {
    path: ['search'],
    toolName: 'search',
    tier: 'core',
    summary: '搜索股票/指数/基金',
    mcpDesc: '模糊搜索股票 / 指数 / 基金（代码 / 名称 / 拼音）。返回 code、name、market、category。',
    argShape: 'positional',
    positional: [{ name: 'keyword', required: true, desc: '搜索关键词' }],
  },
];

/** 按点分路径查 spec（自定义派生处引用，如手写 MCP 工具读取 name/tier/desc）。 */
export function findMethodSpec(path: string): MethodSpec {
  const spec = METHOD_SPECS.find((s) => s.path.join('.') === path);
  if (!spec) throw new Error(`spec 中不存在方法: ${path}`);
  return spec;
}
