/**
 * Node.js 专属方法 Spec（供 stock-node-sdk CLI / MCP / 文档统一派生）。
 *
 * 与 `methods.ts` 中的 `METHOD_SPECS`（双端 universal 方法）严格分离：
 * - `stock-sdk` 及浏览器 Playground 仅消费 `METHOD_SPECS`；
 * - `stock-node-sdk` CLI / MCP / 文档同时消费 `METHOD_SPECS` + `NODE_METHOD_SPECS`。
 */
import { METHOD_SPECS, type MethodSpec, type ParamSpec } from './methods';

const NODE_PAGE: ParamSpec = {
  flag: 'page',
  type: 'number',
  default: 1,
  desc: '页码（默认 1）',
};

const NODE_PAGE_SIZE: ParamSpec = {
  flag: 'pageSize',
  type: 'number',
  default: 20,
  desc: '每页条数（默认 20）',
};

export const NODE_METHOD_SPECS: MethodSpec[] = [
  // ---------- financial（财务与基本面，自动识别 A/HK/US 三市场） ----------
  {
    path: ['financial', 'indicators'],
    toolName: 'get_financial_indicators',
    tier: 'core',
    runtime: 'node',
    summary: 'A/HK/US 个股核心财务指标（EPS/ROE/营收/净利/毛利率）',
    mcpDesc: '获取 A 股 / 港股 / 美股个股多报告期核心财务指标（EPS、每股净资产、ROE、营收及归母净利同比、销售毛利率等）。',
    argShape: 'symbol+options',
    positional: [{ name: 'symbol', required: true, desc: '股票代码，如 600519 / 00700 / AAPL' }],
    params: [NODE_PAGE, NODE_PAGE_SIZE],
  },
  {
    path: ['financial', 'income'],
    toolName: 'get_income_statement',
    tier: 'full',
    runtime: 'node',
    summary: 'A/HK/US 个股利润表（多报告期）',
    mcpDesc: '获取 A 股 / 港股 / 美股个股利润表（营收、营业成本、三费、营业利润、净利润；美股支持东财与 Nasdaq 双源容错）。',
    argShape: 'symbol+options',
    positional: [{ name: 'symbol', required: true, desc: '股票代码，如 600519 / 00700 / AAPL' }],
    params: [NODE_PAGE, NODE_PAGE_SIZE],
  },
  {
    path: ['financial', 'balance'],
    toolName: 'get_balance_sheet',
    tier: 'full',
    runtime: 'node',
    summary: 'A/HK/US 个股资产负债表（多报告期）',
    mcpDesc: '获取 A 股 / 港股 / 美股个股资产负债表（总资产、货币资金、应收账款、存货、总负债、股东权益、资产负债率等；美股支持东财与 Nasdaq 双源容错）。',
    argShape: 'symbol+options',
    positional: [{ name: 'symbol', required: true, desc: '股票代码，如 600519 / 00700 / AAPL' }],
    params: [NODE_PAGE, NODE_PAGE_SIZE],
  },
  {
    path: ['financial', 'cashflow'],
    toolName: 'get_cashflow_statement',
    tier: 'full',
    runtime: 'node',
    summary: 'A/HK/US 个股现金流量表（多报告期）',
    mcpDesc: '获取 A 股 / 港股 / 美股个股现金流量表（经营、投资、筹资现金流净额及现金净增加额；美股支持东财与 Nasdaq 双源容错）。',
    argShape: 'symbol+options',
    positional: [{ name: 'symbol', required: true, desc: '股票代码，如 600519 / 00700 / AAPL' }],
    params: [NODE_PAGE, NODE_PAGE_SIZE],
  },
  {
    path: ['financial', 'forecast'],
    toolName: 'get_performance_forecast',
    tier: 'core',
    runtime: 'node',
    summary: '业绩预告列表（可按代码或报告期筛选）',
    mcpDesc: '获取 A 股业绩预告列表，支持按股票代码或报告期过滤。',
    argShape: 'options',
    params: [
      { flag: 'symbol', type: 'string', desc: '可选按股票代码过滤，如 600519' },
      { flag: 'reportDate', type: 'string', desc: '可选报告期 YYYY-MM-DD，如 2026-12-31' },
      NODE_PAGE,
      NODE_PAGE_SIZE,
    ],
  },
  {
    path: ['financial', 'express'],
    toolName: 'get_performance_express',
    tier: 'full',
    runtime: 'node',
    summary: '业绩快报列表（可按代码或报告期筛选）',
    mcpDesc: '获取 A 股业绩快报列表，支持按股票代码或报告期过滤。',
    argShape: 'options',
    params: [
      { flag: 'symbol', type: 'string', desc: '可选按股票代码过滤，如 688235' },
      { flag: 'reportDate', type: 'string', desc: '可选报告期 YYYY-MM-DD，如 2026-09-30' },
      NODE_PAGE,
      NODE_PAGE_SIZE,
    ],
  },

  // ---------- news（7×24 快讯与上市公司公告，双源容错） ----------
  {
    path: ['news', 'flash'],
    toolName: 'get_market_news_flash',
    tier: 'core',
    runtime: 'node',
    summary: '7×24 实时财经快讯（东财 + 新浪双源容错）',
    mcpDesc: '获取 7×24 小时实时财经快讯流，默认自动在东方财富与新浪财经快讯间容错切换。',
    argShape: 'options',
    params: [NODE_PAGE, NODE_PAGE_SIZE],
  },
  {
    path: ['news', 'announcements'],
    toolName: 'get_stock_announcements',
    tier: 'core',
    runtime: 'node',
    summary: 'A/HK/US 上市公司公告（东财/巨潮 + 港交所披露易 + SEC EDGAR）',
    mcpDesc: '获取上市公司最新公告与官方原文链接，按代码市场自动路由：A 股东财/巨潮双源、港股港交所披露易（HKEXnews）、美股 SEC EDGAR。',
    argShape: 'options',
    params: [
      { flag: 'symbol', type: 'string', desc: '可选按股票代码筛选，如 600519 / 00700 / AAPL' },
      { flag: 'keyword', type: 'string', desc: '可选公告标题或表格类型关键词筛选（如 分红 / 10-K）' },
      NODE_PAGE,
      NODE_PAGE_SIZE,
    ],
  },

  // ---------- corporate（公司治理与股东数据） ----------
  {
    path: ['corporate', 'topHolders'],
    toolName: 'get_top_shareholders',
    tier: 'core',
    runtime: 'node',
    summary: '个股十大流通股东',
    mcpDesc: '获取 A 股个股各报告期十大流通股东持股与变动明细。',
    argShape: 'symbol+options',
    positional: [{ name: 'symbol', required: true, desc: '股票代码，如 600519' }],
    params: [NODE_PAGE, NODE_PAGE_SIZE],
  },
  {
    path: ['corporate', 'holderCount'],
    toolName: 'get_shareholder_count',
    tier: 'full',
    runtime: 'node',
    summary: '个股股东户数与筹码集中度变化',
    mcpDesc: '获取 A 股个股历期股东户数、较上期变动比例及户均持股。',
    argShape: 'symbol+options',
    positional: [{ name: 'symbol', required: true, desc: '股票代码，如 600519' }],
    params: [NODE_PAGE, NODE_PAGE_SIZE],
  },

  // ---------- bond（可转债） ----------
  {
    path: ['bond', 'convertibleList'],
    toolName: 'get_convertible_bond_list',
    tier: 'full',
    runtime: 'node',
    summary: '可转债发行与条款列表',
    mcpDesc: '获取 A 股可转债列表，含正股代码、信用评级、发行规模、转股价与到期日等基础条款。',
    argShape: 'options',
    params: [NODE_PAGE, NODE_PAGE_SIZE],
  },
];

/** `stock-node-sdk` 的全量方法 Spec（universal + node）。 */
export const ALL_NODE_METHOD_SPECS: MethodSpec[] = [
  ...METHOD_SPECS,
  ...NODE_METHOD_SPECS,
];
