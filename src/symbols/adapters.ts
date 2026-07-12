/**
 * Provider 符号适配器：NormalizedSymbol → 各数据源原生格式（纯函数）
 *
 * 仅覆盖股票/指数/基金/板块这类有明确 secid 体系的资产；期货/期权的 secid
 * 体系不同（且由各自 provider 内联处理），这里对它们显式抛错而非静默兜底，
 * 避免把海外期货误拼成美股 secid（105.xxx）这类隐蔽错误。
 */
import type { NormalizedSymbol } from './types';
import { InvalidArgumentError } from '../core/errors';
import { lookupSpecialIndex } from './specialIndex';
import { normalizeSymbol } from './normalize';

/**
 * 交易所 → 东财 secid 数字市场前缀（仅股票类）。
 * F41: 导出供 providers 复用（tencent/batch 的美股代码列表按前缀过滤），
 * 不再在各处重复声明 NASDAQ/NYSE/AMEX → 105/106/107 映射。
 */
export const EXCHANGE_TO_SECID_PREFIX: Record<string, string> = {
  SSE: '1',
  SZSE: '0',
  BSE: '0',
  HKEX: '116',
  NASDAQ: '105',
  NYSE: '106',
  AMEX: '107',
  US: '105',
};

/** 交易所 → 腾讯前缀（A 股） */
const EXCHANGE_TO_TENCENT_PREFIX: Record<string, string> = {
  SSE: 'sh',
  SZSE: 'sz',
  BSE: 'bj',
};

/**
 * → 腾讯行情格式：sh600519 / sz000001 / bj920819 / hk00700 / usAAPL
 */
export function toTencentSymbol(ns: NormalizedSymbol): string {
  if (
    ns.assetType === 'board' ||
    ns.assetType === 'futures' ||
    ns.assetType === 'option'
  ) {
    throw new InvalidArgumentError(
      `Tencent quote symbol does not support assetType '${ns.assetType}'`,
      { assetType: ns.assetType, code: ns.code }
    );
  }
  // 特殊指数:注册表带腾讯码的(HSI→hkHSI / HSCEI→hkHSCEI 等)直接返回,不走
  // 下方市场分支的纯数字/前缀拼接(否则 HK 分支会因字母指数码非纯数字而抛错)。
  if (ns.assetType === 'index') {
    const idx = lookupSpecialIndex(ns.code);
    if (idx?.tencent) {
      return idx.tencent;
    }
  }
  switch (ns.market) {
    case 'CN': {
      const prefix = EXCHANGE_TO_TENCENT_PREFIX[ns.exchange];
      if (!prefix) {
        throw new InvalidArgumentError(
          `Cannot map to Tencent symbol: unsupported CN exchange '${ns.exchange}'`,
          { exchange: ns.exchange, code: ns.code }
        );
      }
      return `${prefix}${ns.code}`;
    }
    case 'HK':
      // 腾讯港股码恒为数字;HSHCI 等字母指数码无对应标的 → fail-fast
      if (!/^\d+$/.test(ns.code)) {
        throw new InvalidArgumentError(
          `Cannot map to Tencent symbol: HK code '${ns.code}' is not numeric`,
          { market: ns.market, code: ns.code }
        );
      }
      return `hk${ns.code.padStart(5, '0')}`;
    case 'US':
      return `us${ns.code}`;
    default:
      throw new InvalidArgumentError(
        `Cannot map to Tencent symbol: unsupported market '${ns.market}'`,
        { market: ns.market, code: ns.code }
      );
  }
}

/**
 * → 东财 secid：1.600519 / 0.000001 / 116.00700 / 105.AAPL / 90.BK0475（板块）
 */
