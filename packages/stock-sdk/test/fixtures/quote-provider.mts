import { StockSDK, type FullQuote, type ProviderName } from 'stock-sdk';

export function providerOf(quote: FullQuote): ProviderName {
  return quote.source;
}

export async function providerFromSdk(sdk: StockSDK): Promise<ProviderName> {
  const [quote] = await sdk.quotes.cn(['600519']);
  return providerOf(quote);
}
