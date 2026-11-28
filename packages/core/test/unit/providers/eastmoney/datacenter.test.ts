import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { RequestClient } from '../../../../src/core';
import {
  fetchDatacenter,
  fetchDatacenterList,
} from '../../../../src/providers/eastmoney/datacenter';

const DATACENTER_URL = 'https://datacenter-web.eastmoney.com/api/data/v1/get';

describe('datacenter - fetchDatacenter', () => {
  it('returns empty result when API returns null', async () => {
    server.use(
      http.get(DATACENTER_URL, () => HttpResponse.json({ result: null }))
    );

    const client = new RequestClient();
    const result = await fetchDatacenter(
      client,
      { reportName: 'TEST_REPORT' },
      (item) => item
    );

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.pages).toBe(1);
  });

  it('merges multi-page data correctly', async () => {
    let callCount = 0;
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        callCount++;
        const url = new URL(request.url);
        const page = url.searchParams.get('pageNumber');
        if (page === '1') {
          return HttpResponse.json({
            result: {
              pages: 2,
              count: 3,
              data: [{ name: 'a' }, { name: 'b' }],
            },
          });
        }
        return HttpResponse.json({
          result: {
            pages: 2,
            count: 3,
            data: [{ name: 'c' }],
          },
        });
      })
    );

    const client = new RequestClient();
    const result = await fetchDatacenter(
      client,
      { reportName: 'PAGED_REPORT', pageSize: 2 },
      (item) => String(item.name)
    );

    expect(callCount).toBe(2);
    expect(result.data).toEqual(['a', 'b', 'c']);
    expect(result.total).toBe(3);
    expect(result.pages).toBe(2);
  });

  it('respects fetchAllPages=false (single-page only)', async () => {
    let callCount = 0;
    server.use(
      http.get(DATACENTER_URL, () => {
        callCount++;
        return HttpResponse.json({
          result: {
            pages: 5,
            count: 10,
            data: [{ id: 1 }, { id: 2 }],
          },
        });
      })
    );

    const client = new RequestClient();
    const result = await fetchDatacenter(
      client,
      { reportName: 'SINGLE', fetchAllPages: false },
      (item) => item
    );

    expect(callCount).toBe(1);
    expect(result.data).toHaveLength(2);
  });

  it('caps pagination at maxPages safety limit and warns on truncation', async () => {
    let callCount = 0;
    server.use(
      http.get(DATACENTER_URL, () => {
        callCount++;
        return HttpResponse.json({
          result: {
            pages: 100,
            count: 1000,
            data: [{ id: callCount }],
          },
        });
      })
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const client = new RequestClient();
    const result = await fetchDatacenter(
      client,
      { reportName: 'MANY', maxPages: 3 },
      (item) => item
    );

    expect(callCount).toBe(3);
    expect(result.data).toHaveLength(3);
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toMatch(/truncated at maxPages=3/);
    warnSpy.mockRestore();
  });

  it('passes filter and sort params through URLSearchParams', async () => {
    const captured: Record<string, string> = {};
    server.use(
      http.get(DATACENTER_URL, ({ request }) => {
        const url = new URL(request.url);
        url.searchParams.forEach((v, k) => (captured[k] = v));
        return HttpResponse.json({
          result: { data: [], pages: 1, count: 0 },
        });
      })
    );

    const client = new RequestClient();
    await fetchDatacenter(
      client,
      {
        reportName: 'FILTERED',
        filter: `(SECURITY_CODE="600519")`,
        sortColumns: 'TRADE_DATE',
        sortTypes: '-1',
        quoteColumns: 'f3',
        quoteType: '0',
      },
      (item) => item
    );

    expect(captured.reportName).toBe('FILTERED');
    expect(captured.filter).toBe('(SECURITY_CODE="600519")');
    expect(captured.sortColumns).toBe('TRADE_DATE');
    expect(captured.sortTypes).toBe('-1');
    expect(captured.quoteColumns).toBe('f3');
    expect(captured.quoteType).toBe('0');
    expect(captured.source).toBe('WEB');
    expect(captured.client).toBe('WEB');
  });

  it('fetchDatacenterList returns just the data array', async () => {
    server.use(
      http.get(DATACENTER_URL, () =>
        HttpResponse.json({
          result: { pages: 1, count: 2, data: [{ x: 1 }, { x: 2 }] },
        })
      )
    );

    const client = new RequestClient();
    const result = await fetchDatacenterList(
      client,
      { reportName: 'TEST' },
      (item) => Number(item.x)
    );

    expect(result).toEqual([1, 2]);
  });
});
