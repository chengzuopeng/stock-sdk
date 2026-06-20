<script setup lang="ts">
/**
 * HeroLinks —— Hero 主按钮下方的一行次级 inline 链接。
 * 主按钮留给「快速开始 / 在线体验」，文档与外链走这里，层级更轻。
 */
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

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
        { text: 'MCP · AI', link: '/en/mcp/' },
        { text: 'Migrate from v1', link: '/en/guide/migration-v1-to-v2' },
        { text: 'GitHub ↗', link: 'https://github.com/chengzuopeng/stock-sdk', external: true },
      ]
    : [
        { text: 'API 文档', link: '/api/' },
        { text: 'MCP · AI 接入', link: '/mcp/' },
        { text: '从 v1 迁移', link: '/guide/migration-v1-to-v2' },
        { text: 'GitHub ↗', link: 'https://github.com/chengzuopeng/stock-sdk', external: true },
      ]
)

function href(l: HeroLink): string {
  return l.external ? l.link : withBase(l.link)
}
</script>

<template>
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
