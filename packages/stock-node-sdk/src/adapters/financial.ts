/**
 * Node 端财务与基本面数据适配器（实测自东方财富数据中心 RPT 接口，统一标准化字段输出）。
 * 自动识别 A 股（CN）、港股（HK）、美股（US）三市场代码并路由到对应东财数据中心报表。
 */
import { toNumberSafe } from '@stock-sdk/core/core';
import { eastmoney } from '@stock-sdk/core/providers';
import { normalizeSymbol } from '@stock-sdk/core/symbols';
import type { SourceAdapter } from '@stock-sdk/core/router';
import type {
  BalanceSheet,
  CashFlowStatement,
  FinancialIndicator,
  FinancialQueryOptions,
  IncomeStatement,
  PerformanceExpress,
  PerformanceForecast,
  PerformanceListOptions,
} from '@stock-sdk/core/types';
import type { NodeHttpClient } from '../transport/nodeHttpClient';

export interface SymbolFinancialInput {
  symbol: string;
  options: FinancialQueryOptions;
}

function dateOnly(raw: unknown): string {
  return typeof raw === 'string' ? raw.slice(0, 10) : '';
}

function nullableDate(raw: unknown): string | null {
  const s = dateOnly(raw);
  return s || null;
}

function str(raw: unknown): string {
  return typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
}

function nullableStr(raw: unknown): string | null {
  const s = str(raw).trim();
  return s || null;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

interface PivotPeriodBucket {
  code: string;
  name: string;
  reportDate: string;
  dateTypeCode: string;
  isQuarterlyOnly: boolean;
  items: Map<string, number | null>;
}

/**
 * 将东财港股/美股长表财报（每行一条科目）按报告期透视为标准报告期数组。
 * 同一报告期如同时出现年报/累计报与单季报，优先保留年报/累计口径。
 */
function pivotLongFinancialRows(
  rows: readonly Record<string, unknown>[],
  itemNameKey: 'STD_ITEM_NAME' | 'ITEM_NAME',
  fallbackCode: string
): PivotPeriodBucket[] {
  const byPeriod = new Map<string, PivotPeriodBucket>();

  for (const r of rows) {
    const reportDate = dateOnly(r.REPORT_DATE);
    if (!reportDate) continue;
    const dateTypeCode = str(r.DATE_TYPE_CODE);
    const reportType = str(r.REPORT_TYPE);
    const isQuarterlyOnly = reportType.includes('单季') || dateTypeCode === '003' || dateTypeCode === '006';
    const key = `${reportDate}|${dateTypeCode}`;
    let bucket = byPeriod.get(key);
    if (!bucket) {
      bucket = {
        code: str(r.SECURITY_CODE) || fallbackCode,
        name: str(r.SECURITY_NAME_ABBR),
        reportDate,
        dateTypeCode,
        isQuarterlyOnly,
        items: new Map<string, number | null>(),
      };
      byPeriod.set(key, bucket);
    }
    const itemName = str(r[itemNameKey]).trim();
    if (itemName) {
      bucket.items.set(itemName, toNumberSafe(r.AMOUNT));
    }
  }

  // 同一报告期去重：优先保留累计/年报口径，其次科目最全的桶
  const dedupByDate = new Map<string, PivotPeriodBucket>();
  for (const bucket of byPeriod.values()) {
    const existing = dedupByDate.get(bucket.reportDate);
    if (!existing) {
      dedupByDate.set(bucket.reportDate, bucket);
      continue;
    }
    if (existing.isQuarterlyOnly && !bucket.isQuarterlyOnly) {
      dedupByDate.set(bucket.reportDate, bucket);
    } else if (existing.isQuarterlyOnly === bucket.isQuarterlyOnly && bucket.items.size > existing.items.size) {
      dedupByDate.set(bucket.reportDate, bucket);
    }
  }

  return [...dedupByDate.values()].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
}

function pickItem(items: Map<string, number | null>, candidates: readonly string[]): number | null {
  for (const key of candidates) {
    const val = items.get(key);
    if (val !== undefined && val !== null) return val;
  }
  return null;
}

function paginateSlice<T>(list: readonly T[], options: FinancialQueryOptions): T[] {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? 20);
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
}

