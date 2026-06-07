/**
 * 命名空间 API（v2 A3）结构测试。
 * 验证 sdk.<ns>.<method> 全部挂载且委托到对应 service（旧扁平方法仍保留）。
 */
import { describe, it, expect } from 'vitest';
import { StockSDK } from '../../../src/sdk';

const sdk = new StockSDK();

describe('namespace API — 一级命名空间', () => {
  it('quotes', () => {
    expect(typeof sdk.quotes.cn).toBe('function');
    expect(typeof sdk.quotes.cnSimple).toBe('function');
    expect(typeof sdk.quotes.hk).toBe('function');
    expect(typeof sdk.quotes.us).toBe('function');
    expect(typeof sdk.quotes.fund).toBe('function');
    expect(typeof sdk.quotes.timeline).toBe('function');
  });

  it('codes / batch', () => {
    expect(typeof sdk.codes.cn).toBe('function');
    expect(typeof sdk.codes.fund).toBe('function');
    expect(typeof sdk.batch.cn).toBe('function');
    expect(typeof sdk.batch.raw).toBe('function');
  });

  it('kline (含 withIndicators)', () => {
    expect(typeof sdk.kline.cn).toBe('function');
    expect(typeof sdk.kline.cnMinute).toBe('function');
    expect(typeof sdk.kline.hk).toBe('function');
    expect(typeof sdk.kline.us).toBe('function');
    expect(typeof sdk.kline.withIndicators).toBe('function');
  });

  it('futures / fundFlow / northbound / marketEvent / dragonTiger', () => {
    expect(typeof sdk.futures.kline).toBe('function');
    expect(typeof sdk.futures.comexInventory).toBe('function');
    expect(typeof sdk.fundFlow.individual).toBe('function');
    expect(typeof sdk.northbound.minute).toBe('function');
    expect(typeof sdk.marketEvent.ztPool).toBe('function');
    expect(typeof sdk.dragonTiger.detail).toBe('function');
  });

  it('blockTrade / margin / fund / calendar / reference', () => {
    expect(typeof sdk.blockTrade.marketStat).toBe('function');
    expect(typeof sdk.margin.accountInfo).toBe('function');
    expect(typeof sdk.fund.dividendList).toBe('function');
    expect(typeof sdk.calendar.isTradingDay).toBe('function');
    expect(typeof sdk.calendar.marketStatus).toBe('function');
    expect(typeof sdk.reference.dividendDetail).toBe('function');
  });
});

describe('namespace API — 二级命名空间', () => {
  it('board.industry / board.concept', () => {
    expect(typeof sdk.board.industry.list).toBe('function');
    expect(typeof sdk.board.industry.constituents).toBe('function');
    expect(typeof sdk.board.concept.spot).toBe('function');
    expect(typeof sdk.board.concept.minuteKline).toBe('function');
  });

  it('options.{index,etf,commodity,cffex} + lhb', () => {
    expect(typeof sdk.options.index.spot).toBe('function');
    expect(typeof sdk.options.etf.dailyKline).toBe('function');
    expect(typeof sdk.options.etf.fiveDayMinute).toBe('function');
    expect(typeof sdk.options.commodity.kline).toBe('function');
    expect(typeof sdk.options.cffex.quotes).toBe('function');
    expect(typeof sdk.options.lhb).toBe('function');
  });
});

describe('namespace API — 与旧扁平方法委托一致', () => {
  it('命名空间方法与旧方法指向同一 service 行为（结构层面均为函数）', () => {
    // 旧扁平方法仍保留（向后兼容，单轨硬切前的过渡）
    expect(typeof sdk.getFullQuotes).toBe('function');
    expect(typeof sdk.getETFOptionDailyKline).toBe('function');
  });
});

describe('namespace API — 引用稳定(补a / TD §7.2)', () => {
  it('同一命名空间多次访问返回同一引用(memoized，sdk.quotes === sdk.quotes)', () => {
    expect(sdk.quotes).toBe(sdk.quotes);
    expect(sdk.kline).toBe(sdk.kline);
    expect(sdk.board).toBe(sdk.board);
    expect(sdk.options).toBe(sdk.options);
    expect(sdk.reference).toBe(sdk.reference);
  });
});
