import type {
  FullQuote as BaseFullQuote,
  SimpleQuote as BaseSimpleQuote,
  HKQuote as BaseHKQuote,
  USQuote as BaseUSQuote,
  Quote as BaseQuote,
  QuoteSource,
} from '@stock-sdk/core/types';

// Node 路由允许用户注册任意来源标识，保留统一行情结构。
export type FullQuote = BaseFullQuote<QuoteSource>;
export type SimpleQuote = BaseSimpleQuote<QuoteSource>;
export type HKQuote = BaseHKQuote<QuoteSource>;
export type USQuote = BaseUSQuote<QuoteSource>;
export type Quote = BaseQuote<QuoteSource>;
