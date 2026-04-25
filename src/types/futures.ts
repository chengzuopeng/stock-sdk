/**
 * 国内期货交易所
 */
export type FuturesExchange = 'SHFE' | 'DCE' | 'CZCE' | 'INE' | 'CFFEX' | 'GFEX';

/**
 * 期货 K 线
 */
export interface FuturesKline {
  date: string;
  code: string;
  name: string;
  open: number | null;
  close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  amount: number | null;
  amplitude: number | null;
  changePercent: number | null;
  change: number | null;
  turnoverRate: number | null;
  openInterest: number | null;
}

/**
 * 全球期货实时报价
 */
export interface GlobalFuturesQuote {
  code: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  prevSettle: number | null;
  volume: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
  openInterest: number | null;
}

/**
 * 期货库存品种
 */
export interface FuturesInventorySymbol {
  code: string;
  name: string;
  marketCode: string;
}

/**
 * 期货库存数据
 */
export interface FuturesInventory {
  code: string;
  date: string;
  inventory: number | null;
  change: number | null;
}

/**
 * COMEX 库存数据
 */
export interface ComexInventory {
  date: string;
  name: string;
  storageTon: number | null;
  storageOunce: number | null;
  /**
   * @deprecated 请改用 `storageTon`
   */
  inventory: number | null;
  /**
   * @deprecated COMEX 接口当前未提供稳定的变动字段，始终返回 `null`
   */
  change: number | null;
  /**
   * @deprecated 请改用 `name`
   */
  market: 'gold' | 'silver';
}
