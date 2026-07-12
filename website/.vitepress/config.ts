import { defineConfig } from 'vitepress'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import faroUploader from '@grafana/faro-rollup-plugin'

// v2 文档站配置（VitePress，仓库唯一官方站）
const base = process.env.DOCS_BASE || '/'

// 构建期读取真实版本号，注入 themeConfig 供 HeroMeta 等组件使用（避免硬编码失真）
const sdkVersion = (
  JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')) as {
    version: string
  }
).version

// ---- 中文侧边栏 ----
const zhGuideSidebar = {
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
      text: '核心概念',
      items: [
        { text: '符号与代码规则', link: '/guide/symbols' },
        { text: '从 v1 迁移', link: '/guide/migration-v1-to-v2' },
      ],
    },
    {
      text: '进阶',
      items: [
        { text: '请求治理', link: '/guide/request-governance' },
        { text: '错误处理与重试', link: '/guide/retry' },
        { text: '技术指标与信号', link: '/guide/indicators' },
        { text: '个股 30 天异动全景', link: '/guide/stock-changes-panorama' },
        { text: '期货与期权', link: '/guide/futures-options' },
        { text: '复权说明 (qfq/hfq)', link: '/guide/dividend-adjustment' },
        { text: '浏览器使用', link: '/guide/browser' },
      ],
    },
    { text: '更多', items: [{ text: '更新日志', link: '/changelog' }] },
  ],
}

const zhApiSidebar = {
  '/api/': [
    { text: '总览', items: [{ text: '命名空间地图', link: '/api/' }] },
    {
      text: '行情与批量',
      items: [
        { text: 'quotes · 实时行情', link: '/api/quotes' },
        { text: 'codes · 代码列表', link: '/api/codes' },
        { text: 'batch · 批量行情', link: '/api/batch' },
      ],
    },
    {
      text: 'K 线与板块',
      items: [
        { text: 'kline · K线 / 分时', link: '/api/kline' },
        { text: 'chips · 筹码分布', link: '/api/chips' },
        { text: 'board · 行业 / 概念', link: '/api/board' },
      ],
    },
    {
      text: '衍生品',
      items: [
        { text: 'options · 期权', link: '/api/options' },
        { text: 'futures · 期货', link: '/api/futures' },
      ],
    },
    {
      text: '资金面',
      items: [
        { text: 'fundFlow · 资金流向', link: '/api/fund-flow' },
        { text: 'northbound · 北向资金', link: '/api/northbound' },
        { text: 'marketEvent · 涨停 / 异动', link: '/api/market-event' },
        { text: 'dragonTiger · 龙虎榜', link: '/api/dragon-tiger' },
        { text: 'blockTrade · 大宗交易', link: '/api/block-trade' },
        { text: 'margin · 融资融券', link: '/api/margin' },
      ],
    },
    {
      text: '基金与工具',
      items: [
        { text: 'fund · 基金扩展', link: '/api/fund' },
        { text: 'calendar · 交易日历', link: '/api/calendar' },
        { text: 'reference · 分红 / 日历', link: '/api/reference' },
        { text: 'search · 搜索', link: '/api/search' },
      ],
    },
    {
      text: '指标计算',
      items: [
        { text: 'indicators · 指标函数', link: '/api/indicators' },
        { text: 'signals · 信号', link: '/api/signals' },
        { text: 'screener · 选股 / 回测', link: '/api/screener' },
      ],
    },
  ],
}

const zhCliSidebar = {
  '/cli/': [
    {
      text: 'CLI 命令行',
      items: [
        { text: '概览', link: '/cli/' },
        { text: '命令清单', link: '/cli/commands' },
      ],
    },
  ],
}
const zhMcpSidebar = {
  '/mcp/': [
    {
      text: 'MCP 与 AI',
      items: [
        { text: '概述', link: '/mcp/' },
        { text: '安装配置', link: '/mcp/installation' },
        { text: '工具', link: '/mcp/tools' },
      ],
    },
  ],
}
const zhSkillsSidebar = {
  '/skills/': [
    {
      text: 'AI Skills',
      items: [
        { text: '概述', link: '/skills/' },
        { text: '技能清单', link: '/skills/catalog' },
      ],
    },
  ],
}

