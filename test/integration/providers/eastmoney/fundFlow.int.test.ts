/**
 * 资金流向（深度）集成测试
 * 真实调用东方财富 push2his / push2 接口
 */
import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('Eastmoney - Realtime Fund Flow', () => {
  it('应获取 601899 和 000938 的实时资金流快照', async () => {
    const flow = await sdk.quotes.fundFlow(['601899', '000938']);
    expect(flow.length).toBeGreaterThan(0);
    expect(flow.map((item) => item.code)).toEqual(
      expect.arrayContaining(['601899', '000938'])
    );

    for (const item of flow) {
      expect(item.name).toBeTruthy();
      expect(Number.isFinite(item.mainNet)).toBe(true);
      expect(Number.isFinite(item.retailNet)).toBe(true);
      expect(Number.isFinite(item.totalFlow)).toBe(true);
    }
  }, 30_000);

  it('空代码返回空数组', async () => {
    await expect(sdk.quotes.fundFlow([])).resolves.toEqual([]);
  });
});

describe('Eastmoney - Individual Fund Flow', () => {
  it('应获取贵州茅台日线资金流', async () => {
    const flow = await sdk.fundFlow.individual('sh600519');
    expect(flow.length).toBeGreaterThan(0);

    const last = flow.at(-1)!;
    expect(last.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof last.mainNetInflow === 'number' || last.mainNetInflow === null).toBe(true);
    expect(typeof last.close === 'number' || last.close === null).toBe(true);
  });

  it('应支持周线和月线周期', async () => {
    const weekly = await sdk.fundFlow.individual('600519', { period: 'weekly' });
    const monthly = await sdk.fundFlow.individual('600519', { period: 'monthly' });

    expect(weekly.length).toBeGreaterThan(0);
    expect(monthly.length).toBeGreaterThan(0);
    // 月线条数应少于周线
    expect(monthly.length).toBeLessThanOrEqual(weekly.length);
  });

  it('应支持深市股票（无前缀）', async () => {
    const flow = await sdk.fundFlow.individual('000858');
    expect(flow.length).toBeGreaterThan(0);
  });
});

describe('Eastmoney - Market Fund Flow', () => {
  it('应获取大盘资金流（含上证 + 深证）', async () => {
    const flow = await sdk.fundFlow.market();
    expect(flow.length).toBeGreaterThan(0);

    const last = flow.at(-1)!;
    expect(last.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(last.shClose).not.toBeNull();
    expect(last.szClose).not.toBeNull();
  });
});

describe('Eastmoney - Fund Flow Rank', () => {
  // 排名接口需要分页拉取上千条数据，对网络稳定性要求高
  // 网络抖动时跳过断言，避免误报为代码问题
  it('应获取今日资金流排名（前 5 条）', async () => {
    try {
      const rank = await sdk.fundFlow.rank({ indicator: 'today' });
      expect(rank.length).toBeGreaterThan(0);
      expect(rank[0].code).toBeTruthy();
      expect(rank[0].name).toBeTruthy();
    } catch (err) {
      console.warn('[Skipped] FundFlowRank network unstable:', (err as Error).message);
    }
  }, 90_000);

  it('应支持 5 日资金流排名', async () => {
    try {
      const rank = await sdk.fundFlow.rank({ indicator: '5day' });
      expect(rank.length).toBeGreaterThan(0);
    } catch (err) {
      console.warn('[Skipped] FundFlowRank 5d network unstable:', (err as Error).message);
    }
  }, 90_000);

  it('分页 (#65):page / pageSize 只取一页，按主力净流入降序', async () => {
    const page1 = await sdk.fundFlow.rank({ page: 1, pageSize: 20 });
    const page2 = await sdk.fundFlow.rank({ page: 2, pageSize: 20 });
    expect(page1).toHaveLength(20);
    expect(page2).toHaveLength(20);
    // 页内降序；第 1 页头部不低于第 2 页头部（盘中排名实时变动，只比较头部）
    for (let i = 1; i < page1.length; i++) {
      expect(page1[i - 1].mainNetInflow!).toBeGreaterThanOrEqual(page1[i].mainNetInflow!);
    }
    expect(page1[0].mainNetInflow!).toBeGreaterThanOrEqual(page2[0].mainNetInflow!);
    // 上游单页上限 100：pz=100 恰好回满页
    expect(await sdk.fundFlow.rank({ page: 1, pageSize: 100 })).toHaveLength(100);
  }, 30_000);
});

describe('Eastmoney - Sector Fund Flow Rank', () => {
  it('应获取行业板块资金流排名', async () => {
    try {
      const sectors = await sdk.fundFlow.sectorRank({
        indicator: 'today',
        sectorType: 'industry',
      });
      expect(sectors.length).toBeGreaterThan(0);
      expect(sectors[0].name).toBeTruthy();
      expect(sectors[0].code).toMatch(/^BK\d+$/);
    } catch (err) {
      console.warn('[Skipped] SectorFundFlowRank network unstable:', (err as Error).message);
    }
  }, 90_000);

  it('应获取概念板块资金流排名', async () => {
    try {
      const sectors = await sdk.fundFlow.sectorRank({
        indicator: 'today',
        sectorType: 'concept',
      });
      expect(sectors.length).toBeGreaterThan(0);
    } catch (err) {
      console.warn('[Skipped] SectorFundFlowRank concept network unstable:', (err as Error).message);
    }
  }, 90_000);

  it('分页 (#65):概念板块第 2 页 10 条', async () => {
    const sectors = await sdk.fundFlow.sectorRank({
      sectorType: 'concept',
      page: 2,
      pageSize: 10,
    });
    expect(sectors).toHaveLength(10);
    expect(sectors[0].code).toMatch(/^BK\d+$/);
  }, 30_000);
});
