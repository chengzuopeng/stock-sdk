/**
 * F40 对拍回归:normalizeSearchTarget 改走 symbols.normalizeSymbol
 *
 * PARITY 部分的期望值是切换实现前用【旧版 normalizeSearchTarget】
 * (手写前缀剥离 / padStart / 数字市场码映射)跑出的快照,逐字节固化旧行为,
 * 断言重构后输出完全一致 —— 覆盖「数字市场码 × 带前缀 / 不带前缀 / secid
 * 形式 / 大小写」的输入矩阵与 unknown 搜索兜底。
 *
 * DIFF 部分是新旧不一致、且新行为明显更对的输入(双前缀、裸代码、secid
 * 直链、解析失败兜底等),按新行为断言并注明旧行为。
 */
import { describe, expect, it } from 'vitest';
import { generateSearchExternalLinks } from '../../src/externalLinks';
import type { SearchResult } from '../../src/types';

function links(market: string, code: string): [string, string] {
  const result: SearchResult = { code, name: '', market, type: '' };
  const out = generateSearchExternalLinks(result);
  return [out[0].url, out[1].url];
}

/** [market, code, 东方财富 URL, 雪球 URL] */
type Row = [string, string, string, string];

function runRows(rows: Row[]) {
  for (const [market, code, em, xq] of rows) {
    expect(links(market, code), `market='${market}' code='${code}'`).toEqual([
      em,
      xq,
    ]);
  }
}