// ---- 英文侧边栏 ----
const enGuideSidebar = {
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
      text: 'Core Concepts',
      items: [
        { text: 'Symbols & Codes', link: '/en/guide/symbols' },
        { text: 'Migrate from v1', link: '/en/guide/migration-v1-to-v2' },
      ],
    },
    {
      text: 'Advanced',
      items: [
        { text: 'Request Governance', link: '/en/guide/request-governance' },
        { text: 'Errors & Retry', link: '/en/guide/retry' },
        { text: 'Indicators & Signals', link: '/en/guide/indicators' },
        { text: '30-Day Changes Panorama', link: '/en/guide/stock-changes-panorama' },
        { text: 'Futures & Options', link: '/en/guide/futures-options' },
        { text: 'Adjustment (qfq/hfq)', link: '/en/guide/dividend-adjustment' },
        { text: 'Browser Usage', link: '/en/guide/browser' },
      ],
    },
    { text: 'More', items: [{ text: 'Changelog', link: '/en/changelog' }] },
  ],
}

const enApiSidebar = {
  '/en/api/': [
    { text: 'Overview', items: [{ text: 'Namespace Map', link: '/en/api/' }] },
    {
      text: 'Quotes & Batch',
      items: [
        { text: 'quotes', link: '/en/api/quotes' },
        { text: 'codes', link: '/en/api/codes' },
        { text: 'batch', link: '/en/api/batch' },
      ],
    },
    {
      text: 'K-line & Boards',
      items: [
        { text: 'kline', link: '/en/api/kline' },
        { text: 'chips', link: '/en/api/chips' },
        { text: 'board', link: '/en/api/board' },
      ],
    },
    {
      text: 'Derivatives',
      items: [
        { text: 'options', link: '/en/api/options' },
        { text: 'futures', link: '/en/api/futures' },
      ],
    },
    {
      text: 'Capital Flow',
      items: [
        { text: 'fundFlow', link: '/en/api/fund-flow' },
        { text: 'northbound', link: '/en/api/northbound' },
        { text: 'marketEvent', link: '/en/api/market-event' },
        { text: 'dragonTiger', link: '/en/api/dragon-tiger' },
        { text: 'blockTrade', link: '/en/api/block-trade' },
        { text: 'margin', link: '/en/api/margin' },
      ],
    },
    {
      text: 'Funds & Utils',
      items: [
        { text: 'fund', link: '/en/api/fund' },
        { text: 'calendar', link: '/en/api/calendar' },
        { text: 'reference', link: '/en/api/reference' },
        { text: 'search', link: '/en/api/search' },
      ],
    },
    {
      text: 'Indicators',
      items: [
        { text: 'indicators', link: '/en/api/indicators' },
        { text: 'signals', link: '/en/api/signals' },
        { text: 'screener', link: '/en/api/screener' },
      ],
    },
  ],
}

const enCliSidebar = {
  '/en/cli/': [
    {
      text: 'CLI',
      items: [
        { text: 'Overview', link: '/en/cli/' },
        { text: 'Command Reference', link: '/en/cli/commands' },
      ],
    },
  ],
}
const enMcpSidebar = {
  '/en/mcp/': [
    {
      text: 'MCP & AI',
      items: [
        { text: 'Overview', link: '/en/mcp/' },
        { text: 'Installation', link: '/en/mcp/installation' },
        { text: 'Tools', link: '/en/mcp/tools' },
      ],
    },
  ],
}
const enSkillsSidebar = {
  '/en/skills/': [
    {
      text: 'AI Skills',
      items: [
        { text: 'Overview', link: '/en/skills/' },
        { text: 'Skill Catalog', link: '/en/skills/catalog' },
      ],
    },
  ],
}

