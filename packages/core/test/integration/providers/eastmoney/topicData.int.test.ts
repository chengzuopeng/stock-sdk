/**
 * 涨停板 / 盘口异动 集成测试
 */
import { describe, it, expect } from 'vitest';
import StockSDK from '../../../../src/index';

const sdk = new StockSDK();

describe('Eastmoney - ZT Pool', () => {
  it('应获取今日涨停股池', async () => {
    const pool = await sdk.marketEvent.ztPool('zt');
    // 非交易日可能为空
    expect(Array.isArray(pool)).toBe(true);

    if (pool.length > 0) {
      expect(pool[0].code).toMatch(/^\d{6}$/);
      expect(pool[0].name).toBeTruthy();
    }
  });

  it('应支持指定历史日期查询涨停池', async () => {
    // 使用一个已知的交易日（2024-10-08，节后第一天）
    // 接口对历史数据的保留时间不固定，仅验证调用成功 + 结构正确
    const pool = await sdk.marketEvent.ztPool('zt', '20241008');
    expect(Array.isArray(pool)).toBe(true);
    if (pool.length > 0) {
      expect(pool[0].industry).toBeTruthy();
      expect(pool[0].code).toMatch(/^\d{6}$/);
    }
  });

  it('应获取强势股池', async () => {
    const pool = await sdk.marketEvent.ztPool('strong', '20241008');
    expect(Array.isArray(pool)).toBe(true);
  });
});

describe('Eastmoney - Stock Changes', () => {
  it('应获取大笔买入异动', async () => {
    const changes = await sdk.marketEvent.stockChanges('large_buy');
    expect(Array.isArray(changes)).toBe(true);

    if (changes.length > 0) {
      expect(changes[0].time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(changes[0].changeType).toBe('large_buy');
      expect(changes[0].changeTypeLabel).toBe('大笔买入');
    }
  });
});

describe('Eastmoney - Stock Changes (multi-type / all / 个股)', () => {
  it('多类型数组一次请求,typeCode 区分实际类型', async () => {
    const changes = await sdk.marketEvent.stockChanges([
      'limit_up_seal',
      'limit_down_seal',
    ]);
    expect(Array.isArray(changes)).toBe(true);
    if (changes.length > 0) {
      expect(changes[0].typeCode).toMatch(/^\d+$/);
      expect(['limit_up_seal', 'limit_down_seal']).toContain(
        changes[0].changeType
      );
    }
  });

  it("'all' 拉取全部类型并翻页收全(交易日盘中/盘后总量通常上万)", async () => {
    const changes = await sdk.marketEvent.stockChanges('all');
    expect(Array.isArray(changes)).toBe(true);
    if (changes.length > 0) {
      // 至少出现两种以上不同类型
      const types = new Set(changes.map((c) => c.typeCode));
      expect(types.size).toBeGreaterThan(1);
    }
  }, 60000);

  it('分页 (#65):page / pageSize 只取一页,第 2 页与第 1 页不同', async () => {
    const key = (c: { time: string; code: string; typeCode: string }) =>
      `${c.time}|${c.code}|${c.typeCode}`;
    const page1 = await sdk.marketEvent.stockChanges('all', { page: 1, pageSize: 50 });
    expect(page1.length).toBeLessThanOrEqual(50);
    if (page1.length === 50) {
      const page2 = await sdk.marketEvent.stockChanges('all', { page: 2, pageSize: 50 });
      expect(page2.length).toBeGreaterThan(0);
      expect(page2.length).toBeLessThanOrEqual(50);
      expect(page2.map(key)).not.toEqual(page1.map(key));
    }
  }, 30000);

  it('个股当日异动:从涨停池动态取一只当日有事件的标的', async () => {
    const pool = await sdk.marketEvent.ztPool('zt');
    if (pool.length === 0) return; // 非交易时段/极端行情兜底
    const symbol = pool[0].code;
    const changes = await sdk.marketEvent.individualChanges(symbol);
    expect(Array.isArray(changes)).toBe(true);
    if (changes.length > 0) {
      expect(changes[0].time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(changes[0].typeCode).toMatch(/^\d+$/);
      expect(changes[0].price === null || changes[0].price! > 0).toBe(true);
    }
  }, 30000);

  it('个股近 7 天异动历史:coverage 与逐日 available 标注', async () => {
    const res = await sdk.marketEvent.individualChangesHistory('600519', {
      days: 7,
    });
    expect(res.code).toBe('600519');
    expect(res.requestedDays).toBe(7);
    expect(res.coverage.from <= res.coverage.to).toBe(true);
    expect(Array.isArray(res.days)).toBe(true);
    // 近 7 天应全部在服务端保留窗口内(实测窗口约 17 个交易日)
    for (const day of res.days) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(day.available).toBe(true);
    }
    if (res.days.length > 0) {
      expect(res.coverage.availableFrom).toBe(res.days[0].date);
    }
  }, 60000);

  it('个股历史:35 天跨度下 available 标注与 coverage 自洽(服务端保留有空洞,不假设连续)', async () => {
    const res = await sdk.marketEvent.individualChangesHistory('600519', {
      days: 35,
    });
    // 服务端保留约数周且存在个别日期空洞(实测 0602 有数据而 0605 无),
    // 不断言"必有超窗日"或"available 连续",只做结构自洽校验:
    expect(res.days.length).toBeGreaterThan(0);
    for (const day of res.days) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (!day.available) expect(day.changes).toEqual([]);
    }
    // 日期升序
    const dates = res.days.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
    // availableFrom = 首个有数据日(全无则 null)
    const firstAvailable = res.days.find((d) => d.available);
    expect(res.coverage.availableFrom).toBe(firstAvailable?.date ?? null);
  }, 90000);
});

describe('Eastmoney - Board Changes', () => {
  it('应获取板块异动详情', async () => {
    const boards = await sdk.marketEvent.boardChanges();
    expect(Array.isArray(boards)).toBe(true);
  });
});
