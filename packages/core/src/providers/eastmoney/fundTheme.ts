/**
 * 东方财富 - 主题基金
 *
 * 数据源：https://fundmobapi.eastmoney.com/FundMNewApi/
 */
import { toFiniteNumberOrNull } from '../../core/parser';
import type { RequestClient } from '../../core/request';
import type {
  GetThemeListOptions,
  GetHotThemesOptions,
  GetThemeFundsOptions,
  ThemeFund,
  ThemeFundListResult,
  HotThemesResult,
  ThemeFundItem,
  ThemeFundItemList,
} from '../../types';

const FUND_THEME_BASE_URL = 'https://fundmobapi.eastmoney.com/FundMNewApi';

/** 固定请求参数 */
const COMMON_PARAMS = {
  plat: 'Android',
  appType: 'ttjj',
  product: 'EFund',
  Version: '1',
  deviceid: 'stock-sdk',
} as const;

/**
 * 获取全部主题基金列表
 *
 * @param client RequestClient
 * @param options 查询选项
 */
export async function getThemeList(
  client: RequestClient,
  options: GetThemeListOptions = {}
): Promise<ThemeFundListResult> {
  const sort = options.sort ?? 'ZDF';
  const order = options.order ?? 'desc';
  const category = options.category ?? '2';
  const pageSize = options.pageSize ?? 20;
  const page = options.page ?? 1;

  const params = new URLSearchParams({
    ...COMMON_PARAMS,
    RankItems: sort,
    RankVectors: order,
    category,
    pageSize: String(pageSize),
    page: String(page),
  });

  const url = `${FUND_THEME_BASE_URL}/FundMNSubjectList?${params.toString()}`;

  const payload = await client.get<{
    Data?: Array<{
      code: string;
      name: string;
      ZDF?: string;
      SYL_W?: string;
      SYL_M?: string;
      SYL_3M?: string;
      SYL_6M?: string;
      SYL_Y?: string;
      SYL_3Y?: string;
      SYL_5Y?: string;
      isIndustry?: 0 | 1;
    }>;
    pageinfo?: {
      totalPages: number;
      pageSize: number;
      page: number;
    };
  }>(url, {
    provider: 'eastmoney',
    responseType: 'json',
  });

  const data = payload.Data ?? [];
  const info = payload.pageinfo ?? { totalPages: 0, pageSize, page };

  const items: ThemeFund[] = data.map((item) => ({
    code: item.code ?? '',
    name: item.name ?? '',
    dailyChange: toFiniteNumberOrNull(item.ZDF),
    weeklyReturn: toFiniteNumberOrNull(item.SYL_W),
    monthlyReturn: toFiniteNumberOrNull(item.SYL_M),
    quarterlyReturn: toFiniteNumberOrNull(item.SYL_3M),
    halfYearReturn: toFiniteNumberOrNull(item.SYL_6M),
    yearlyReturn: toFiniteNumberOrNull(item.SYL_Y),
    threeYearReturn: toFiniteNumberOrNull(item.SYL_3Y),
    fiveYearReturn: toFiniteNumberOrNull(item.SYL_5Y),
    type: item.isIndustry === 1 ? '行业' : item.isIndustry === 0 ? '概念' : '行业',
  }));

  return {
    items,
    totalPages: info.totalPages ?? 0,
    pageSize: info.pageSize ?? pageSize,
    currentPage: info.page ?? page,
  };
}

/**
 * 获取热门主题
 *
 * @param client RequestClient
 * @param options 查询选项
 */