async function fetchEmFinancialIndicators(
  client: NodeHttpClient,
  symbol: string,
  options: FinancialQueryOptions = {}
): Promise<FinancialIndicator[]> {
  const ns = normalizeSymbol(symbol);
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? 20);

  if (ns.market === 'HK') {
    const code = ns.code.padStart(5, '0');
    const res = await eastmoney.fetchDatacenter<FinancialIndicator>(
      client,
      {
        reportName: 'RPT_HKF10_FN_MAININDICATOR',
        filter: `(SECURITY_CODE="${code}")`,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        startPage: page,
        pageSize,
        fetchAllPages: false,
      },
      (r): FinancialIndicator => ({
        code: str(r.SECURITY_CODE) || code,
        name: str(r.SECURITY_NAME_ABBR),
        reportDate: dateOnly(r.REPORT_DATE),
        reportName: str(r.REPORT_TYPE),
        noticeDate: null,
        eps: toNumberSafe(r.BASIC_EPS),
        bps: toNumberSafe(r.BPS),
        operatingCashFlowPerShare: toNumberSafe(r.PER_NETCASH_OPERATE),
        totalRevenue: toNumberSafe(r.OPERATE_INCOME),
        revenueYoy: toNumberSafe(r.OPERATE_INCOME_YOY),
        netProfit: toNumberSafe(r.HOLDER_PROFIT),
        netProfitYoy: toNumberSafe(r.HOLDER_PROFIT_YOY),
        roe: toNumberSafe(r.ROE_AVG),
        grossMargin: toNumberSafe(r.GROSS_PROFIT_RATIO),
        currency: 'HKD',
        source: 'eastmoney',
      })
    );
    return res.data;
  }

  if (ns.market === 'US') {
    const code = ns.code.toUpperCase();
    const res = await eastmoney.fetchDatacenter<FinancialIndicator>(
      client,
      {
        reportName: 'RPT_USF10_FN_GMAININDICATOR',
        filter: `(SECURITY_CODE="${code}")`,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        startPage: page,
        pageSize,
        fetchAllPages: false,
      },
      (r): FinancialIndicator => ({
        code: str(r.SECURITY_CODE) || code,
        name: str(r.SECURITY_NAME_ABBR),
        reportDate: dateOnly(r.REPORT_DATE),
        reportName: str(r.REPORT_DATA_TYPE) || str(r.REPORT_TYPE),
        noticeDate: nullableDate(r.NOTICE_DATE),
        eps: toNumberSafe(r.BASIC_EPS),
        bps: null,
        operatingCashFlowPerShare: null,
        totalRevenue: toNumberSafe(r.OPERATE_INCOME),
        revenueYoy: toNumberSafe(r.OPERATE_INCOME_YOY),
        netProfit: toNumberSafe(r.PARENT_HOLDER_NETPROFIT),
        netProfitYoy: toNumberSafe(r.PARENT_HOLDER_NETPROFIT_YOY),
        roe: toNumberSafe(r.ROE_AVG),
        grossMargin: toNumberSafe(r.GROSS_PROFIT_RATIO),
        currency: 'USD',
        source: 'eastmoney',
      })
    );
    return res.data;
  }

  const res = await eastmoney.fetchDatacenter<FinancialIndicator>(
    client,
    {
      reportName: 'RPT_LICO_FN_CPD',
      filter: `(SECURITY_CODE="${ns.code}")`,
      sortColumns: 'REPORTDATE',
      sortTypes: '-1',
      startPage: page,
      pageSize,
      fetchAllPages: false,
    },
    (r): FinancialIndicator => ({
      code: str(r.SECURITY_CODE) || ns.code,
      name: str(r.SECURITY_NAME_ABBR),
      reportDate: dateOnly(r.REPORTDATE),
      reportName: str(r.DATATYPE) || str(r.QDATE),
      noticeDate: nullableDate(r.NOTICE_DATE ?? r.UPDATE_DATE),
      eps: toNumberSafe(r.BASIC_EPS),
      bps: toNumberSafe(r.BPS),
      operatingCashFlowPerShare: toNumberSafe(r.MGJYXJJE),
      totalRevenue: toNumberSafe(r.TOTAL_OPERATE_INCOME),
      revenueYoy: toNumberSafe(r.YSTZ),
      netProfit: toNumberSafe(r.PARENT_NETPROFIT),
      netProfitYoy: toNumberSafe(r.SJLTZ),
      roe: toNumberSafe(r.WEIGHTAVG_ROE),
      grossMargin: toNumberSafe(r.XSMLL),
      currency: 'CNY',
      source: 'eastmoney',
    })
  );
  return res.data;
}