describe('F40 对拍:重构前后输出一致(旧实现快照)', () => {
  it('腾讯数字市场码 1/0(沪/深)× 各 code 形态', () => {
    runRows([
      ['1', 'sh600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      ['1', '600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      ['1', 'SH600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      ['1', 'sh000300', 'https://quote.eastmoney.com/zs000300.html', 'https://xueqiu.com/S/SH000300'],
      ['1', '000001', 'https://quote.eastmoney.com/zs000001.html', 'https://xueqiu.com/S/SH000001'],
      // market 字段与 code 前缀冲突:market 字段语义保留(旧行为如此,维持)
      ['1', 'sz000001', 'https://quote.eastmoney.com/zs000001.html', 'https://xueqiu.com/S/SH000001'],
      ['0', 'sz000858', 'https://quote.eastmoney.com/sz000858.html', 'https://xueqiu.com/S/SZ000858'],
      ['0', '000858', 'https://quote.eastmoney.com/sz000858.html', 'https://xueqiu.com/S/SZ000858'],
      ['0', 'SZ000858', 'https://quote.eastmoney.com/sz000858.html', 'https://xueqiu.com/S/SZ000858'],
      ['0', '399001', 'https://quote.eastmoney.com/zs399001.html', 'https://xueqiu.com/S/SZ399001'],
      ['0', 'sz399006', 'https://quote.eastmoney.com/zs399006.html', 'https://xueqiu.com/S/SZ399006'],
    ]);
  });

  it('腾讯数字市场码 116(港股)× 各 code 形态(补零到 5 位)', () => {
    runRows([
      ['116', 'hk00700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['116', '00700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['116', 'hk700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['116', '700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['116', 'HK00700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      // 带 hk 前缀的字母代码:旧实现剥前缀后 padStart 得 '00HSI',
      // symbols 层 hk 前缀路径同样补零 → 输出一致
      ['116', 'hkHSI', 'https://quote.eastmoney.com/hk/00HSI.html', 'https://xueqiu.com/S/00HSI'],
    ]);
  });

  it('腾讯数字市场码 105(美股)× 各 code 形态(含交易所后缀/secid/小写)', () => {
    runRows([
      ['105', 'usAAPL', 'https://quote.eastmoney.com/us/AAPL.html', 'https://xueqiu.com/S/AAPL'],
      ['105', 'AAPL', 'https://quote.eastmoney.com/us/AAPL.html', 'https://xueqiu.com/S/AAPL'],
      // smartbox 的美股 pureCode 可带交易所后缀(AAPL.OQ / BRK.A)
      ['105', 'usAAPL.OQ', 'https://quote.eastmoney.com/us/AAPL.OQ.html', 'https://xueqiu.com/S/AAPL.OQ'],
      ['105', 'AAPL.OQ', 'https://quote.eastmoney.com/us/AAPL.OQ.html', 'https://xueqiu.com/S/AAPL.OQ'],
      ['105', 'usBRK.A', 'https://quote.eastmoney.com/us/BRK.A.html', 'https://xueqiu.com/S/BRK.A'],
      ['105', '105.MSFT', 'https://quote.eastmoney.com/us/MSFT.html', 'https://xueqiu.com/S/MSFT'],
      ['105', 'usaapl', 'https://quote.eastmoney.com/us/AAPL.html', 'https://xueqiu.com/S/AAPL'],
      ['105', '105.msft', 'https://quote.eastmoney.com/us/MSFT.html', 'https://xueqiu.com/S/MSFT'],
    ]);
  });

  it("腾讯数字市场码 100(global):特有逻辑保留,不走 normalizeSymbol", () => {
    runRows([
      ['100', 'IXIC', 'https://quote.eastmoney.com/gb/zsNDX.html', 'https://xueqiu.com/S/.IXIC'],
      ['100', 'NDX', 'https://quote.eastmoney.com/gb/zsNDX.html', 'https://xueqiu.com/S/.NDX'],
      ['100', '100.IXIC', 'https://quote.eastmoney.com/gb/zsNDX.html', 'https://xueqiu.com/S/.IXIC'],
      ['100', 'HSI', 'https://quote.eastmoney.com/gb/zsHSI.html', 'https://xueqiu.com/S/HSI'],
      ['100', 'ndx', 'https://quote.eastmoney.com/gb/zsNDX.html', 'https://xueqiu.com/S/.NDX'],
    ]);
  });

  it('字符串市场标识 sh/sz/hk/us/global(含 market 大写)', () => {
    runRows([
      ['sh', 'sh600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      ['sh', '600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      ['sz', 'sz000858', 'https://quote.eastmoney.com/sz000858.html', 'https://xueqiu.com/S/SZ000858'],
      ['sz', '000858', 'https://quote.eastmoney.com/sz000858.html', 'https://xueqiu.com/S/SZ000858'],
      ['hk', 'hk00700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['hk', '700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['us', 'usAAPL.OQ', 'https://quote.eastmoney.com/us/AAPL.OQ.html', 'https://xueqiu.com/S/AAPL.OQ'],
      ['us', 'AAPL', 'https://quote.eastmoney.com/us/AAPL.html', 'https://xueqiu.com/S/AAPL'],
      ['global', 'IXIC', 'https://quote.eastmoney.com/gb/zsNDX.html', 'https://xueqiu.com/S/.IXIC'],
      ['SH', 'sh600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      ['US', 'usAAPL', 'https://quote.eastmoney.com/us/AAPL.html', 'https://xueqiu.com/S/AAPL'],
    ]);
  });

  it('无 market hint:带市场前缀的 code 仍可识别', () => {
    runRows([
      ['', 'sh600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      ['', 'sz000858', 'https://quote.eastmoney.com/sz000858.html', 'https://xueqiu.com/S/SZ000858'],
      ['', 'hk00700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['', 'usAAPL', 'https://quote.eastmoney.com/us/AAPL.html', 'https://xueqiu.com/S/AAPL'],
      ['', 'usAAPL.OQ', 'https://quote.eastmoney.com/us/AAPL.OQ.html', 'https://xueqiu.com/S/AAPL.OQ'],
      ['', 'usBRK.A', 'https://quote.eastmoney.com/us/BRK.A.html', 'https://xueqiu.com/S/BRK.A'],
      ['999', 'sh600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
    ]);
  });

  it('unknown 搜索兜底:北交所 / 板块 / 期货 / 解析失败(与旧行为一致)', () => {
    runRows([
      // BSE:TENCENT_MARKET_MAP 没有 bj,旧 fallback 正则也只认 sh/sz → 维持搜索兜底
      ['bj', 'bj430047', 'https://so.eastmoney.com/web/s?keyword=bj430047', 'https://xueqiu.com/k?q=bj430047'],
      ['', 'bj430047', 'https://so.eastmoney.com/web/s?keyword=bj430047', 'https://xueqiu.com/k?q=bj430047'],
      ['', '430047', 'https://so.eastmoney.com/web/s?keyword=430047', 'https://xueqiu.com/k?q=430047'],
      ['', '920001', 'https://so.eastmoney.com/web/s?keyword=920001', 'https://xueqiu.com/k?q=920001'],
      // 非股票资产(板块 / 期货)
      ['', '90.BK0475', 'https://so.eastmoney.com/web/s?keyword=90.BK0475', 'https://xueqiu.com/k?q=90.BK0475'],
      ['', 'CFFEX.IF2412', 'https://so.eastmoney.com/web/s?keyword=CFFEX.IF2412', 'https://xueqiu.com/k?q=CFFEX.IF2412'],
      // 未知市场 + 不可解析 code
      ['999', 'ABC 123', 'https://so.eastmoney.com/web/s?keyword=ABC%20123', 'https://xueqiu.com/k?q=ABC%20123'],
      ['', '', 'https://so.eastmoney.com/web/s?keyword=', 'https://xueqiu.com/k?q='],
    ]);
  });
});

describe('F40 行为差异:新旧不一致且新行为更对(按新行为断言)', () => {
  it('无 market hint 的裸代码 / secid 形式:旧走搜索兜底,新直达行情页', () => {
    runRows([
      // 旧:so.eastmoney.com 搜索兜底(fallback 正则只认 sh/sz/hk/us 前缀形式)
      ['', '600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      ['', '00700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['', '0700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['', 'AAPL', 'https://quote.eastmoney.com/us/AAPL.html', 'https://xueqiu.com/S/AAPL'],
      ['', '1.600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      ['', '116.00700', 'https://quote.eastmoney.com/hk/00700.html', 'https://xueqiu.com/S/00700'],
      ['', '105.AAPL', 'https://quote.eastmoney.com/us/AAPL.html', 'https://xueqiu.com/S/AAPL'],
    ]);
  });

  it('双前缀(F40 主修复):symbols 层的剥离 / 拒绝从此直达链接生成', () => {
    runRows([
      // secid+前缀冗余:'1.sh600519' 旧走搜索兜底,新经 stripRedundantPrefix 直达
      ['', '1.sh600519', 'https://quote.eastmoney.com/sh600519.html', 'https://xueqiu.com/S/SH600519'],
      // 非法双前缀:旧拼出废链接 quote.eastmoney.com/shsh600519.html,
      // 新解析失败 → 搜索兜底
      ['sh', 'shsh600519', 'https://so.eastmoney.com/web/s?keyword=shsh600519', 'https://xueqiu.com/k?q=shsh600519'],
    ]);
  });

  it('hint 市场 + 不可解析 code:旧直接拼废行情页链接,新走搜索兜底', () => {
    runRows([
      // 旧:quote.eastmoney.com/shABC 123.html 等必失效链接
      ['sh', 'ABC 123', 'https://so.eastmoney.com/web/s?keyword=ABC%20123', 'https://xueqiu.com/k?q=ABC%20123'],
      ['hk', 'ABC 123', 'https://so.eastmoney.com/web/s?keyword=ABC%20123', 'https://xueqiu.com/k?q=ABC%20123'],
      ['us', 'ABC 123', 'https://so.eastmoney.com/web/s?keyword=ABC%20123', 'https://xueqiu.com/k?q=ABC%20123'],
      // 空 code:旧拼出 quote.eastmoney.com/sh.html,新搜索兜底
      ['sh', '', 'https://so.eastmoney.com/web/s?keyword=', 'https://xueqiu.com/k?q='],
    ]);
  });

  it('market 字段与 code 冲突 / 非常规形态:code 经 symbols 归一', () => {
    runRows([
      // market 字段语义保留(sh),code 经 normalizeSymbol 归一为 00700;
      // 旧输出 quote.eastmoney.com/shhk00700.html(前缀未剥),新旧均为废链接,
      // 新形态更归一
      ['sh', 'hk00700', 'https://quote.eastmoney.com/sh00700.html', 'https://xueqiu.com/S/SH00700'],
      // 港股 hint + 纯字母 code:旧 padStart 伪补零得 '00HSI',新保留原码
      ['hk', 'HSI', 'https://quote.eastmoney.com/hk/HSI.html', 'https://xueqiu.com/S/HSI'],
    ]);
  });
});
