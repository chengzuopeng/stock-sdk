/**
 * 特殊指数注册表:东财 secid 前缀不走交易所推断的指数族。
 * 单一事实来源(normalize 分类 / adapters 拼接 / secid 回读共用),新增只改本文件。
 * 准入约束:分类语法确定。零碰撞拼写(HSHCI / GDAXI / 中证)裸码即解析;与其它
 * 命名空间字面冲突的碰撞码(HSI / HSCEI / HSTECH 落在美股 ticker 命名空间)标
 * `collision: true`,仅在 market hint 匹配其市场时解析,裸码无 hint 维持原命名空间。
 * 码形合法但不存在的码(如 H30553)由上游返回空数据,不做本地枚举校验。
 */
import type { Exchange, Market } from './types';

export interface SpecialIndexInfo {
  market: Market;
  exchange: Exchange;
  /** 东财 secid 数字市场前缀;缺省表示东财无该指数行情(仅腾讯可用,如 HSTECH) */
  secidPrefix?: string;
  /** 规范化(大写)后的指数代码,调用方应以此为准而非原始输入 */
  code: string;
  /** 腾讯行情码(如 'hkHSI');缺省表示腾讯无该指数行情(仅东财可用,如 HSHCI) */
  tencent?: string;
  /**
   * 碰撞码:字面与其它命名空间(如美股 ticker)冲突,仅在 market hint 匹配其
   * 市场时才按本指数解析;裸码无 hint 维持原命名空间(不劫持真实 ticker)。
   */
  collision?: boolean;
}

/** 中证指数家族(开放集):93xxxx 与 H+5 位,均未被 A 股/美股/期货命名空间占用 */
const CSI_INFO: Omit<SpecialIndexInfo, 'code'> = {
  market: 'CN',
  exchange: 'CSI',
  secidPrefix: '2',
};
const CSI_PATTERNS = [/^93\d{4}$/, /^H\d{5}$/];

const NAMED_INDICES: Record<string, Omit<SpecialIndexInfo, 'code'>> = {
  /** 恒生医疗保健指数(Hang Seng Healthcare Index;仅东财,腾讯无 hkHSHCI) */
  HSHCI: { market: 'HK', exchange: 'HSI', secidPrefix: '124' },
  /** 恒生指数(Hang Seng Index) */
  HSI: { market: 'HK', exchange: 'HSI', secidPrefix: '100', tencent: 'hkHSI', collision: true },
  /** 恒生中国企业指数(国企指数 / H 股指数) */
  HSCEI: { market: 'HK', exchange: 'HSI', secidPrefix: '100', tencent: 'hkHSCEI', collision: true },
  /** 恒生科技指数(Hang Seng TECH;东财 secid 暂未确认,当前仅腾讯行情可用) */
  HSTECH: { market: 'HK', exchange: 'HSI', tencent: 'hkHSTECH', collision: true },
  /** 德国 DAX 指数 */
  GDAXI: { market: 'GLOBAL', exchange: 'DAX', secidPrefix: '100' },
};

/** 特殊指数 exchange → market 对(normalize 的 EXCHANGE_MARKET 由此 spread,单源) */
export const SPECIAL_INDEX_EXCHANGE_MARKET: ReadonlyArray<readonly [Exchange, Market]> = [
  [CSI_INFO.exchange, CSI_INFO.market],
  ...Object.values(NAMED_INDICES).map((i) => [i.exchange, i.market] as const),
];

/**
 * 按代码(大小写不敏感)查特殊指数;未命中返回 undefined。
 * 内部统一大写后匹配,返回值携带规范化 code。
 */
export function lookupSpecialIndex(code: string): SpecialIndexInfo | undefined {
  const upper = code.toUpperCase();
  if (CSI_PATTERNS.some((re) => re.test(upper))) {
    return { ...CSI_INFO, code: upper };
  }
  // 键全大写,不会命中 Object.prototype 继承属性(constructor 等均非全大写)
  const named = NAMED_INDICES[upper];
  return named ? { ...named, code: upper } : undefined;
}
