import { defineConfig } from 'vitepress'
import { resolve } from 'path'
import faroUploader from '@grafana/faro-rollup-plugin'

const base = process.env.DOCS_BASE || '/'

// MCP 中文侧边栏配置
const zhMcpSidebar = {
  '/mcp/': [
    {
      text: 'MCP 与 AI 能力',
      items: [
        { text: '概述', link: '/mcp/' },
        { text: '安装配置', link: '/mcp/installation' },
        { text: '工具与资源', link: '/mcp/tools' },
        { text: 'AI Skills 技能', link: '/mcp/skills' },
      ],
    },
  ],
}

// MCP 英文侧边栏配置
const enMcpSidebar = {
  '/en/mcp/': [
    {
      text: 'MCP & AI',
      items: [
        { text: 'Overview', link: '/en/mcp/' },
        { text: 'Installation', link: '/en/mcp/installation' },
        { text: 'Tools & Resources', link: '/en/mcp/tools' },
        { text: 'AI Skills', link: '/en/mcp/skills' },
      ],
    },
  ],
}

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
        { text: '错误处理与重试', link: '/guide/retry' },
        { text: '请求治理', link: '/guide/request-governance' },
        { text: '期货与期权', link: '/guide/futures-options' },
        { text: '分红与交易日历', link: '/guide/dividend-calendar' },
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
      items: [{ text: '概览', link: '/api' }],
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
        { text: 'OBV 能量潮', link: '/api/indicator-obv' },
        { text: 'ROC 变动率', link: '/api/indicator-roc' },
        { text: 'DMI/ADX 趋向指标', link: '/api/indicator-dmi' },
        { text: 'SAR 抛物线转向', link: '/api/indicator-sar' },
        { text: 'KC 肯特纳通道', link: '/api/indicator-kc' },
      ],
    },
    {
      text: '期货行情',
      items: [
        { text: '期货行情', link: '/api/futures' },
      ],
    },
    {
      text: '期权数据',
      items: [
        { text: '期权数据', link: '/api/options' },
      ],
    },
    {
      text: '批量与扩展',
      items: [
        { text: '代码列表', link: '/api/code-lists' },
        { text: '搜索', link: '/api/search' },
        { text: '批量查询', link: '/api/batch' },
        { text: '资金流向', link: '/api/fund-flow' },
        { text: '分红派送', link: '/api/dividend' },
      ],
    },
    {
      text: '资金流向（深度）',
      items: [
        { text: '个股 / 大盘 / 排名 / 板块', link: '/api/fund-flow-deep' },
        { text: '沪深港通 / 北向资金', link: '/api/northbound' },
      ],
    },
    {
      text: '盘口与龙虎榜',
      items: [
        { text: '涨停板 / 盘口异动', link: '/api/market-event' },
        { text: '龙虎榜', link: '/api/dragon-tiger' },
      ],
    },
    {
      text: '其他数据',
      items: [
        { text: '大宗交易 / 融资融券', link: '/api/block-trade-margin' },
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
        { text: 'Error Handling & Retry', link: '/en/guide/retry' },
        { text: 'Request Governance', link: '/en/guide/request-governance' },
        { text: 'Futures & Options', link: '/en/guide/futures-options' },
        { text: 'Dividend & Calendar', link: '/en/guide/dividend-calendar' },
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
      items: [{ text: 'Overview', link: '/en/api' }],
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
        { text: 'OBV', link: '/en/api/indicator-obv' },
        { text: 'ROC', link: '/en/api/indicator-roc' },
        { text: 'DMI/ADX', link: '/en/api/indicator-dmi' },
        { text: 'SAR', link: '/en/api/indicator-sar' },
        { text: 'KC', link: '/en/api/indicator-kc' },
      ],
    },
    {
      text: 'Futures',
      items: [
        { text: 'Futures', link: '/en/api/futures' },
      ],
    },
    {
      text: 'Options',
      items: [
        { text: 'Options', link: '/en/api/options' },
      ],
    },
    {
      text: 'Batch & Extended',
      items: [
        { text: 'Code Lists', link: '/en/api/code-lists' },
        { text: 'Search', link: '/en/api/search' },
        { text: 'Batch Query', link: '/en/api/batch' },
        { text: 'Fund Flow', link: '/en/api/fund-flow' },
        { text: 'Dividend', link: '/en/api/dividend' },
      ],
    },
    {
      text: 'Fund Flow (Deep)',
      items: [
        { text: 'Individual / Market / Rank / Sector', link: '/en/api/fund-flow-deep' },
        { text: 'Northbound / Stock Connect', link: '/en/api/northbound' },
      ],
    },
    {
      text: 'Limit-Up & Dragon-Tiger',
      items: [
        { text: 'Limit-Up Pool / Stock Changes', link: '/en/api/market-event' },
        { text: 'Dragon-Tiger List', link: '/en/api/dragon-tiger' },
      ],
    },
    {
      text: 'Other Data',
      items: [
        { text: 'Block Trade / Margin Trading', link: '/en/api/block-trade-margin' },
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
  description:
    'Stock market SDK for browser and Node.js with quotes, K-line, indicators, futures, options, and AI / MCP integration',

  base: base,
  cleanUrls: true, // 去掉 URL 中的 .html 后缀

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Stock SDK' }],
    [
      'meta',
      {
        property: 'og:title',
        content: 'Stock SDK',
      },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Stock market SDK for browser and Node.js with quotes, K-line, indicators, futures, options, and AI / MCP integration',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary' }],
  ],

  // 国际化配置
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Stock SDK',
      description:
        '面向前端与 Node.js 的股票行情 SDK，支持多市场行情、K 线、指标、期货、期权和 AI / MCP 集成',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/getting-started' },
          { text: 'API', link: '/api/' },
          { text: 'MCP / AI', link: '/mcp/' },
          { text: 'Playground', link: '/playground' },
          { text: 'Demo', link: 'https://chengzuopeng.github.io/stock-dashboard/' },
          { text: '更新日志', link: '/changelog' },
        ],
        sidebar: { ...zhSidebar, ...zhMcpSidebar },
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
      title: 'Stock SDK',
      description:
        'Stock market SDK for browser and Node.js with quotes, K-line, indicators, futures, options, and AI / MCP integration',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'API', link: '/en/api/' },
          { text: 'MCP / AI', link: '/en/mcp/' },
          { text: 'Playground', link: '/en/playground' },
          { text: 'Demo', link: 'https://chengzuopeng.github.io/stock-dashboard/' },
          { text: 'Changelog', link: '/en/changelog' },
        ],
        sidebar: { ...enSidebar, ...enMcpSidebar },
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
      copyright: 'Copyright © 2025 chengzuopeng',
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
    build: {
      sourcemap: true,
    },
    plugins: [
      ...(process.env.GRAFANA_SOURCEMAP_TOKEN
        ? [
          faroUploader({
            appName: 'stock-sdk-docs',
            endpoint: 'https://faro-api-prod-ap-southeast-1.grafana.net/faro/api/v1',
            appId: '972',
            stackId: '1494323',
            verbose: true,
            apiKey: process.env.GRAFANA_SOURCEMAP_TOKEN,
            gzipContents: true,
          }),
        ]
        : []),
    ],
  },
})