/**
 * 按需逐页拉取港/美股长表财报并透视去重，直至凑齐 `page * pageSize` 个报告期或抵达服务端末页。
 * 解决单页 500 行长表记录仅够约 6~10 个报告期、导致 `page >= 2` 静默返回空数组的问题。
 */
async function fetchEmPivotedBuckets(
  client: NodeHttpClient,
  reportName: string,
  code: string,
  itemNameKey: 'STD_ITEM_NAME' | 'ITEM_NAME',
  options: FinancialQueryOptions
): Promise<PivotPeriodBucket[]> {
  const neededPeriods = Math.max(1, options.page ?? 1) * Math.max(1, options.pageSize ?? 20);
  const rawPageSize = 500;
  const maxRawPages = 20;
  const collected: Record<string, unknown>[] = [];

  for (let rawPage = 1; rawPage <= maxRawPages; rawPage++) {
    const res = await eastmoney.fetchDatacenter<Record<string, unknown>>(
      client,
      {
        reportName,
        filter: `(SECURITY_CODE="${code}")`,
        sortColumns: 'REPORT_DATE',
        sortTypes: '-1',
        startPage: rawPage,
        pageSize: rawPageSize,
        fetchAllPages: false,
      },
      (r) => r
    );
    if (res.data.length === 0) break;
    collected.push(...res.data);

    const pivoted = pivotLongFinancialRows(collected, itemNameKey, code);
    // 多留 1 个报告期缓冲，防止跨页边界把最后一个报告期的科目腰斩
    if (rawPage >= res.pages || pivoted.length >= neededPeriods + 1) {
      return pivoted;
    }
  }

  return pivotLongFinancialRows(collected, itemNameKey, code);
}

