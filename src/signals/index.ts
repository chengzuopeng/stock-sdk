/**
 * 指标信号层（v2 B1）
 *
 * 基于已计算指标的 K 线（{@link KlineWithIndicators}）做事件识别：
 * 金叉/死叉、超买/超卖、布林突破、SAR 反转。纯计算、零网络。
 */
import type { KlineWithIndicators } from '../indicators';
import type { AnyHistoryKline } from '../types';
import type { Signal, SignalOptions } from './types';
import { InvalidArgumentError } from '../core';

export type { SignalType, Signal, SignalOptions } from './types';

type Kline = KlineWithIndicators<AnyHistoryKline>;

/**
 * 从带指标的 K 线序列计算信号。
 *
 * 一致性约定：A2 把 K 线 `timestamp` 改为 `number | null`，而 `Signal.at` 恒为
 * `number` —— 本函数跳过 `timestamp` 为 `null` 的 K 线（无有效时间锚点不产信号）。
 */
export function calcSignals(klines: Kline[], options: SignalOptions = {}): Signal[] {
  const signals: Signal[] = [];

  // #5 防静默零信号：信号侧 MA 周期必须与 addIndicators 实际算出的 MA key 一致，
  // 否则 `ma${fast}`/`ma${slow}` 取不到值会被守卫静默跳过、不产任何信号。这里显式校验并报错。
  if (options.ma && klines.length > 0) {
    const { fast, slow } = options.ma;
    const hasMaKeys = klines.some(
      (k) =>
        k.ma != null &&
        k.ma[`ma${fast}`] !== undefined &&
        k.ma[`ma${slow}`] !== undefined
    );
    if (!hasMaKeys) {
      throw new InvalidArgumentError(
        `calcSignals: MA periods {fast:${fast}, slow:${slow}} not found on klines — ` +
          `ensure addIndicators computed ma${fast}/ma${slow} (signal MA periods must match indicator periods).`,
        { fast, slow }
      );
    }
  }

  // N2 同理：RSI 也是 period-keyed(rsi${period}，默认 6)，周期与指标不一致会静默零信号
  if (options.rsi && klines.length > 0) {
    const period = options.rsi.period ?? 6;
    const hasRsiKey = klines.some(
      (k) => k.rsi != null && k.rsi[`rsi${period}`] !== undefined
    );
    if (!hasRsiKey) {
      throw new InvalidArgumentError(
        `calcSignals: RSI period ${period} not found on klines — ` +
          `ensure addIndicators computed rsi${period} (signal RSI period must match indicator period).`,
        { period }
      );
    }
  }

  for (let i = 1; i < klines.length; i++) {
    const prev = klines[i - 1];
    const cur = klines[i];
    const at = cur.timestamp;
    if (at == null) continue; // 无有效时间锚点的 K 线不产信号

    // MA 金叉/死叉
    if (options.ma) {
      const { fast, slow } = options.ma;
      const pf = prev.ma?.[`ma${fast}`];
      const ps = prev.ma?.[`ma${slow}`];
      const cf = cur.ma?.[`ma${fast}`];
      const cs = cur.ma?.[`ma${slow}`];
      if (pf != null && ps != null && cf != null && cs != null) {
        if (pf <= ps && cf > cs) {
          signals.push({ type: 'ma_golden_cross', at, index: i, detail: { fast, slow } });
        } else if (pf >= ps && cf < cs) {
          signals.push({ type: 'ma_death_cross', at, index: i, detail: { fast, slow } });
        }
      }
    }

    // MACD 金叉/死叉（DIF × DEA）
    if (options.macd) {
      const pd = prev.macd?.dif;
      const pe = prev.macd?.dea;
      const cd = cur.macd?.dif;
      const ce = cur.macd?.dea;
      if (pd != null && pe != null && cd != null && ce != null) {
        if (pd <= pe && cd > ce) {
          signals.push({ type: 'macd_golden_cross', at, index: i });
        } else if (pd >= pe && cd < ce) {
          signals.push({ type: 'macd_death_cross', at, index: i });
        }
      }
    }

    // KDJ 金叉死叉 + 超买超卖
    if (options.kdj) {
      const overbought = options.kdj.overbought ?? 80;
      const oversold = options.kdj.oversold ?? 20;
      const pk = prev.kdj?.k;
      const pdv = prev.kdj?.d;
      const ck = cur.kdj?.k;
      const cdv = cur.kdj?.d;
      if (pk != null && pdv != null && ck != null && cdv != null) {
        if (pk <= pdv && ck > cdv) {
          signals.push({ type: 'kdj_golden_cross', at, index: i });
        } else if (pk >= pdv && ck < cdv) {
          signals.push({ type: 'kdj_death_cross', at, index: i });
        }
      }
      if (ck != null) {
        if (ck > overbought) {
          signals.push({ type: 'kdj_overbought', at, index: i, detail: { k: ck } });
        } else if (ck < oversold) {
          signals.push({ type: 'kdj_oversold', at, index: i, detail: { k: ck } });
        }
      }
    }

    // RSI 超买超卖
    if (options.rsi) {
      const period = options.rsi.period ?? 6;
      const overbought = options.rsi.overbought ?? 70;
      const oversold = options.rsi.oversold ?? 30;
      const r = cur.rsi?.[`rsi${period}`];
      if (r != null) {
        if (r > overbought) {
          signals.push({ type: 'rsi_overbought', at, index: i, detail: { rsi: r } });
        } else if (r < oversold) {
          signals.push({ type: 'rsi_oversold', at, index: i, detail: { rsi: r } });
        }
      }
    }

    // BOLL 收盘突破
    if (options.boll) {
      const close = cur.close;
      const upper = cur.boll?.upper;
      const lower = cur.boll?.lower;
      if (close != null && upper != null && close > upper) {
        signals.push({ type: 'boll_break_upper', at, index: i });
      } else if (close != null && lower != null && close < lower) {
        signals.push({ type: 'boll_break_lower', at, index: i });
      }
    }

    // SAR 趋势反转
    if (options.sar) {
      const pt = prev.sar?.trend;
      const ct = cur.sar?.trend;
      if (pt != null && ct != null && pt !== ct) {
        signals.push({
          type: ct === 1 ? 'sar_reversal_up' : 'sar_reversal_down',
          at,
          index: i,
        });
      }
    }
  }

  return signals;
}
