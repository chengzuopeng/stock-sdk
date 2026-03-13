import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { RequestClient } from '../../../../src/core';
import { getCFFEXOptionQuotes } from '../../../../src/providers/eastmoney/optionCffex';
import { getOptionLHB } from '../../../../src/providers/eastmoney/optionLhb';

const mockCffexData = {
  total: 2,
  list: [
    {
      dm: 'MO2603-P-8200',
      sc: 221,
      name: '中证1000沽26年03月8200',
      p: 110.2,
      zde: 33.4,
      zdf: 43.49,
      vol: 23587,
      cje: 206831000,
      ccl: 6959,
      xqj: 8200.0,
      syr: 7,
      rz: -227,
      zjsj: 76.8,
      o: 85.0,
    },
    {
      dm: 'IO2504-C-3600',
      sc: 221,
      name: '沪深300购25年04月3600',
      p: 305.0,
      zde: -15.0,
      zdf: -4.69,
      vol: 1200,
      cje: 36000000,
      ccl: 800,
      xqj: 3600.0,
      syr: 30,
      rz: 50,
      zjsj: 320.0,
      o: 310.0,
    },
  ],
};

const mockLhbData = {
  result: {
    pages: 1,
    data: [
      {
        TRADE_TYPE: '认沽交易量',
        TRADE_DATE: '2022-01-21 00:00:00',
        SECURITY_CODE: '510050',
        TARGET_NAME: '50ETF',
        MEMBER_NAME_ABBR: '华泰证券',
        MEMBER_RANK: 1,
        SELL_VOLUME: 274862,
        SELL_VOLUME_CHANGE: -140810,
        NET_SELL_VOLUME: -69839,
        SELL_VOLUME_RATIO: 0.127,
        BUY_VOLUME: null,
        BUY_VOLUME_CHANGE: null,
        NET_BUY_VOLUME: null,
        BUY_VOLUME_RATIO: null,
        SELL_POSITION: null,
        SELL_POSITION_CHANGE: null,
        NET_SELL_POSITION: null,
        SELL_POSITION_RATIO: null,
        BUY_POSITION: null,
        BUY_POSITION_CHANGE: null,
        NET_BUY_POSITION: null,
        BUY_POSITION_RATIO: null,
      },
    ],
  },
  success: true,
  code: 0,
};

describe('Eastmoney CFFEX Option Quotes', () => {
  const client = new RequestClient();

  it('should return parsed CFFEXOptionQuote array', async () => {
    server.use(
      http.get('https://futsseapi.eastmoney.com/list/option/221', () =>
        HttpResponse.json(mockCffexData)
      )
    );

    const quotes = await getCFFEXOptionQuotes(client);
    expect(quotes).toHaveLength(2);

    expect(quotes[0].code).toBe('MO2603-P-8200');
    expect(quotes[0].name).toBe('中证1000沽26年03月8200');
    expect(quotes[0].price).toBe(110.2);
    expect(quotes[0].change).toBe(33.4);
    expect(quotes[0].changePercent).toBe(43.49);
    expect(quotes[0].volume).toBe(23587);
    expect(quotes[0].amount).toBe(206831000);
    expect(quotes[0].openInterest).toBe(6959);
    expect(quotes[0].strikePrice).toBe(8200.0);
    expect(quotes[0].remainDays).toBe(7);
    expect(quotes[0].dailyChange).toBe(-227);
    expect(quotes[0].prevSettle).toBe(76.8);
    expect(quotes[0].open).toBe(85.0);
  });

  it('should handle empty response', async () => {
    server.use(
      http.get('https://futsseapi.eastmoney.com/list/option/221', () =>
        HttpResponse.json({ total: 0, list: [] })
      )
    );
    const quotes = await getCFFEXOptionQuotes(client);
    expect(quotes).toEqual([]);
  });
});

describe('Eastmoney Option LHB', () => {
  const client = new RequestClient();

  it('should return parsed OptionLHBItem array', async () => {
    server.use(
      http.get('https://datacenter-web.eastmoney.com/api/data/get', () =>
        HttpResponse.json(mockLhbData)
      )
    );

    const items = await getOptionLHB(client, '510050', '2022-01-21');
    expect(items).toHaveLength(1);

    expect(items[0].tradeType).toBe('认沽交易量');
    expect(items[0].date).toBe('2022-01-21');
    expect(items[0].symbol).toBe('510050');
    expect(items[0].targetName).toBe('50ETF');
    expect(items[0].memberName).toBe('华泰证券');
    expect(items[0].rank).toBe(1);
    expect(items[0].sellVolume).toBe(274862);
    expect(items[0].sellVolumeChange).toBe(-140810);
    expect(items[0].buyVolume).toBeNull();
    expect(items[0].buyPosition).toBeNull();
  });

  it('should handle empty result', async () => {
    server.use(
      http.get('https://datacenter-web.eastmoney.com/api/data/get', () =>
        HttpResponse.json({ result: null, success: false, code: 9201 })
      )
    );
    const items = await getOptionLHB(client, '510050', '2099-01-01');
    expect(items).toEqual([]);
  });
});