async function fetchEmIncomeStatements(
  client: NodeHttpClient,
  symbol: string,
  options: FinancialQueryOptions = {}
): Promise<IncomeStatement[]> {
  const ns = normalizeSymbol(symbol);

  if (ns.market === 'HK') {
    const code = ns.code.padStart(5, '0');
    const buckets = await fetchEmPivotedBuckets(client, 'RPT_HKF10_FN_INCOME_PC', code, 'STD_ITEM_NAME', options);
    return paginateSlice(buckets, options).map(
      (b): IncomeStatement => {
        const rev = pickItem(b.items, ['营运收入', '营业额']);
        const gross = pickItem(b.items, ['毛利']);
        const opCost = pickItem(b.items, ['销售成本', '营业成本']) ?? (rev !== null && gross !== null ? rev - gross : null);
        return {
          code: b.code,
          name: b.name,
          reportDate: b.reportDate,
          noticeDate: null,
          totalRevenue: rev,
          revenueYoy: null,
          totalOperatingCost: pickItem(b.items, ['营运支出']),
          operatingCost: opCost,
          sellingExpense: pickItem(b.items, ['销售及分销费用']),
          adminExpense: pickItem(b.items, ['行政开支']),
          financeExpense: pickItem(b.items, ['融资成本']),
          operatingProfit: pickItem(b.items, ['经营溢利']),
          totalProfit: pickItem(b.items, ['除税前溢利']),
          incomeTax: pickItem(b.items, ['税项']),
          netProfit: pickItem(b.items, ['股东应占溢利', '除税后溢利']),
          netProfitYoy: null,
          deductedNetProfit: null,
          currency: 'HKD',
          source: 'eastmoney',
        };
      }
    );
  }

  if (ns.market === 'US') {
    const code = ns.code.toUpperCase();
    const buckets = await fetchEmPivotedBuckets(client, 'RPT_USF10_FN_INCOME', code, 'ITEM_NAME', options);
    return paginateSlice(buckets, options).map(
      (b): IncomeStatement => ({
        code: b.code,
        name: b.name,
        reportDate: b.reportDate,
        noticeDate: null,
        totalRevenue: pickItem(b.items, ['营业收入', '主营收入']),
        revenueYoy: null,
        totalOperatingCost: pickItem(b.items, ['营业费用', '营业成本', '主营成本']),
        operatingCost: pickItem(b.items, ['营业成本', '主营成本']),
        sellingExpense: pickItem(b.items, ['营销费用', '销售费用']),
        adminExpense: pickItem(b.items, ['管理费用', '一般及行政费用']),
        financeExpense: pickItem(b.items, ['利息支出', '财务费用']),
        operatingProfit: pickItem(b.items, ['营业利润']),
        totalProfit: pickItem(b.items, ['持续经营税前利润', '税前利润']),
        incomeTax: pickItem(b.items, ['所得税']),
        netProfit: pickItem(b.items, ['归属于母公司股东净利润', '归属于普通股股东净利润', '净利润']),
        netProfitYoy: null,
        deductedNetProfit: null,
        currency: 'USD',
        source: 'eastmoney',
      })
    );
  }

  const res = await eastmoney.fetchDatacenter<IncomeStatement>(
    client,
    {
      reportName: 'RPT_DMSK_FN_INCOME',
      filter: `(SECURITY_CODE="${ns.code}")`,
      sortColumns: 'REPORT_DATE',
      sortTypes: '-1',
      startPage: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      fetchAllPages: false,
    },
    (r): IncomeStatement => ({
      code: str(r.SECURITY_CODE) || ns.code,
      name: str(r.SECURITY_NAME_ABBR),
      reportDate: dateOnly(r.REPORT_DATE),
      noticeDate: nullableDate(r.NOTICE_DATE),
      totalRevenue: toNumberSafe(r.TOTAL_OPERATE_INCOME),
      revenueYoy: toNumberSafe(r.TOI_RATIO),
      totalOperatingCost: toNumberSafe(r.TOTAL_OPERATE_COST),
      operatingCost: toNumberSafe(r.OPERATE_COST),
      sellingExpense: toNumberSafe(r.SALE_EXPENSE),
      adminExpense: toNumberSafe(r.MANAGE_EXPENSE),
      financeExpense: toNumberSafe(r.FINANCE_EXPENSE),
      operatingProfit: toNumberSafe(r.OPERATE_PROFIT),
      totalProfit: toNumberSafe(r.TOTAL_PROFIT),
      incomeTax: toNumberSafe(r.INCOME_TAX),
      netProfit: toNumberSafe(r.PARENT_NETPROFIT),
      netProfitYoy: toNumberSafe(r.PARENT_NETPROFIT_RATIO),
      deductedNetProfit: toNumberSafe(r.DEDUCT_PARENT_NETPROFIT),
      currency: 'CNY',
      source: 'eastmoney',
    })
  );
  return res.data;
}

