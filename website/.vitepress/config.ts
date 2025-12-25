import { defineConfig } from 'vitepress'
import { resolve } from 'path'

const base = process.env.DOCS_BASE || '/'

// 中文侧边栏配置
const zhSidebar = {
  '/guide/': [
    {
      text: '开始',
      items: [
        { text: '介绍', link: '/guide/introduction' },
        { text: '安装', link: '/guide/installation' },
        { text: '快速开始', link: '/guide/getting-started' },
      ],
    },
    {
      text: '环境与部署',
      items: [
        { text: '浏览器使用', link: '/guide/browser' },
      ],
    },
    {
      text: '进阶',
      items: [
        { text: '技术指标', link: '/guide/indicators' },
        { text: '批量查询', link: '/guide/batch' },
      ],
    },
    {
      text: '更多',
      items: [{ text: '更新日志', link: '/changelog' }],
    },
  ],
  '/api/': [
    {
      text: 'API 总览',
      items: [{ text: '概览', link: '/api/' }],
    },
    {
      text: '实时行情',
      items: [
        { text: 'A 股行情', link: '/api/quotes' },
        { text: '港股行情', link: '/api/hk-quotes' },
        { text: '美股行情', link: '/api/us-quotes' },
        { text: '基金行情', link: '/api/fund-quotes' },
      ],
    },
    {
      text: 'K 线数据',
      items: [
        { text: '历史 K 线', link: '/api/kline' },
        { text: '分钟 K 线', link: '/api/minute-kline' },
        { text: '分时走势', link: '/api/timeline' },
      ],
    },
    {
      text: '行业板块',
      items: [
        { text: '行业板块', link: '/api/industry-board' },
        { text: '概念板块', link: '/api/concept-board' },
      ],
    },
    {
      text: '技术指标',
      items: [
        { text: '指标概览', link: '/api/indicators' },
        { text: 'MA 均线', link: '/api/indicator-ma' },
        { text: 'MACD', link: '/api/indicator-macd' },
        { text: 'BOLL 布林带', link: '/api/indicator-boll' },
        { text: 'KDJ', link: '/api/indicator-kdj' },
        { text: 'RSI / WR', link: '/api/indicator-rsi-wr' },
        { text: 'BIAS 乖离率', link: '/api/indicator-bias' },
        { text: 'CCI 商品通道指数', link: '/api/indicator-cci' },
        { text: 'ATR 平均真实波幅', link: '/api/indicator-atr' },
      ],
    },
    {
      text: '批量与扩展',
      items: [
        { text: '代码列表', link: '/api/code-lists' },
        { text: '批量查询', link: '/api/batch' },
        { text: '资金流向', link: '/api/fund-flow' },
      ],
    },
    {
      text: '更多',
      items: [{ text: '更新日志', link: '/changelog' }],
    },
  ],
}

