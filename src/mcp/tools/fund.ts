/**
 * MCP 工具：公募基金扩展数据（分红明细 / 历史净值 / 实时估值 / 同类排名走势）。
 * 数据源为东方财富 / 天天基金的基金频道。
 */
import type { ToolDef } from '../types';
import type { FundDividendListOptions } from '../../types';
import { symbolField, obj } from './schema';

/** 分红查询排序字段（与东方财富接口 `rank` 参数一一对应） */
const FUND_DIVIDEND_RANK = ['BZDM', 'ABBNAME', 'DJR', 'FSRQ', 'FHFCZ', 'FFR'] as const;
/** 通用排序方向 */
const FUND_SORT_DIRECTION = ['asc', 'desc'] as const;

export const fundTools: ToolDef[] = [
  {
    name: 'get_fund_dividend_list',
    tier: 'full',
    description:
      '获取基金分红明细列表（东方财富分红送配频道）。接口仅支持「年份+全市场+翻页」查询，' +
      "不支持服务端按代码精确查；要拿单只基金完整分红记录请同时设 page='all' 与 code（code 为客户端过滤）。" +
      '默认拉当前年第 1 页、按除息日(FSRQ)倒序。',
    inputSchema: obj({
      year: {
        type: 'string',
        description: '查询年份，如 "2026"；默认当前年（Asia/Shanghai）',
      },
      page: {
        type: 'string',
        description: "页码（从 1 开始）的数字字符串，或 'all' 自动翻完该年所有页并聚合；默认 1",
      },
      fundType: {
        type: 'string',
        description: "基金类型筛选，空表示全部，如 '股票型' / '指数型-股票' / '混合型-偏股' / 'REITs'",
      },
      rank: {
        type: 'string',
        enum: FUND_DIVIDEND_RANK,
        default: 'FSRQ',
        description:
          '排序字段：BZDM=基金代码 / ABBNAME=基金简称 / DJR=权益登记日 / FSRQ=除息日期(默认) / FHFCZ=分红(元/份) / FFR=分红发放日',
      },
      sort: {
        type: 'string',
        enum: FUND_SORT_DIRECTION,
        default: 'desc',
        description: '排序方向：asc=升序 / desc=降序(默认)',
      },
      code: {
        type: 'string',
        description: "按基金代码过滤（客户端过滤），一般搭配 page='all' 使用",
      },
    }),
    invoke: (sdk, a) => {
      const options: FundDividendListOptions = {
        year: a.year as string | number | undefined,
        page: a.page as number | 'all' | undefined,
        fundType: a.fundType as string | undefined,
        rank: a.rank as FundDividendListOptions['rank'],
        sort: a.sort as FundDividendListOptions['sort'],
        code: a.code as string | undefined,
      };
      return sdk.fund.dividendList(options);
    },
  },
  {
    name: 'get_fund_nav_history',
    tier: 'full',
    description:
      '获取基金历史净值（单位净值 + 累计净值，全历史一次返回，按日期升序）。' +
      '开放式 / ETF / LOF / 货币 / QDII 均通用。⚠️ 体积大：全历史数千条、响应体约 600KB，建议应用层缓存。',
    inputSchema: obj({ code: symbolField('基金代码，纯数字，如 110011') }, ['code']),
    invoke: (sdk, a) => sdk.fund.navHistory(a.code as string),
  },
  {
    name: 'get_fund_estimate',
    tier: 'core',
    description:
      '获取基金当日实时估值（天天基金 fundgz 接口）。同时返回最新已结算单位净值（nav/navDate）与盘中实时估算' +
      '（estimatedNav/estimatedChangePercent/estimateTime，涨跌幅单位 %）。QDII / 非交易日 / 部分小众基金的估算字段可能为 null。',
    inputSchema: obj({ code: symbolField('基金代码，纯数字，如 005827') }, ['code']),
    invoke: (sdk, a) => sdk.fund.estimate(a.code as string),
  },
  {
    name: 'get_fund_rank_history',
    tier: 'full',
    description:
      '获取基金同类排名走势（每日近三月排名 + 同类总数 + 排名百分位 %，按日期升序）。' +
      '适合画「该基金在同类里的相对表现」折线图。数据源同 get_fund_nav_history。',
    inputSchema: obj({ code: symbolField('基金代码，纯数字，如 110011') }, ['code']),
    invoke: (sdk, a) => sdk.fund.rankHistory(a.code as string),
  },
];