async function fetchEmBalanceSheets(
  client: NodeHttpClient,
  symbol: string,
  options: FinancialQueryOptions = {}
): Promise<BalanceSheet[]> {
  const ns = normalizeSymbol(symbol);

  if (ns.market === 'HK') {
    const code = ns.code.padStart(5, '0');
    const buckets = await fetchEmPivotedBuckets(client, 'RPT_HKF10_FN_BALANCE_PC', code, 'STD_ITEM_NAME', options);
    return paginateSlice(buckets, options).map(
      (b): BalanceSheet => {
        const totalAssets = pickItem(b.items, ['总资产']);
        const totalLiabilities = pickItem(b.items, ['总负债']);
        const curAssets = pickItem(b.items, ['流动资产合计']);
        const curLiab = pickItem(b.items, ['流动负债合计']);
        return {
          code: b.code,
          name: b.name,
          reportDate: b.reportDate,
          noticeDate: null,
          totalAssets,
          totalAssetsYoy: null,
          monetaryFunds: pickItem(b.items, ['现金及等价物', '现金及现金等价物']),
          accountsReceivable: pickItem(b.items, ['应收帐款', '应收账款']),
          inventory: pickItem(b.items, ['存货']),
          fixedAssets: pickItem(b.items, ['物业厂房及设备']),
          totalLiabilities,
          accountsPayable: pickItem(b.items, ['应付帐款', '应付账款']),
          totalEquity: pickItem(b.items, ['总权益', '股东权益', '净资产']),
          debtToAssetRatio:
            totalAssets && totalLiabilities !== null ? round2((totalLiabilities / totalAssets) * 100) : null,
          currentRatio: curAssets !== null && curLiab && curLiab !== 0 ? round2(curAssets / curLiab) : null,
          currency: 'HKD',
          source: 'eastmoney',
        };
      }
    );
  }

  if (ns.market === 'US') {
    const code = ns.code.toUpperCase();
    const buckets = await fetchEmPivotedBuckets(client, 'RPT_USF10_FN_BALANCE', code, 'ITEM_NAME', options);
    return paginateSlice(buckets, options).map(
      (b): BalanceSheet => {
        const totalAssets = pickItem(b.items, ['总资产']);
        const totalLiabilities = pickItem(b.items, ['总负债']);
        const curAssets = pickItem(b.items, ['流动资产合计']);
        const curLiab = pickItem(b.items, ['流动负债合计']);
        return {
          code: b.code,
          name: b.name,
          reportDate: b.reportDate,
          noticeDate: null,
          totalAssets,
          totalAssetsYoy: null,
          monetaryFunds: pickItem(b.items, ['现金及现金等价物']),
          accountsReceivable: pickItem(b.items, ['应收账款']),
          inventory: pickItem(b.items, ['存货']),
          fixedAssets: pickItem(b.items, ['物业、厂房及设备', '固定资产']),
          totalLiabilities,
          accountsPayable: pickItem(b.items, ['应付账款']),
          totalEquity: pickItem(b.items, ['股东权益合计', '归属于母公司股东权益']),
          debtToAssetRatio:
            totalAssets && totalLiabilities !== null ? round2((totalLiabilities / totalAssets) * 100) : null,
          currentRatio: curAssets !== null && curLiab && curLiab !== 0 ? round2(curAssets / curLiab) : null,
          currency: 'USD',
          source: 'eastmoney',
        };
      }
    );
  }

  const res = await eastmoney.fetchDatacenter<BalanceSheet>(
    client,
    {
      reportName: 'RPT_DMSK_FN_BALANCE',
      filter: `(SECURITY_CODE="${ns.code}")`,
      sortColumns: 'REPORT_DATE',
      sortTypes: '-1',
      startPage: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      fetchAllPages: false,
    },
    (r): BalanceSheet => ({
      code: str(r.SECURITY_CODE) || ns.code,
      name: str(r.SECURITY_NAME_ABBR),
      reportDate: dateOnly(r.REPORT_DATE),
      noticeDate: nullableDate(r.NOTICE_DATE),
      totalAssets: toNumberSafe(r.TOTAL_ASSETS),
      totalAssetsYoy: toNumberSafe(r.TOTAL_ASSETS_RATIO),
      monetaryFunds: toNumberSafe(r.MONETARYFUNDS),
      accountsReceivable: toNumberSafe(r.ACCOUNTS_RECE),
      inventory: toNumberSafe(r.INVENTORY),
      fixedAssets: toNumberSafe(r.FIXED_ASSET),
      totalLiabilities: toNumberSafe(r.TOTAL_LIABILITIES),
      accountsPayable: toNumberSafe(r.ACCOUNTS_PAYABLE),
      totalEquity: toNumberSafe(r.TOTAL_EQUITY),
      debtToAssetRatio: toNumberSafe(r.DEBT_ASSET_RATIO),
      currentRatio: toNumberSafe(r.CURRENT_RATIO),
      currency: 'CNY',
      source: 'eastmoney',
    })
  );
  return res.data;
}

