import { describe, expect, it } from 'vitest';
import { FXMacroDataClient } from '../../../src/providers/fxmacrodata';

describe('FXMacroDataClient', () => {
  it('builds authenticated API URLs', () => {
    const client = new FXMacroDataClient({
      apiKey: 'test-key',
      baseUrl: 'https://example.com/api/v1/',
    });

    expect(client.buildUrl('/forex/EUR/USD', { limit: 1 }).toString()).toBe(
      'https://example.com/api/v1/forex/EUR/USD?limit=1&api_key=test-key'
    );
  });

  it('uses injected fetch implementations', async () => {
    const requested: string[] = [];
    const client = new FXMacroDataClient({
      baseUrl: 'https://example.com/api/v1/',
      fetchImpl: async (input) => {
        requested.push(String(input));
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      },
    });

    await expect(client.calendar('usd', { limit: 3 })).resolves.toEqual({
      data: [],
    });
    expect(requested[0]).toBe(
      'https://example.com/api/v1/calendar/usd?limit=3'
    );
  });
});
