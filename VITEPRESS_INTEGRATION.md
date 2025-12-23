# Stock SDK VitePress 文档网站集成方案

## 📋 概述

本文档评估在 stock-sdk 项目中集成 VitePress 文档网站的可行性，并提供详细的实施方案。

---

## ✅ 可行性评估

### 结论：**完全可行**

在同一个工程中集成 VitePress 文档网站，同时保持 NPM 发包流程不受影响，是一个成熟且常见的方案。

### 可行性依据

| 维度 | 评估 | 说明 |
|------|------|------|
| **技术兼容性** | ✅ 完全兼容 | VitePress 基于 Vite，与现有 tsup 构建互不干扰 |
| **目录隔离** | ✅ 天然隔离 | 文档放 `/website` 目录，SDK 源码在 `/src` |
| **构建产物** | ✅ 独立输出 | SDK 输出 `/dist`，文档输出 `/website/.vitepress/dist` |
| **NPM 发包** | ✅ 不受影响 | `package.json` 的 `files` 字段只包含 `dist` |
| **Playground 集成** | ✅ 可行 | VitePress 支持自定义 Vue 组件和 iframe 嵌入 |
| **依赖管理** | ✅ 可分离 | VitePress 可作为 devDependency |
| **部署** | ✅ 简单 | 可直接部署到 GitHub Pages |

### 现有项目结构分析

```
stock-sdk/                 # 当前结构
├── src/                   # SDK 源码 ✅ 保持不变
├── dist/                  # 构建产物 ✅ 保持不变
├── playground/            # 现有 Playground → 将迁移到文档网站
├── docs/                  # 现有 Markdown 文档 → 将作为内容源
├── README.md              # 1000+ 行 → 将拆分到文档网站
├── package.json           # ✅ 新增 docs:* 脚本
└── ...
```

---

## 🏗️ 推荐方案

### 目录结构设计

```
stock-sdk/
├── src/                           # SDK 源码（不变）
├── dist/                          # SDK 构建产物（不变）
├── website/                       # 📂 新增：文档网站根目录
│   ├── .vitepress/
│   │   ├── config.ts              # VitePress 配置
│   │   ├── theme/
│   │   │   ├── index.ts           # 自定义主题入口
│   │   │   ├── Layout.vue         # 可选：自定义布局
│   │   │   └── components/        # 自定义组件
│   │   │       └── Playground.vue # Playground 组件
│   │   └── dist/                  # 文档构建产物（gitignore）
│   │
│   ├── index.md                   # 首页
│   ├── guide/                     # 指南
│   │   ├── getting-started.md     # 快速开始
│   │   ├── installation.md        # 安装
│   │   └── concepts.md            # 核心概念
│   │
│   ├── api/                       # API 文档
│   │   ├── quotes.md              # 行情 API
│   │   ├── kline.md               # K 线 API
│   │   ├── indicators.md          # 技术指标 API
│   │   └── batch.md               # 批量查询 API
│   │
│   ├── playground/                # Playground 页面
│   │   └── index.md               # 嵌入交互式 Playground
│   │
│   ├── examples/                  # 示例
│   │   ├── basic.md               # 基础示例
│   │   └── advanced.md            # 高级用法
│   │
│   └── public/                    # 静态资源
│       └── logo.svg
│
├── playground/                    # 原 Playground（可保留或删除）
├── docs/                          # 原 docs（迁移后可删除）
├── README.md                      # 精简版 README
├── package.json                   # 新增 docs:* 脚本
└── ...
```

### package.json 修改

```json
{
  "name": "stock-sdk",
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "dev": "yarn build && (sleep 1 && open http://localhost:4000/playground/ &) && npx serve -l 4000 .",
    
    "docs:dev": "vitepress dev website",
    "docs:build": "vitepress build website",
    "docs:preview": "vitepress preview website",
    "docs:deploy": "yarn docs:build && gh-pages -d website/.vitepress/dist"
  },
  "devDependencies": {
    "vitepress": "^1.5.0",
    "vue": "^3.5.13",
    "gh-pages": "^6.2.0"
  },
  "files": [
    "dist"
  ]
}
```

### 关键点说明

| 配置项 | 说明 |
|--------|------|
| `files: ["dist"]` | 只有 `dist` 目录会被发布到 NPM，文档不会被包含 |
| `docs:dev` | 本地开发文档网站 |
| `docs:build` | 构建静态文档网站 |
| `docs:deploy` | 部署到 GitHub Pages |

---

