/**
 * R7-12 datacenter 系接口 symbol 归一回归：
 * 此前三处各写各的去前缀正则（dividend 漏 /i：'SH600519' 静默返回空，
 * 而 northbound/dragonTiger 正常），点分 '600519.SH' / secid '1.600519'
 * 形态全部静默空。收编到 symbols 层后全形态一致。
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestClient } from '../../../../src/core';
import { InvalidSymbolError } from '../../../../src/core';
import { getDividendDetail } from '../../../../src/providers/eastmoney/dividend';
import { getNorthboundIndividual } from '../../../../src/providers/eastmoney/northbound';
import { getDragonTigerStockSeatDetail } from '../../../../src/providers/eastmoney/dragonTiger';

function fakeClient() {
  const calls: string[] = [];
  const get = vi.fn(async (url: string) => {
    calls.push(url);
    return { result: { data: [], pages: 1, count: 0 } };
  });
  return { client: { get } as unknown as RequestClient, calls };
}

function filterOf(url: string): string {
  return new URL(url).searchParams.get('filter') ?? '';
}

describe('getDividendDetail（此前漏 /i 的站点）', () => {
  it.each(['600519', 'sh600519', 'SH600519', '600519.SH', '1.600519'])(
    "'%s' → SECURITY_CODE=\"600519\"",
    async (input) => {
      const { client, calls } = fakeClient();
      await getDividendDetail(client, input);
      expect(filterOf(calls[0])).toContain('(SECURITY_CODE="600519")');
    }
  );

  it('垃圾输入从静默空数组改为抛 InvalidSymbolError', async () => {
    const { client } = fakeClient();
    await expect(getDividendDetail(client, '!!not-a-symbol')).rejects.toThrow(
      InvalidSymbolError
    );
  });
});

describe('northbound / dragonTiger 与 dividend 全形态一致', () => {
  it("getNorthboundIndividual('600519.SH') 点分形态不再静默空", async () => {
    const { client, calls } = fakeClient();
    await getNorthboundIndividual(client, '600519.SH');
    expect(filterOf(calls[0])).toContain('(SECURITY_CODE="600519")');
  });

  it("getDragonTigerStockSeatDetail('SH600519') 大小写归一", async () => {
    const { client, calls } = fakeClient();
    await getDragonTigerStockSeatDetail(client, 'SH600519', '2024-05-20');
    expect(filterOf(calls[0])).toContain('(SECURITY_CODE="600519")');
  });
});