// 英文侧边栏配置
const enSidebar = {
  '/en/guide/': [
    {
      text: 'Getting Started',
      items: [
        { text: 'Introduction', link: '/en/guide/introduction' },
        { text: 'Installation', link: '/en/guide/installation' },
        { text: 'Quick Start', link: '/en/guide/getting-started' },
      ],
    },
    {
      text: 'Environment',
      items: [
        { text: 'Browser Usage', link: '/en/guide/browser' },
      ],
    },
    {
      text: 'Advanced',
      items: [
        { text: 'Technical Indicators', link: '/en/guide/indicators' },
        { text: 'Batch Query', link: '/en/guide/batch' },
      ],
    },
    {
      text: 'More',
      items: [{ text: 'Changelog', link: '/en/changelog' }],
    },
  ],
  '/en/api/': [
    {
      text: 'API Overview',
      items: [{ text: 'Overview', link: '/en/api/' }],
    },
    {
      text: 'Real-time Quotes',
      items: [
        { text: 'A-Share Quotes', link: '/en/api/quotes' },
        { text: 'HK Stock Quotes', link: '/en/api/hk-quotes' },
        { text: 'US Stock Quotes', link: '/en/api/us-quotes' },
        { text: 'Fund Quotes', link: '/en/api/fund-quotes' },
      ],
    },
    {
      text: 'K-Line Data',
      items: [
        { text: 'History K-Line', link: '/en/api/kline' },
        { text: 'Minute K-Line', link: '/en/api/minute-kline' },
        { text: 'Timeline', link: '/en/api/timeline' },
      ],
    },
    {
      text: 'Industry Sectors',
      items: [
        { text: 'Industry Sectors', link: '/en/api/industry-board' },
        { text: 'Concept Sectors', link: '/en/api/concept-board' },
      ],
    },
    {
      text: 'Technical Indicators',
      items: [
        { text: 'Indicators Overview', link: '/en/api/indicators' },
        { text: 'MA', link: '/en/api/indicator-ma' },
        { text: 'MACD', link: '/en/api/indicator-macd' },
        { text: 'BOLL', link: '/en/api/indicator-boll' },
        { text: 'KDJ', link: '/en/api/indicator-kdj' },
        { text: 'RSI / WR', link: '/en/api/indicator-rsi-wr' },
        { text: 'BIAS', link: '/en/api/indicator-bias' },
        { text: 'CCI', link: '/en/api/indicator-cci' },
        { text: 'ATR', link: '/en/api/indicator-atr' },
      ],
    },
    {
      text: 'Batch & Extended',
      items: [
        { text: 'Code Lists', link: '/en/api/code-lists' },
        { text: 'Batch Query', link: '/en/api/batch' },
        { text: 'Fund Flow', link: '/en/api/fund-flow' },
      ],
    },
    {
      text: 'More',
      items: [{ text: 'Changelog', link: '/en/changelog' }],
    },
  ],
}

export default defineConfig({
  title: 'Stock SDK',
  description: '为前端和 Node.js 设计的股票行情 SDK',

  base: base,
  cleanUrls: true, // 去掉 URL 中的 .html 后缀

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
  ],

  // 国际化配置
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/getting-started' },
          { text: 'API', link: '/api/' },
          { text: 'Playground', link: '/playground/' },
          { text: '更新日志', link: '/changelog' },
        ],
        sidebar: zhSidebar,
        outline: {
          level: [2, 3],
          label: '页面导航',
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        lastUpdated: {
          text: '最后更新于',
        },
        editLink: {
          pattern: 'https://github.com/chengzuopeng/stock-sdk/edit/main/website/:path',
          text: '在 GitHub 上编辑此页',
        },
        search: {
          provider: 'local',
          options: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭',
                },
              },
            },
          },
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'API', link: '/en/api/' },
          { text: 'Playground', link: '/en/playground/' },
          { text: 'Changelog', link: '/en/changelog' },
        ],
        sidebar: enSidebar,
        outline: {
          level: [2, 3],
          label: 'On this page',
        },
        docFooter: {
          prev: 'Previous',
          next: 'Next',
        },
        lastUpdated: {
          text: 'Last updated',
        },
        editLink: {
          pattern: 'https://github.com/chengzuopeng/stock-sdk/edit/main/website/:path',
          text: 'Edit this page on GitHub',
        },
      },
    },
  },

  themeConfig: {
    logo: '/logo.svg',

    socialLinks: [
      { icon: 'github', link: 'https://github.com/chengzuopeng/stock-sdk' },
    ],

    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2024 chengzuopeng',
    },

    search: {
      provider: 'local',
    },
  },

  // Markdown 配置
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },

  // Vite 配置
  vite: {
    resolve: {
      alias: {
        // 开发模式下将 'stock-sdk-local' 指向本地 src 目录
        'stock-sdk-local': resolve(__dirname, '../../src'),
      },
    },
    server: {
      fs: {
        // 允许访问上级目录（用于引用 src）
        allow: ['../..'],
      },
    },
  },
})