## 📁 文档内容迁移计划

### 从 README.md 拆分

| README 章节 | 迁移到 |
|-------------|--------|
| Why stock-sdk / 使用场景 / 特性 | `website/index.md` (首页) |
| 安装 | `website/guide/installation.md` |
| 快速开始 | `website/guide/getting-started.md` |
| 实时行情 API | `website/api/quotes.md` |
| K 线数据 API | `website/api/kline.md` |
| 技术指标 API | `website/api/indicators.md` |
| 批量查询 API | `website/api/batch.md` |
| 扩展数据 API | `website/api/extended.md` |
| 浏览器直接使用 | `website/guide/browser.md` |
| 开发 | `website/guide/contributing.md` |

### 精简后的 README.md

```markdown
# Stock SDK

为前端和 Node.js 设计的股票行情 SDK。

## 快速开始

npm install stock-sdk

import { StockSDK } from 'stock-sdk';
const sdk = new StockSDK();
const quotes = await sdk.getSimpleQuotes(['sh000001']);

## 文档

📖 **完整文档**: https://chengzuopeng.github.io/stock-sdk/

## License

ISC
```

---

## 🎮 Playground 集成方案

### 方案 A：iframe 嵌入（推荐）

将现有 Playground 作为独立页面，通过 iframe 嵌入到 VitePress。

**优点**：
- 改动最小，直接复用现有代码
- 样式隔离，不会与 VitePress 冲突
- 可独立维护

**实现**：

```vue
<!-- website/.vitepress/theme/components/PlaygroundEmbed.vue -->
<template>
  <div class="playground-container">
    <iframe 
      src="/playground/index.html" 
      frameborder="0"
      style="width: 100%; height: 800px; border-radius: 8px;"
    />
  </div>
</template>
```

```markdown
<!-- website/playground/index.md -->
---
layout: page
title: Playground
---

<script setup>
import PlaygroundEmbed from '../.vitepress/theme/components/PlaygroundEmbed.vue'
</script>

# 在线 Playground

<PlaygroundEmbed />
```

### 方案 B：Vue 组件重构

将 Playground 重写为 Vue 组件，直接在 VitePress 中渲染。

**优点**：
- 更好的集成体验
- 支持深色/浅色主题切换
- 代码更现代化

**缺点**：
- 需要重写现有 Playground（约 1000 行）
- 开发成本较高

### 方案 C：混合方案（折中）

- 保留现有 Playground 放到 `website/public/playground/`
- 在 VitePress 中通过 iframe 嵌入
- 后续逐步迁移为 Vue 组件

**推荐**: 先用方案 A/C，后续有需要再考虑方案 B

---

## ⚙️ VitePress 配置

### website/.vitepress/config.ts

```typescript
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Stock SDK',
  description: '为前端和 Node.js 设计的股票行情 SDK',
  
  // 部署到 GitHub Pages
  base: '/stock-sdk/',
  
  head: [
    ['link', { rel: 'icon', href: '/logo.svg' }]
  ],
  
  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/quotes' },
      { text: 'Playground', link: '/playground/' },
      { text: 'GitHub', link: 'https://github.com/chengzuopeng/stock-sdk' }
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '安装', link: '/guide/installation' },
            { text: '快速开始', link: '/guide/getting-started' },
          ]
        },
        {
          text: '进阶',
          items: [
            { text: '浏览器使用', link: '/guide/browser' },
            { text: '技术指标', link: '/guide/indicators' },
            { text: '批量查询', link: '/guide/batch' },
          ]
        }
      ],
      '/api/': [
        {
          text: '行情 API',
          items: [
            { text: 'A 股行情', link: '/api/quotes' },
            { text: '港股行情', link: '/api/hk-quotes' },
            { text: '美股行情', link: '/api/us-quotes' },
            { text: '基金行情', link: '/api/fund-quotes' },
          ]
        },
        {
          text: 'K 线 API',
          items: [
            { text: '历史 K 线', link: '/api/kline' },
            { text: '分钟 K 线', link: '/api/minute-kline' },
            { text: '分时走势', link: '/api/timeline' },
          ]
        },
        {
          text: '技术指标',
          items: [
            { text: '指标概览', link: '/api/indicators' },
            { text: 'MA 均线', link: '/api/indicator-ma' },
            { text: 'MACD', link: '/api/indicator-macd' },
            { text: 'BOLL', link: '/api/indicator-boll' },
            { text: 'KDJ', link: '/api/indicator-kdj' },
            { text: 'RSI', link: '/api/indicator-rsi' },
          ]
        },
        {
          text: '扩展 API',
          items: [
            { text: '资金流向', link: '/api/fund-flow' },
            { text: '批量查询', link: '/api/batch' },
          ]
        }
      ]
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/chengzuopeng/stock-sdk' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/stock-sdk' }
    ],
    
    footer: {
      message: 'Released under the ISC License.',
      copyright: 'Copyright © 2024 chengzuopeng'
    },
    
    search: {
      provider: 'local'
    },
    
    outline: {
      level: [2, 3],
      label: '目录'
    }
  },
  
  // 中文优化
  lang: 'zh-CN',
  
  // Markdown 配置
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  }
})
```