export function toEastmoneySecid(ns: NormalizedSymbol): string {
  if (ns.assetType === 'board') {
    return `90.${ns.code}`;
  }
  if (ns.assetType === 'futures' || ns.assetType === 'option') {
    throw new InvalidArgumentError(
      `Eastmoney secid for assetType '${ns.assetType}' uses a separate scheme; ` +
        `use the dedicated futures/options provider instead of toEastmoneySecid`,
      { assetType: ns.assetType, exchange: ns.exchange, code: ns.code }
    );
  }
  // 特殊指数分类驱动:assetType==='index' 且 exchange 与注册表一致才路由
  // (显式 secid 前缀断言如 '1.930955' 不被覆盖);须先于 HK 早返回(HSHCI → '124.')。
  // 未命中注册表的普通指数走交易所前缀 fall-through(沪市 000xxx 已知错宿主,待修)。
  if (ns.assetType === 'index') {
    const specialIdx = lookupSpecialIndex(ns.code);
    if (specialIdx?.secidPrefix && specialIdx.exchange === ns.exchange) {
      return `${specialIdx.secidPrefix}.${specialIdx.code}`;
    }
  }
  if (ns.market === 'HK') {
    return `116.${ns.code.padStart(5, '0')}`;
  }
  const prefix = EXCHANGE_TO_SECID_PREFIX[ns.exchange];
  if (!prefix) {
    throw new InvalidArgumentError(
      `Cannot map to Eastmoney secid: unsupported exchange '${ns.exchange}' (market=${ns.market})`,
      { exchange: ns.exchange, market: ns.market, code: ns.code }
    );
  }
  return `${prefix}.${ns.code}`;
}

/** → 纯代码（去前缀） */
export function toPlainCode(ns: NormalizedSymbol): string {
  return ns.code;
}

/** {@link tryToTencentSymbols} 的归一结果。 */
export interface TencentSymbolBatch {
  /** 成功映射的腾讯行情键（按输入顺序，跳过失败项） */
  keys: string[];
  /** 无法映射的输入（非法格式 / 腾讯无该市场映射，如 CSI 特殊指数码 930955） */
  invalid: Array<{ code: string; reason: string }>;
}

/**
 * 行情入口批量容错归一（R7-2/R7-3）：
 * - market:'CN'：`'600036'`→`'sh600036'`、`'SH600519'`→`'sh600519'`
 * - market:'HK'：`'00700'`/`'hk00700'`/`'700'`→`'hk00700'`
 * - market:'US'：`'BABA'`/`'usAAPL'`→`'usBABA'`/`'usAAPL'`
 *
 * 【设计决策：逐码容错，不整批抛错】单个代码失败只跳过该码——与行情
 * 解析侧"无匹配行静默丢弃"的既有语义对齐。理由：
 * - batch.* 全市场扫描把上游代码表整表灌进来（~5600 码/次），一条脏数据
 *   不应废掉整批已完成的网络请求；
 * - SDK 自身支持的特殊指数码（930955/HSHCI 等）在 symbols 层合法但腾讯
 *   无行情映射（toTencentSymbol 对 CSI 抛错）——这类输入应"跳过"而非
 *   炸掉整个调用。
 *
 * 注意示例按 market 而异：`'00700'` 仅在 market:'HK' 下映射为 `hk00700`，
 * 在 market:'CN' 下按 A 股推断为 `sz00700`（无此标的，行情侧自然无匹配）。
 */
export function tryToTencentSymbols(
  codes: string[],
  market: 'CN' | 'HK' | 'US'
): TencentSymbolBatch {
  const keys: string[] = [];
  const invalid: TencentSymbolBatch['invalid'] = [];
  // 去重：别名输入（'600036' + 'sh600036'、'700' + '00700'）归一到同一 key，
  // 不去重会让请求串重复、上游按 key 回一行、结果里出现重复行
  const seen = new Set<string>();
  for (const code of codes) {
    try {
      const key = toTencentSymbol(normalizeSymbol(code, { market }));
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    } catch (e) {
      invalid.push({ code, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { keys, invalid };
}