export async function getHotThemes(
  client: RequestClient,
  options: GetHotThemesOptions = {}
): Promise<HotThemesResult> {
  const sort = options.sort ?? 'ZDF';
  const order = options.order ?? 'desc';
  const category = options.category ?? '2';
  const limit = options.limit ?? 20;

  const params = new URLSearchParams({
    ...COMMON_PARAMS,
    RankItems: sort,
    RankVectors: order,
    category,
    limit: String(limit),
  });

  const url = `${FUND_THEME_BASE_URL}/FundThemeList?${params.toString()}`;

  const payload = await client.get<{
    Data?: Array<{
      code: string;
      name: string;
      ZDF?: string;
      SYL_W?: string;
      SYL_M?: string;
      SYL_3M?: string;
      SYL_6M?: string;
      SYL_Y?: string;
      SYL_3Y?: string;
      SYL_5Y?: string;
      isIndustry?: 0 | 1;
    }>;
  }>(url, {
    provider: 'eastmoney',
    responseType: 'json',
  });

  const data = payload.Data ?? [];

  return data.map((item: NonNullable<typeof payload.Data>[number]) => ({
    code: item.code ?? '',
    name: item.name ?? '',
    dailyChange: toFiniteNumberOrNull(item.ZDF),
    weeklyReturn: toFiniteNumberOrNull(item.SYL_W),
    monthlyReturn: toFiniteNumberOrNull(item.SYL_M),
    quarterlyReturn: toFiniteNumberOrNull(item.SYL_3M),
    halfYearReturn: toFiniteNumberOrNull(item.SYL_6M),
    yearlyReturn: toFiniteNumberOrNull(item.SYL_Y),
    threeYearReturn: toFiniteNumberOrNull(item.SYL_3Y),
    fiveYearReturn: toFiniteNumberOrNull(item.SYL_5Y),
    type: item.isIndustry === 1 ? '行业' : item.isIndustry === 0 ? '概念' : '行业',
  }));
}

/**
 * 获取主题下基金列表
 *
 * @param client RequestClient
 * @param themeCode 主题代码，如 'BK0438'
 * @param options 查询选项
 */
export async function getThemeFunds(
  client: RequestClient,
  themeCode: string,
  options: GetThemeFundsOptions = {}
): Promise<ThemeFundItemList> {
  const sortColumn = options.sortColumn ?? 'SYL_1N';
  const sort = options.sort ?? 'desc';
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const fundType = options.fundType ?? '';

  const params = new URLSearchParams({
    ...COMMON_PARAMS,
    TOPICAL: themeCode,
    SortColumn: sortColumn,
    Sort: sort,
    pageIndex: String(page),
    pageSize: String(pageSize),
    FundType: fundType,
  });

  const url = `${FUND_THEME_BASE_URL}/FundMNRank?${params.toString()}`;

  const payload = await client.get<{
    Data?: Array<{
      fscode: string;
      abname: string;
      ftype: string;
      ZDF?: string;
      SYL_Z?: string;
      SYL_Y?: string;
      SYL_3Y?: string;
      SYL_1N?: string;
      dwjz?: string;
    }>;
    fundinfo?: {
      total: number;
      pagesize: number;
      pageindex: number;
    };
  }>(url, {
    provider: 'eastmoney',
    responseType: 'json',
  });

  const data = payload.Data ?? [];
  const fundInfo = payload.fundinfo ?? { total: 0, pagesize: pageSize, pageindex: page };

  const items: ThemeFundItem[] = data.map((item: NonNullable<typeof payload.Data>[number]) => ({
    code: item.fscode ?? '',
    name: item.abname ?? '',
    fundType: item.ftype ?? '',
    dailyChange: toFiniteNumberOrNull(item.ZDF),
    weeklyReturn: toFiniteNumberOrNull(item.SYL_Z),
    monthlyReturn: toFiniteNumberOrNull(item.SYL_Y),
    quarterlyReturn: toFiniteNumberOrNull(item.SYL_3Y),
    yearlyReturn: toFiniteNumberOrNull(item.SYL_1N),
    nav: toFiniteNumberOrNull(item.dwjz),
    // themeName 省略：上游 FundMNRank 不返回主题名称，仅回填 themeCode，调用方自行映射
    themeCode: themeCode,
  }));

  return {
    items,
    total: fundInfo.total ?? 0,
    pageIndex: fundInfo.pageindex ?? page,
    pageSize: fundInfo.pagesize ?? pageSize,
  };
}

// 重新导出类型供 index.ts 使用
export type {
  GetThemeListOptions,
  GetHotThemesOptions,
  GetThemeFundsOptions,
  ThemeFund,
  ThemeFundListResult,
  HotThemesResult,
  ThemeFundItem,
  ThemeFundItemList,
};