---

## 🚀 实施步骤

### Phase 1：基础搭建（预计 2h）

1. 安装 VitePress
   ```bash
   yarn add -D vitepress vue
   ```

2. 创建 `website/` 目录结构

3. 配置 `website/.vitepress/config.ts`

4. 创建首页 `website/index.md`

5. 添加 `docs:*` 脚本到 `package.json`

6. 更新 `.gitignore`
   ```
   website/.vitepress/dist
   website/.vitepress/cache
   ```

### Phase 2：内容迁移（预计 3h）

1. 从 README.md 拆分内容到各个 Markdown 文件

2. 调整格式适配 VitePress

3. 添加 frontmatter 和导航配置

### Phase 3：Playground 集成（预计 1h）

1. 复制 `playground/index.html` 到 `website/public/playground/`

2. 修改 SDK 引用路径（从本地改为 unpkg CDN）

3. 创建 iframe 嵌入组件

4. 创建 Playground 页面

### Phase 4：优化与部署（预计 1h）

1. 精简根目录 README.md

2. 配置 GitHub Actions 自动部署

3. 测试 NPM 发包流程确保不受影响

---

## 🔄 GitHub Actions 自动部署

### .github/workflows/docs.yml

```yaml
name: Deploy Docs

on:
  push:
    branches: [main, master]
    paths:
      - 'website/**'
      - '.github/workflows/docs.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: yarn
      
      - name: Install dependencies
        run: yarn install --frozen-lockfile
      
      - name: Build docs
        run: yarn docs:build
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: website/.vitepress/dist
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## 📊 工作量估算

| 阶段 | 内容 | 预计工时 |
|------|------|---------|
| Phase 1 | 基础搭建 | 2h |
| Phase 2 | 内容迁移 | 3h |
| Phase 3 | Playground 集成 | 1h |
| Phase 4 | 优化与部署 | 1h |
| **总计** | | **7h** |

---

## ⚠️ 注意事项

### NPM 发包不受影响

确保 `package.json` 中的 `files` 字段只包含 `dist`：

```json
{
  "files": ["dist"]
}
```

这样 `website/` 目录不会被发布到 NPM。

### 构建产物隔离

| 产物 | 目录 | 用途 |
|------|------|------|
| SDK 构建 | `/dist` | NPM 发包 |
| 文档构建 | `/website/.vitepress/dist` | GitHub Pages |

两者完全独立，互不影响。

### 本地开发

```bash
# SDK 开发
yarn build
yarn test

# 文档开发
yarn docs:dev

# 两者可并行开发，互不干扰
```

---

## 🎯 预期效果

1. **文档网站**：现代化的 VitePress 文档站点
2. **Playground**：在线交互式测试环境
3. **NPM 包**：发包流程不变，包大小不变
4. **GitHub Pages**：自动部署文档网站
5. **README**：精简到 50 行以内，引导用户查看文档网站

---

## 📝 后续扩展

1. **国际化**：VitePress 支持多语言，可添加英文版
2. **API 文档自动生成**：使用 TypeDoc 从 TypeScript 类型自动生成 API 文档
3. **版本管理**：VitePress 支持文档版本切换
4. **搜索增强**：接入 Algolia DocSearch
5. **代码沙箱**：集成 StackBlitz 或 CodeSandbox 在线编辑

---

## ✅ 总结

在 stock-sdk 项目中集成 VitePress 文档网站是**完全可行**的：

- ✅ 技术方案成熟，有大量开源项目采用
- ✅ 与现有构建流程完全隔离
- ✅ NPM 发包不受任何影响
- ✅ Playground 可无缝集成
- ✅ 实施成本低（约 7 小时）
- ✅ 维护成本低（Markdown 即文档）

**建议立即开始实施**，可以显著提升项目的专业度和用户体验。

