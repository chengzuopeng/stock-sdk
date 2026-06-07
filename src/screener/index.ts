/**
 * 选股器 + 回测（v2 B2）
 */
export { screen, type ScreenerBuilder } from './screener';
export {
  backtest,
  type Strategy,
  type StrategySignal,
  type Trade,
  type BacktestOptions,
  type BacktestReport,
} from './backtest';
