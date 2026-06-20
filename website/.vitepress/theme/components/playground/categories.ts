/**
 * 分类（= v2 命名空间）与市场芯片的展示配置。
 *
 * 顺序与 API 文档侧边栏一致：行情 → 代码 → 批量 → K线 → 板块 → 衍生品 → 资金面 → 工具。
 * 颜色取暖色系（红盘主题），辅以少量中性色区分。
 */
import type { CategorySpec, MarketChipSpec } from './types';

export const categories: CategorySpec[] = [
  { key: 'quotes', label: '实时行情', icon: 'lucide:zap', color: '#dc2626' },
  { key: 'codes', label: '代码列表', icon: 'lucide:list-ordered', color: '#a16207' },
  { key: 'batch', label: '批量行情', icon: 'lucide:layers', color: '#ea580c' },
  { key: 'kline', label: 'K 线', icon: 'lucide:candlestick-chart', color: '#b91c1c' },
  { key: 'board', label: '行业 / 概念板块', icon: 'lucide:layout-grid', color: '#c2410c' },
  { key: 'options', label: '期权', icon: 'lucide:diamond', color: '#9333ea' },
  { key: 'futures', label: '期货', icon: 'lucide:flame', color: '#d97706' },
  { key: 'fundFlow', label: '资金流向', icon: 'lucide:arrow-left-right', color: '#0d9488' },
  { key: 'northbound', label: '北向资金', icon: 'lucide:train-front', color: '#2563eb' },
  { key: 'marketEvent', label: '涨停 / 异动', icon: 'lucide:siren', color: '#e11d48' },
  { key: 'dragonTiger', label: '龙虎榜', icon: 'lucide:trophy', color: '#ca8a04' },
  { key: 'blockTrade', label: '大宗交易', icon: 'lucide:boxes', color: '#7c3aed' },
  { key: 'margin', label: '融资融券', icon: 'lucide:scale', color: '#0891b2' },
  { key: 'fund', label: '基金', icon: 'lucide:piggy-bank', color: '#db2777' },
  { key: 'calendar', label: '交易日历', icon: 'lucide:calendar-days', color: '#65a30d' },
  { key: 'reference', label: '参考数据', icon: 'lucide:book-open', color: '#64748b' },
  { key: 'search', label: '搜索', icon: 'lucide:search', color: '#475569' },
];

export const marketChips: MarketChipSpec[] = [
  { key: null, label: '全部' },
  { key: 'a', label: 'A 股' },
  { key: 'hk', label: '港股' },
  { key: 'us', label: '美股' },
  { key: 'fund', label: '基金' },
  { key: 'futures', label: '期货' },
  { key: 'options', label: '期权' },
  { key: 'board', label: '板块' },
];
