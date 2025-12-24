import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Stock SDK',
  description: '为前端和 Node.js 设计的股票行情 SDK',

  // 部署到 GitHub Pages
  base: '/stock-sdk/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/stock-sdk/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Playground', link: '/playground/' },
      { text: '更新日志', link: '/changelog' },
    ],

    sidebar: {
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
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/chengzuopeng/stock-sdk' },
    ],

    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2024 chengzuopeng',
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
  },

  // 中文优化
  lang: 'zh-CN',

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
    // 允许在开发时访问外部资源
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },
})
