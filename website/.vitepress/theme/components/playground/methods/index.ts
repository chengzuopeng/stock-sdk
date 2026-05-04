/**
 * 聚合所有 method spec，输出按 name 索引的 Record。
 * 添加新方法只需创建/修改某个分类文件并在此处导入。
 */
import type { MethodSpec } from '../types';
import { quotesMethods } from './quotes';
import { klineMethods } from './kline';
import { boardMethods } from './board';
import { indicatorsMethods } from './indicators';
import { searchMethods } from './search';
import { batchMethods } from './batch';
import { futuresMethods } from './futures';
import { optionsMethods } from './options';
import { extendedMethods } from './extended';
import { fundFlowMethods } from './fundFlow';
import { northboundMethods } from './northbound';
import { marketEventMethods } from './marketEvent';
import { dragonTigerMethods } from './dragonTiger';
import { blockTradeMarginMethods } from './blockTradeMargin';

export const allMethods: MethodSpec[] = [
  ...quotesMethods,
  ...klineMethods,
  ...boardMethods,
  ...indicatorsMethods,
  ...searchMethods,
  ...batchMethods,
  ...futuresMethods,
  ...optionsMethods,
  ...extendedMethods,
  ...fundFlowMethods,
  ...northboundMethods,
  ...marketEventMethods,
  ...dragonTigerMethods,
  ...blockTradeMarginMethods,
];

/** 按 method.name 索引的 Map，用于 O(1) 查找。 */
export const methodsByName: Record<string, MethodSpec> = Object.fromEntries(
  allMethods.map((m) => [m.name, m])
);

// 开发期检查：方法名重复会被静默覆盖，给个明显警告
if (Object.keys(methodsByName).length !== allMethods.length) {
  // eslint-disable-next-line no-console
  console.warn(
    '[playground] Duplicate MethodSpec.name detected — some methods are being overwritten in methodsByName.'
  );
}
