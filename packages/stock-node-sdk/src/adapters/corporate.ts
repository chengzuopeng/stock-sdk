/**
 * Node 端公司治理与可转债适配器（实测自东方财富数据中心 RPT 接口）。
 */
import { toNumberSafe } from '@stock-sdk/core/core';
import { eastmoney } from '@stock-sdk/core/providers';
import { normalizeSymbol } from '@stock-sdk/core/symbols';
import type { SourceAdapter } from '@stock-sdk/core/router';
import type {
  ConvertibleBondItem,
  CorporateQueryOptions,
  ShareholderCount,
  TopShareholder,
} from '@stock-sdk/core/types';
import type { NodeHttpClient } from '../transport/nodeHttpClient';

export interface SymbolCorporateInput {
  symbol: string;
  options: CorporateQueryOptions;
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

async function fetchEmTopHolders(
  client: NodeHttpClient,
  symbol: string,
  options: CorporateQueryOptions = {}
): Promise<TopShareholder[]> {
  const ns = normalizeSymbol(symbol, { market: 'CN' });
  const res = await eastmoney.fetchDatacenter<TopShareholder>(
    client,
    {
      reportName: 'RPT_F10_EH_FREEHOLDERS',
      filter: `(SECURITY_CODE="${ns.code}")`,
      sortColumns: 'END_DATE,HOLDER_RANK',
      sortTypes: '-1,1',
      startPage: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      fetchAllPages: false,
    },
    (r): TopShareholder => ({
      code: str(r.SECURITY_CODE) || ns.code,
      name: str(r.SECURITY_NAME_ABBR),
      endDate: dateOnly(r.END_DATE),
      rank: toNumberSafe(r.HOLDER_RANK) ?? 0,
      holderName: str(r.HOLDER_NAME),
      holderType: nullableStr(r.HOLDER_TYPE),
      holdShares: toNumberSafe(r.HOLD_NUM),
      freeHoldRatio: toNumberSafe(r.FREE_HOLDNUM_RATIO),
      totalHoldRatio: toNumberSafe(r.HOLD_RATIO),
      changeType: nullableStr(r.HOLD_NUM_CHANGE ?? r.HOLD_CHANGE),
      changeRatio: toNumberSafe(r.CHANGE_RATIO),
      marketValue: toNumberSafe(r.HOLDER_MARKET_CAP),
      source: 'eastmoney',
    })
  );
  return res.data;
}

async function fetchEmHolderCount(
  client: NodeHttpClient,
  symbol: string,
  options: CorporateQueryOptions = {}
): Promise<ShareholderCount[]> {
  const ns = normalizeSymbol(symbol, { market: 'CN' });
  const res = await eastmoney.fetchDatacenter<ShareholderCount>(
    client,
    {
      reportName: 'RPT_HOLDERNUM_DET',
      filter: `(SECURITY_CODE="${ns.code}")`,
      sortColumns: 'END_DATE',
      sortTypes: '-1',
      startPage: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      fetchAllPages: false,
    },
    (r): ShareholderCount => ({
      code: str(r.SECURITY_CODE) || ns.code,
      name: str(r.SECURITY_NAME_ABBR),
      endDate: dateOnly(r.END_DATE),
      noticeDate: nullableDate(r.HOLD_NOTICE_DATE),
      holderCount: toNumberSafe(r.HOLDER_NUM),
      prevHolderCount: toNumberSafe(r.PRE_HOLDER_NUM),
      change: toNumberSafe(r.HOLDER_NUM_CHANGE),
      changePercent: toNumberSafe(r.HOLDER_NUM_RATIO),
      avgHoldShares: toNumberSafe(r.AVG_HOLD_NUM),
      avgMarketValue: toNumberSafe(r.AVG_MARKET_CAP),
      source: 'eastmoney',
    })
  );
  return res.data;
}

async function fetchEmConvertibleBonds(
  client: NodeHttpClient,
  options: CorporateQueryOptions = {}
): Promise<ConvertibleBondItem[]> {
  const res = await eastmoney.fetchDatacenter<ConvertibleBondItem>(
    client,
    {
      reportName: 'RPT_BOND_CB_LIST',
      sortColumns: 'PUBLIC_START_DATE',
      sortTypes: '-1',
      startPage: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
      fetchAllPages: false,
    },
    (r): ConvertibleBondItem => ({
      bondCode: str(r.SECURITY_CODE),
      bondName: str(r.SECURITY_NAME_ABBR),
      stockCode: str(r.CONVERT_STOCK_CODE),
      stockName: nullableStr(r.SECURITY_SHORT_NAME),
      rating: nullableStr(r.RATING),
      issueScale: toNumberSafe(r.ACTUAL_ISSUE_SCALE),
      convertPrice: toNumberSafe(r.TRANSFER_PRICE ?? r.INITIAL_TRANSFER_PRICE),
      listingDate: nullableDate(r.LISTING_DATE),
      expireDate: nullableDate(r.EXPIRE_DATE),
      durationYears: toNumberSafe(r.BOND_EXPIRE),
      interestRateExplain: nullableStr(r.INTEREST_RATE_EXPLAIN),
      source: 'eastmoney',
    })
  );
  return res.data;
}

/**
 * 创建公司治理与可转债适配器。
 */
export function createNodeCorporateAdapters(
  client: NodeHttpClient
): SourceAdapter<unknown, unknown>[] {
  const topHolders: SourceAdapter<SymbolCorporateInput, TopShareholder[]> = {
    id: 'eastmoney:corporate.topHolders',
    capability: 'corporate.topHolders',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['rank', 'holderName', 'holdShares', 'freeHoldRatio']),
    supports: () => true,
    fetch: (input) => fetchEmTopHolders(client, input.symbol, input.options),
  };

  const holderCount: SourceAdapter<SymbolCorporateInput, ShareholderCount[]> = {
    id: 'eastmoney:corporate.holderCount',
    capability: 'corporate.holderCount',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['holderCount', 'change', 'changePercent']),
    supports: () => true,
    fetch: (input) => fetchEmHolderCount(client, input.symbol, input.options),
  };

  const convertibleList: SourceAdapter<CorporateQueryOptions, ConvertibleBondItem[]> = {
    id: 'eastmoney:bond.convertibleList',
    capability: 'bond.convertibleList',
    provider: 'eastmoney',
    priority: 10,
    providedFields: new Set(['bondCode', 'bondName', 'stockCode', 'rating', 'issueScale']),
    supports: () => true,
    fetch: (opts) => fetchEmConvertibleBonds(client, opts),
  };

  return [
    topHolders,
    holderCount,
    convertibleList,
  ] as SourceAdapter<unknown, unknown>[];
}
