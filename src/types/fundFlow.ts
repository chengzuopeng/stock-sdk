/**
 * 资金流向相关数据类型
 */

/**
 * 个股资金流（日/周/月线）
 */
export interface StockFundFlowDaily {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 收盘价 */
  close: number | null;
  /** 涨跌幅(%) */
  changePercent: number | null;
  /** 主力净流入-净额(元) */
  mainNetInflow: number | null;
  /** 主力净流入-净占比(%) */
  mainNetInflowPercent: number | null;
  /** 超大单净流入-净额(元) */
  superLargeNetInflow: number | null;
  /** 超大单净流入-净占比(%) */
  superLargeNetInflowPercent: number | null;
  /** 大单净流入-净额(元) */
  largeNetInflow: number | null;
  /** 大单净流入-净占比(%) */
  largeNetInflowPercent: number | null;
  /** 中单净流入-净额(元) */
  mediumNetInflow: number | null;
  /** 中单净流入-净占比(%) */
  mediumNetInflowPercent: number | null;
  /** 小单净流入-净额(元) */
  smallNetInflow: number | null;
  /** 小单净流入-净占比(%) */
  smallNetInflowPercent: number | null;
}

/**
 * 个股资金流排名项（多维度统一结构，按排序周期返回相应周期数据）
 */
export interface FundFlowRankItem {
  /** 股票代码 */
  code: string;
  /** 股票名称 */
  name: string;
  /** 最新价 */
  price: number | null;
  /** 涨跌幅(%)（对应排序周期，例如 5 日则为 5 日涨跌幅） */
  changePercent: number | null;
  /** 主力净流入-净额(元) */
  mainNetInflow: number | null;
  /** 主力净流入-净占比(%) */
  mainNetInflowPercent: number | null;
  /** 超大单净流入-净额(元) */
  superLargeNetInflow: number | null;
  /** 超大单净流入-净占比(%) */
  superLargeNetInflowPercent: number | null;
  /** 大单净流入-净额(元) */
  largeNetInflow: number | null;
  /** 大单净流入-净占比(%) */
  largeNetInflowPercent: number | null;
  /** 中单净流入-净额(元) */
  mediumNetInflow: number | null;
  /** 中单净流入-净占比(%) */
  mediumNetInflowPercent: number | null;
  /** 小单净流入-净额(元) */
  smallNetInflow: number | null;
  /** 小单净流入-净占比(%) */
  smallNetInflowPercent: number | null;
}

/**
 * 板块资金流排名项
 */
export interface SectorFundFlowItem {
  /** 板块代码（东方财富 BK 编号） */
  code: string;
  /** 板块名称 */
  name: string;
  /** 涨跌幅(%) */
  changePercent: number | null;
  /** 主力净流入-净额(元) */
  mainNetInflow: number | null;
  /** 主力净流入-净占比(%) */
  mainNetInflowPercent: number | null;
  /** 超大单净流入-净额(元) */
  superLargeNetInflow: number | null;
  /** 大单净流入-净额(元) */
  largeNetInflow: number | null;
  /** 中单净流入-净额(元) */
  mediumNetInflow: number | null;
  /** 小单净流入-净额(元) */
  smallNetInflow: number | null;
  /** 主力净流入最大股名称 */
  topStockName?: string;
  /** 主力净流入最大股代码 */
  topStockCode?: string;
}

/**
 * 大盘资金流（按日）
 */
export interface MarketFundFlow {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 上证指数收盘价 */
  shClose: number | null;
  /** 上证指数涨跌幅(%) */
  shChangePercent: number | null;
  /** 深证指数收盘价 */
  szClose: number | null;
  /** 深证指数涨跌幅(%) */
  szChangePercent: number | null;
  /** 主力净流入-净额(元) */
  mainNetInflow: number | null;
  /** 主力净流入-净占比(%) */
  mainNetInflowPercent: number | null;
  /** 超大单净流入-净额(元) */
  superLargeNetInflow: number | null;
  /** 超大单净流入-净占比(%) */
  superLargeNetInflowPercent: number | null;
  /** 大单净流入-净额(元) */
  largeNetInflow: number | null;
  /** 大单净流入-净占比(%) */
  largeNetInflowPercent: number | null;
  /** 中单净流入-净额(元) */
  mediumNetInflow: number | null;
  /** 中单净流入-净占比(%) */
  mediumNetInflowPercent: number | null;
  /** 小单净流入-净额(元) */
  smallNetInflow: number | null;
  /** 小单净流入-净占比(%) */
  smallNetInflowPercent: number | null;
}