export default defineConfig({
  title: 'Stock SDK',
  description:
    'v2 · 面向浏览器与 Node.js 的零依赖股票行情 SDK：命名空间 API、技术指标与信号、选股回测、CLI 与 MCP',
  base,
  cleanUrls: true,
  // 骨架阶段：页面陆续补全，先容忍未建页面的死链
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }],
    // 字体：Archivo(宽体工业 display) + Public Sans(body) + IBM Plex Mono(数据/代码/标签)
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
      },
    ],
    // v2 主色：深红（红 = 涨 = 吉利；浅色模式 #b91c1c，深色模式亮红 #f87171）
    ['meta', { name: 'theme-color', content: '#b91c1c' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Stock SDK' }],
  ],

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Stock SDK',
      description:
        'v2 · 面向浏览器与 Node.js 的零依赖股票行情 SDK：命名空间 API、技术指标与信号、选股回测、CLI 与 MCP',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/getting-started' },
          { text: 'API', link: '/api/' },
          {
            text: 'AI · Extensions',
            activeMatch: '^/(cli|mcp|skills)/',
            items: [
              { text: 'CLI', link: '/cli/' },
              { text: 'MCP', link: '/mcp/' },
              { text: 'Skills', link: '/skills/' },
            ],
          },
          { text: '演练场', link: '/playground/' },
          // 版本下拉：导航展示 latest 版本号，hover 出更新日志与 v1 文档外链
          {
            text: `v${sdkVersion}`,
            items: [
              { items: [{ text: '更新日志', link: '/changelog' }] },
              {
                items: [
                  { text: '从 v1 迁移', link: '/guide/migration-v1-to-v2' },
                  { text: 'v1 文档', link: 'https://v1.stock-sdk.linkdiary.cn', target: '_blank' },
                ],
              },
            ],
          },
        ],
        sidebar: {
          ...zhGuideSidebar,
          ...zhApiSidebar,
          ...zhCliSidebar,
          ...zhMcpSidebar,
          ...zhSkillsSidebar,
        },
        outline: { level: [2, 3], label: '页面导航' },
        docFooter: { prev: '上一页', next: '下一页' },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'Stock SDK',
      description:
        'v2 · Zero-dependency stock market SDK for browser and Node.js: namespaced API, indicators & signals, screener & backtest, CLI and MCP',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/getting-started' },
          { text: 'API', link: '/en/api/' },
          {
            text: 'AI · Extensions',
            activeMatch: '^/en/(cli|mcp|skills)/',
            items: [
              { text: 'CLI', link: '/en/cli/' },
              { text: 'MCP', link: '/en/mcp/' },
              { text: 'Skills', link: '/en/skills/' },
            ],
          },
          { text: 'Playground', link: '/en/playground/' },
          {
            text: `v${sdkVersion}`,
            items: [
              { items: [{ text: 'Changelog', link: '/en/changelog' }] },
              {
                items: [
                  { text: 'Migrate from v1', link: '/en/guide/migration-v1-to-v2' },
                  { text: 'v1 Docs', link: 'https://v1.stock-sdk.linkdiary.cn', target: '_blank' },
                ],
              },
            ],
          },
        ],
        sidebar: {
          ...enGuideSidebar,
          ...enApiSidebar,
          ...enCliSidebar,
          ...enMcpSidebar,
          ...enSkillsSidebar,
        },
        outline: { level: [2, 3], label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
        editLink: {
          pattern:
            'https://github.com/chengzuopeng/stock-sdk/edit/master/website/:path',
          text: 'Edit this page on GitHub',
        },
        lastUpdated: { text: 'Last updated' },
      },
    },
  },

  // 顶层启用 git 最后更新时间采集(VitePress 仅认顶层此开关)
  lastUpdated: true,

  // 顶层 themeConfig:跨 locale 共享的配置(search / editLink / lastUpdated 文案)
  // 必须放顶层 —— VitePress 构建期只读顶层 themeConfig 决定本地搜索与更新时间。
  themeConfig: {
    logo: '/logo.svg',

    // 自定义字段：当前 SDK 版本，HeroMeta 组件通过 useData().theme.sdkVersion 读取
    sdkVersion,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/chengzuopeng/stock-sdk' },
    ],
    search: { provider: 'local' },
    editLink: {
      pattern:
        'https://github.com/chengzuopeng/stock-sdk/edit/master/website/:path',
      text: '在 GitHub 上编辑此页',
    },
    lastUpdated: { text: '最后更新于' },
  },

  // Vite 配置
  vite: {
    resolve: {
      alias: {
        // 开发模式下将 'stock-sdk-local' 指向本地 src 目录（LiveTicker dogfooding 用）
        'stock-sdk-local': resolve(__dirname, '../../src'),
      },
    },
    server: {
      fs: {
        // 允许访问上级目录（用于引用 src）
        allow: ['../..'],
      },
    },
    // 生产构建出 sourcemap，配合 faroUploader 上传后线上错误可映射回源码
    build: {
      sourcemap: true,
    },
    plugins: [
      // Faro sourcemap 上传：仅当 CI 注入了 GRAFANA_SOURCEMAP_TOKEN 时启用
      ...(process.env.GRAFANA_SOURCEMAP_TOKEN
        ? [
            faroUploader({
              appName: 'stock-sdk-docs-v2',
              endpoint: 'https://faro-api-prod-ap-southeast-1.grafana.net/faro/api/v1',
              appId: '1168',
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
