import type { MarketTz } from '../core/time';
import type { ProviderId } from '../router/types';

/**
 * 7×24 实时财经快讯条目
 */
export interface MarketNewsFlash {
  /** 快讯唯一 ID */
  id: string;
  /** 标题（部分源无独立标题时会从正文【...】中提取） */
  title: string;
  /** 快讯正文内容 */
  content: string;
  /** 发布时间（YYYY-MM-DD HH:mm:ss，北京时间） */
  publishedAt: string;
  /** 发布时间对应的 UTC 毫秒时间戳 */
  timestamp: number | null;
  /** 时区（固定 Asia/Shanghai） */
  tz: MarketTz;
  /** 原文链接（如上游提供） */
  url: string | null;
  /** 关联标签 */
  tags: string[];
  /** 关联股票代码列表 */
  relatedCodes: string[];
  /** 实际命中的数据源 */
  source: ProviderId;
}

/**
 * 上市公司公告条目
 */
export interface StockAnnouncement {
  /** 公告 ID */
  id: string;
  /** 股票代码 */
  code: string;
  /** 股票简称 */
  name: string;
  /** 公告标题 */
  title: string;
  /** 公告分类（如 定期报告 / 权益分派 / 其他） */
  category: string | null;
  /** 公告发布日期/时间（YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss） */
  publishedAt: string;
  /** UTC 毫秒时间戳 */
  timestamp: number | null;
  /** 公告原文/PDF 链接 */
  url: string | null;
  /** 附件格式（如 PDF） */
  fileType: string | null;
  /** 实际命中的数据源 */
  source: ProviderId;
}

/**
 * 7×24 快讯查询选项
 */
export interface NewsFlashOptions {
  /** 页码（默认 1） */
  page?: number;
  /** 每页条数（默认 20） */
  pageSize?: number;
}

/**
 * 上市公司公告查询选项
 */
export interface AnnouncementQueryOptions {
  /** 按股票代码过滤（如 '600519'，不传返回全市场最新公告） */
  symbol?: string;
  /** 关键词搜索（仅支持搜索的源生效，如巨潮） */
  keyword?: string;
  /** 页码（默认 1） */
  page?: number;
  /** 每页条数（默认 20） */
  pageSize?: number;
}
