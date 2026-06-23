<script setup lang="ts">
/**
 * 自定义 Layout：在 VitePress 默认主题外包一层。
 *
 * 首页 hero 具名插槽（仅首页 hero 生效，其它页面零影响）：
 *   - home-hero-info-after  → HeroMeta（版本 / star / 下载量 / MIT / 零依赖徽章）
 *   - home-hero-image       → LiveTicker（替换浮动 logo 的实时行情终端卡片）
 *   - home-hero-actions-after → 次级 inline 链接（API / MCP / GitHub）
 *
 * 全站插槽：
 *   - layout-top    → V2Banner（顶部「升级到 v2」提示条，可关闭，每个页面都有）
 *   - layout-bottom → ChatBot（右下角悬浮文档问答助手，每个页面都有）
 */
import DefaultTheme from 'vitepress/theme'
import { useData, withBase } from 'vitepress'
import { computed } from 'vue'
import LiveTicker from './components/LiveTicker.vue'
import HeroMeta from './components/HeroMeta.vue'
import V2Banner from './components/V2Banner.vue'
// 暂时关闭全站悬浮 AI 问答助手入口；恢复时取消本行与下方 layout-bottom 插槽的注释即可
// import ChatBot from './components/chat/ChatBot.vue'

const { Layout } = DefaultTheme
const { lang } = useData()
const isEn = computed(() => lang.value.toLowerCase().startsWith('en'))

interface HeroLink {
  text: string
  link: string
  external?: boolean
}

const links = computed<HeroLink[]>(() =>
  isEn.value
    ? [
        { text: 'API Docs', link: '/en/api/' },
        { text: 'AI / MCP', link: '/en/mcp/' },
        { text: 'GitHub ↗', link: 'https://github.com/chengzuopeng/stock-sdk', external: true },
      ]
    : [
        { text: 'API 文档', link: '/api/' },
        { text: 'AI / MCP 接入', link: '/mcp/' },
        { text: 'GitHub ↗', link: 'https://github.com/chengzuopeng/stock-sdk', external: true },
      ]
)

function href(l: HeroLink): string {
  return l.external ? l.link : withBase(l.link)
}
</script>

<template>
  <Layout>
    <!-- 全站顶部「升级到 v2」提示条（可关闭） -->
    <template #layout-top>
      <V2Banner />
    </template>

    <template #home-hero-info-after>
      <HeroMeta />
    </template>

    <template #home-hero-image>
      <LiveTicker />
    </template>

    <template #home-hero-actions-after>
      <div class="hero-links">
        <template v-for="(l, i) in links" :key="l.link">
          <span v-if="i" class="sep" aria-hidden="true"></span>
          <a
            :href="href(l)"
            :target="l.external ? '_blank' : undefined"
            :rel="l.external ? 'noreferrer' : undefined"
          >{{ l.text }}</a>
        </template>
      </div>
    </template>

    <!-- 全站悬浮文档问答助手（暂时关闭，恢复时取消注释并放开上方 import） -->
    <!--
    <template #layout-bottom>
      <ChatBot />
    </template>
    -->

  </Layout>
</template>
