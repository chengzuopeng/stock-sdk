import type { SourceAdapter, SourceRouter } from '@stock-sdk/core/router';
import type { NodeHttpClient } from '../transport/nodeHttpClient';
import { createNodeQuoteAdapters } from './quotes';
import { createNodeKlineAdapters } from './kline';
import { createNodeBatchAndReferenceAdapters } from './batch';
import { createNodeNewsAdapters } from './news';
import { createNodeFinancialAdapters } from './financial';
import { createNodeCorporateAdapters } from './corporate';
import { createOverseasAdapters, OVERSEAS_PROVIDERS, type OverseasProviderId } from './overseas';

export { createNodeQuoteAdapters, type QuoteBatchInput } from './quotes';
export {
  createNodeKlineAdapters,
  type HKHistoryKlineInput,
  type USHistoryKlineInput,
} from './kline';
export {
  createNodeBatchAndReferenceAdapters,
  parseSinaDividendHtml,
} from './batch';
export { createNodeNewsAdapters } from './news';
export { createNodeFinancialAdapters, type SymbolFinancialInput } from './financial';
export { createNodeCorporateAdapters, type SymbolCorporateInput } from './corporate';
export {
  createOverseasAdapters,
  OVERSEAS_PROVIDERS,
  type OverseasProviderId,
};

/**
 * 向 `SourceRouter` 注册 `stock-node-sdk` 全部内置默认数据源适配器（含海外源适配器）。
 */
export function registerDefaultNodeAdapters(
  router: SourceRouter,
  client: NodeHttpClient
): SourceAdapter<unknown, unknown>[] {
  const all: SourceAdapter<unknown, unknown>[] = [
    ...createNodeQuoteAdapters(client),
    ...createNodeKlineAdapters(client),
    ...createNodeBatchAndReferenceAdapters(client),
    ...createNodeNewsAdapters(client),
    ...createNodeFinancialAdapters(client),
    ...createNodeCorporateAdapters(client),
    ...createOverseasAdapters(client),
  ];
  router.registerAll(all);
  return all;
}
