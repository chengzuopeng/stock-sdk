/**
 * 东方财富 - 分红派送详情
 * 数据来源：https://data.eastmoney.com/yjfp/detail/{symbol}.html
 */
import { RequestClient, EM_DATACENTER_URL } from '../../core';
import type { DividendDetail } from '../../types';

/**
 * 分红派送详情 API 响应结构
 */
interface DividendApiResponse {
  result?: {
    pages?: number;
    data?: DividendApiItem[];
  };
}

/**
 * 分红派送 API 原始数据项（根据实际 API 返回确认）
 */
interface DividendApiItem {
  /** 股票代码 */
  SECURITY_CODE?: string;
  /** 股票名称 */
  SECURITY_NAME_ABBR?: string;
  /** 报告期 */
  REPORT_DATE?: string;
  /** 业绩披露日期/预案公告日 */
  PLAN_NOTICE_DATE?: string;
  /** 业绩披露日期（同上，用于兼容） */
  PUBLISH_DATE?: string;
  /** 送转总比例（每10股送转X股） */
  BONUS_IT_RATIO?: number;
  /** 送股比例（每10股送X股） */
  BONUS_RATIO?: number;
  /** 转股比例（每10股转X股） */
  IT_RATIO?: number;
  /** 每10股派息(税前)，单位：元 */
  PRETAX_BONUS_RMB?: number;
  /** 分红描述（如：10派2.36元(含税,扣税后2.124元)）- 注意：实际是 IMPL_PLAN_PROFILE */
  IMPL_PLAN_PROFILE?: string;
  /** 股息率 - 实际字段名 DIVIDENT_RATIO */
  DIVIDENT_RATIO?: number;
  /** 每股收益(元) */
  BASIC_EPS?: number;
  /** 每股净资产(元) - 实际字段名 BVPS */
  BVPS?: number;
  /** 每股公积金(元) */
  PER_CAPITAL_RESERVE?: number;
  /** 每股未分配利润(元) */
  PER_UNASSIGN_PROFIT?: number;
  /** 净利润同比增长(%) - 实际字段名 PNP_YOY_RATIO */
  PNP_YOY_RATIO?: number;
  /** 总股本(股) */
  TOTAL_SHARES?: number;
  /** 股权登记日 */
  EQUITY_RECORD_DATE?: string;
  /** 除权除息日 */
  EX_DIVIDEND_DATE?: string;
  /** 派息日 */
  PAY_DATE?: string;
  /** 方案进度（如：实施分配）- 实际字段名 ASSIGN_PROGRESS */
  ASSIGN_PROGRESS?: string;
  /** 最新公告日期 */
  NOTICE_DATE?: string;
}

/**
 * 解析日期字符串，返回 YYYY-MM-DD 格式
 */
function parseDate(dateStr?: string): string | null {
  if (!dateStr) {
    return null;
  }
  // API 返回格式：2024-06-28 00:00:00 或 2024-06-28T00:00:00.000
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * 将 API 原始数据转换为标准格式
 */
function mapToDividendDetail(item: DividendApiItem): DividendDetail {
  return {
    // 基本信息
    code: item.SECURITY_CODE ?? '',
    name: item.SECURITY_NAME_ABBR ?? '',
    reportDate: parseDate(item.REPORT_DATE),
    planNoticeDate: parseDate(item.PLAN_NOTICE_DATE),
    disclosureDate: parseDate(item.PUBLISH_DATE ?? item.PLAN_NOTICE_DATE),

    // 送转股份信息
    assignTransferRatio: item.BONUS_IT_RATIO ?? null,
    bonusRatio: item.BONUS_RATIO ?? null,
    transferRatio: item.IT_RATIO ?? null,

    // 现金分红信息 - 修正映射
    dividendPretax: item.PRETAX_BONUS_RMB ?? null,
    dividendDesc: item.IMPL_PLAN_PROFILE ?? null, // ✅ 修正：IMPL_PLAN_PROFILE 是描述
    dividendYield: item.DIVIDENT_RATIO ?? null, // ✅ 修正：DIVIDENT_RATIO 是股息率

    // 财务指标 - 修正映射
    eps: item.BASIC_EPS ?? null,
    bps: item.BVPS ?? null, // ✅ 修正：BVPS 是每股净资产
    capitalReserve: item.PER_CAPITAL_RESERVE ?? null,
    unassignedProfit: item.PER_UNASSIGN_PROFIT ?? null,
    netProfitYoy: item.PNP_YOY_RATIO ?? null, // ✅ 修正：PNP_YOY_RATIO 是净利润同比
    totalShares: item.TOTAL_SHARES ?? null,

    // 关键日期
    equityRecordDate: parseDate(item.EQUITY_RECORD_DATE),
    exDividendDate: parseDate(item.EX_DIVIDEND_DATE),
    payDate: parseDate(item.PAY_DATE),

    // 进度信息 - 修正映射
    assignProgress: item.ASSIGN_PROGRESS ?? null, // ✅ 修正：ASSIGN_PROGRESS 是方案进度
    noticeDate: parseDate(item.NOTICE_DATE),
  };
}

/**
 * 获取股票分红派送详情
 * @param client - 请求客户端
 * @param symbol - 股票代码（纯数字或带交易所前缀，如 '600519' 或 'sh600519'）
 * @returns 分红派送详情列表，按报告日期降序排列
 */
export async function getDividendDetail(
  client: RequestClient,
  symbol: string
): Promise<DividendDetail[]> {
  // 移除可能的交易所前缀
  const pureSymbol = symbol.replace(/^(sh|sz|bj)/, '');

  const allData: DividendDetail[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams({
      sortColumns: 'REPORT_DATE',
      sortTypes: '-1',
      pageSize: '500',
      pageNumber: String(page),
      reportName: 'RPT_SHAREBONUS_DET',
      columns: 'ALL',
      quoteColumns: '',
      source: 'WEB',
      client: 'WEB',
      filter: `(SECURITY_CODE="${pureSymbol}")`,
    });

    const url = `${EM_DATACENTER_URL}?${params.toString()}`;
    const json = await client.get<DividendApiResponse>(url, {
      responseType: 'json',
    });

    const result = json?.result;
    if (!result || !Array.isArray(result.data)) {
      break;
    }

    // 首次请求获取总页数
    if (page === 1) {
      totalPages = result.pages ?? 1;
    }

    const items = result.data.map(mapToDividendDetail);
    allData.push(...items);
    page++;
  } while (page <= totalPages);

  return allData;
}
