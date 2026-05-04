import type { CategorySpec } from './types';

/**
 * Playground 侧边栏分类定义。
 * 顺序即侧边栏展示顺序。
 */
export const categories: CategorySpec[] = [
  { key: 'quotes', label: '实时行情', icon: 'lucide:bar-chart-3', color: '#3b82f6' },
  { key: 'kline', label: 'K线数据', icon: 'lucide:line-chart', color: '#22c55e' },
  { key: 'board', label: '板块数据', icon: 'lucide:layout-grid', color: '#06b6d4' },
  { key: 'indicator', label: '技术指标', icon: 'lucide:trending-up', color: '#f59e0b' },
  { key: 'search', label: '搜索', icon: 'lucide:search', color: '#ec4899' },
  { key: 'batch', label: '批量查询', icon: 'lucide:layers', color: '#8b5cf6' },
  { key: 'futures', label: '期货行情', icon: 'lucide:flame', color: '#f97316' },
  { key: 'options', label: '期权数据', icon: 'lucide:target', color: '#06b6d4' },
  { key: 'extended', label: '扩展功能', icon: 'lucide:zap', color: '#ef4444' },
];