async function fetchEmCashFlowStatements(
  client: NodeHttpClient,
  symbol: string,
  options: FinancialQueryOptions = {}
): Promise<CashFlowStatement[]> {
  const ns = normalizeSymbol(symbol);

  if (ns.market === 'HK') {
    const code = ns.code.padStart(5, '0');
    const buckets = await fetchEmPivotedBuckets(client, 'RPT_HKF10_FN_CASHFLOW_PC', code, 'STD_ITEM_NAME', options);
    return paginateSlice(buckets, options).map(
      (b): CashFlowStatement => ({
        code: b.code,
        name: b.name,
        reportDate: b.reportDate,
        noticeDate: null,
        operatingCashFlow: pickItem(b.items, ['经营业务现金净额']),
        operatingCashFlowYoy: null,
        cashFromSales: null,
        investingCashFlow: pickItem(b.items, ['投资业务现金净额']),
        financingCashFlow: pickItem(b.items, ['融资业务现金净额']),
        netCashIncrease: pickItem(b.items, ['现金净额']),
        currency: 'HKD',
        source: 'eastmoney',
      })
    );
  }

  if (ns.market === 'US') {
    const code = ns.code.toUpperCase();
    const buckets = await fetchEmPivotedBuckets(client, 'RPT_USSK_FN_CASHFLOW', code, 'ITEM_NAME', options);
    return paginateSlice(buckets, options).map(
      (b): CashFlowStatement => ({
        code: b.code,
        name: b.name,
        reportDate: b.reportDate,
        noticeDate: null,
        operatingCashFlow: pickItem(b.items, ['经营活动产生的现金流量净额']),
        operatingCashFlowYoy: null,
        cashFromSales: null,
        investingCashFlow: pickItem(b.items, ['投资活动产生的现金流量净额']),
        financingCashFlow: pickItem(b.items, ['筹资活动产生的现金流量净额']),
        netCashIncrease: pickItem(b.items, ['现金及现金等价物增加(减少)额']),
        currency: 'USD',
        source: 'eastmoney',
      })
    );
  }

  const res = await eastmoney.fetchDatacenter<CashFlowStatement>(
    client,
    {
      reportName: 'RPT_DMSK_FN_CASHFLOW',
      filter: `(SECURITY_CODE="${ns.code}")`,
      sortColumns: 'REPORT_DATE',
      sortTypes: '-1',
      startPage: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      fetchAllPages: false,
    },
    (r): CashFlowStatement => ({
      code: str(r.SECURITY_CODE) || ns.code,
      name: str(r.SECURITY_NAME_ABBR),
      reportDate: dateOnly(r.REPORT_DATE),
      noticeDate: nullableDate(r.NOTICE_DATE),
      operatingCashFlow: toNumberSafe(r.NETCASH_OPERATE),
      operatingCashFlowYoy: toNumberSafe(r.NETCASH_OPERATE_RATIO),
      cashFromSales: toNumberSafe(r.SALES_SERVICES),
      investingCashFlow: toNumberSafe(r.NETCASH_INVEST),
      financingCashFlow: toNumberSafe(r.NETCASH_FINANCE),
      netCashIncrease: toNumberSafe(r.CCE_ADD),
      currency: 'CNY',
      source: 'eastmoney',
    })
  );
  return res.data;
}

function buildPerformanceFilter(options: PerformanceListOptions): string | undefined {
  const clauses: string[] = [];
  if (options.symbol) {
    const ns = normalizeSymbol(options.symbol, { market: 'CN' });
    clauses.push(`(SECURITY_CODE="${ns.code}")`);
  }
  if (options.reportDate) {
    clauses.push(`(REPORT_DATE='${options.reportDate}')`);
  }
  return clauses.length > 0 ? clauses.join('') : undefined;
}

async function fetchEmPerformanceForecast(
  client: NodeHttpClient,
  options: PerformanceListOptions = {}
): Promise<PerformanceForecast[]> {
  const res = await eastmoney.fetchDatacenter<PerformanceForecast>(
    client,
    {
      reportName: 'RPT_PUBLIC_OP_NEWPREDICT',
      filter: buildPerformanceFilter(options),
      sortColumns: 'NOTICE_DATE',
      sortTypes: '-1',
      startPage: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      fetchAllPages: false,
    },
    (r): PerformanceForecast => ({
      code: str(r.SECURITY_CODE),
      name: str(r.SECURITY_NAME_ABBR),
      reportDate: dateOnly(r.REPORT_DATE),
      noticeDate: nullableDate(r.NOTICE_DATE),
      metric: str(r.PREDICT_FINANCE),
      forecastType: nullableStr(r.PREDICT_TYPE),
      amountLower: toNumberSafe(r.PREDICT_AMT_LOWER),
      amountUpper: toNumberSafe(r.PREDICT_AMT_UPPER),
      changePercentLower: toNumberSafe(r.ADD_AMP_LOWER),
      changePercentUpper: toNumberSafe(r.ADD_AMP_UPPER),
      summary: str(r.PREDICT_CONTENT),
      source: 'eastmoney',
    })
  );
  return res.data;
}

