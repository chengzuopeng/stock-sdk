export type FXMacroDataParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export type FXMacroDataFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

export interface FXMacroDataClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: FXMacroDataFetch;
  defaultParams?: FXMacroDataParams;
}

export class FXMacroDataClient {
  static readonly defaultBaseUrl = 'https://fxmacrodata.com/api/v1/';

  private readonly apiKey?: string;
  private readonly baseUrl: URL;
  private readonly fetchImpl: FXMacroDataFetch;
  private readonly defaultParams: FXMacroDataParams;

  constructor(options: FXMacroDataClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = new URL(options.baseUrl ?? FXMacroDataClient.defaultBaseUrl);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.defaultParams = options.defaultParams ?? {};
  }

  buildUrl(path: string, params: FXMacroDataParams = {}): URL {
    const url = new URL(path.replace(/^\/+/, ''), this.baseUrl);
    const merged = { ...this.defaultParams, ...params };

    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    if (this.apiKey) {
      url.searchParams.set('api_key', this.apiKey);
    }
    return url;
  }

  async request<T = unknown>(
    path: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchImpl(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`FXMacroData HTTP ${response.status}: ${body}`);
    }
    return (await response.json()) as T;
  }

  dataCatalogue<T = unknown>(currency: string): Promise<T> {
    return this.request<T>(`data_catalogue/${normaliseCurrency(currency)}`);
  }

  announcements<T = unknown>(
    currency: string,
    indicator: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(
      `announcements/${normaliseCurrency(currency)}/${indicator}`,
      params
    );
  }

  latestAnnouncements<T = unknown>(
    currency: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(
      `announcements/${normaliseCurrency(currency)}/latest`,
      params
    );
  }

  calendar<T = unknown>(
    currency: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(`calendar/${normaliseCurrency(currency)}`, params);
  }

  predictions<T = unknown>(
    currency: string,
    indicator: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(
      `predictions/${normaliseCurrency(currency)}/${indicator}`,
      params
    );
  }

  forex<T = unknown>(
    base: string,
    quote = 'usd',
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(
      `forex/${normaliseCurrency(base)}/${normaliseCurrency(quote)}`,
      params
    );
  }

  cot<T = unknown>(
    currency: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(`cot/${normaliseCurrency(currency)}`, params);
  }

  commodity<T = unknown>(
    indicator: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(`commodities/${indicator}`, params);
  }

  commoditiesLatest<T = unknown>(
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>('commodities/latest', params);
  }

  curves<T = unknown>(
    currency: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(`curves/${normaliseCurrency(currency)}`, params);
  }

  curveProxies<T = unknown>(
    currency: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(
      `curve_proxies/${normaliseCurrency(currency)}`,
      params
    );
  }

  forwardCurves<T = unknown>(
    currency: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(
      `forward_curves/${normaliseCurrency(currency)}`,
      params
    );
  }

  rateDifferentials<T = unknown>(
    base: string,
    quote = 'usd',
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(
      `rate_differentials/${normaliseCurrency(base)}/${normaliseCurrency(quote)}`,
      params
    );
  }

  forwardDifferentials<T = unknown>(
    base: string,
    quote = 'usd',
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(
      `forward_differentials/${normaliseCurrency(base)}/${normaliseCurrency(quote)}`,
      params
    );
  }

  marketSessions<T = unknown>(params: FXMacroDataParams = {}): Promise<T> {
    return this.request<T>('market_sessions', params);
  }

  riskSentiment<T = unknown>(params: FXMacroDataParams = {}): Promise<T> {
    return this.request<T>('risk_sentiment', params);
  }

  news<T = unknown>(
    currency: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(`news/${normaliseCurrency(currency)}`, params);
  }

  pressReleases<T = unknown>(
    currency: string,
    params: FXMacroDataParams = {}
  ): Promise<T> {
    return this.request<T>(
      `press-releases/${normaliseCurrency(currency)}`,
      params
    );
  }
}

export function createFXMacroDataClient(
  options: FXMacroDataClientOptions = {}
): FXMacroDataClient {
  return new FXMacroDataClient(options);
}

function normaliseCurrency(currency: string): string {
  return currency.trim().toLowerCase();
}