async function fetchEmPerformanceExpress(
  client: NodeHttpClient,
  options: PerformanceListOptions = {}
): Promise<PerformanceExpress[]> {
  const res = await eastmoney.fetchDatacenter<PerformanceExpress>(
    client,
    {
      reportName: 'RPT_FCI_PERFORMANCEE',
      filter: buildPerformanceFilter(options),
      sortColumns: 'UPDATE_DATE',
      sortTypes: '-1',
      startPage: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      fetchAllPages: false,
    },
    (r): PerformanceExpress => ({
      code: str(r.SECURITY_CODE),
      name: str(r.SECURITY_NAME_ABBR),
      reportDate: dateOnly(r.REPORT_DATE),
      noticeDate: nullableDate(r.UPDATE_DATE),
      eps: toNumberSafe(r.BASIC_EPS),
      totalRevenue: toNumberSafe(r.TOTAL_OPERATE_INCOME),
      netProfit: toNumberSafe(r.PARENT_NETPROFIT),
      bps: toNumberSafe(r.PARENT_BVPS),
      roe: toNumberSafe(r.WEIGHTAVG_ROE),
      source: 'eastmoney',
    })
  );
  return res.data;
}

/**
 * 创建全部财务与基本面适配器（A 股 / 港股 / 美股三市场自动识别）。
 */
export function createNodeFinancialAdapters(
  client: NodeHttpClient
): SourceAdapter<unknown, unknown>[] {
  const indicators: SourceAdapter<SymbolFinancialInput, FinancialIndicator[]> = {
    id: 'eastmoney:financial.indicators',
    capability: 'financial.indicators',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['eps', 'bps', 'roe', 'totalRevenue', 'netProfit', 'grossMargin']),
    supports: () => true,
    fetch: (input) => fetchEmFinancialIndicators(client, input.symbol, input.options),
  };

  const income: SourceAdapter<SymbolFinancialInput, IncomeStatement[]> = {
    id: 'eastmoney:financial.income',
    capability: 'financial.income',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['totalRevenue', 'operatingProfit', 'netProfit']),
    supports: () => true,
    fetch: (input) => fetchEmIncomeStatements(client, input.symbol, input.options),
  };

  const balance: SourceAdapter<SymbolFinancialInput, BalanceSheet[]> = {
    id: 'eastmoney:financial.balance',
    capability: 'financial.balance',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['totalAssets', 'totalLiabilities', 'totalEquity', 'debtToAssetRatio']),
    supports: () => true,
    fetch: (input) => fetchEmBalanceSheets(client, input.symbol, input.options),
  };

  const cashflow: SourceAdapter<SymbolFinancialInput, CashFlowStatement[]> = {
    id: 'eastmoney:financial.cashflow',
    capability: 'financial.cashflow',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['operatingCashFlow', 'investingCashFlow', 'financingCashFlow']),
    supports: () => true,
    fetch: (input) => fetchEmCashFlowStatements(client, input.symbol, input.options),
  };

  const forecast: SourceAdapter<PerformanceListOptions, PerformanceForecast[]> = {
    id: 'eastmoney:financial.forecast',
    capability: 'financial.forecast',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['metric', 'amountLower', 'amountUpper', 'summary']),
    supports: () => true,
    fetch: (opts) => fetchEmPerformanceForecast(client, opts),
  };

  const express: SourceAdapter<PerformanceListOptions, PerformanceExpress[]> = {
    id: 'eastmoney:financial.express',
    capability: 'financial.express',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['eps', 'totalRevenue', 'netProfit', 'roe']),
    supports: () => true,
    fetch: (opts) => fetchEmPerformanceExpress(client, opts),
  };

  return [
    indicators,
    income,
    balance,
    cashflow,
    forecast,
    express,
  ] as SourceAdapter<unknown, unknown>[];
}
