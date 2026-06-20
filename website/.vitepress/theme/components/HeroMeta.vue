<script setup lang="ts">
/**
 * HeroMeta —— Hero 标语下方、按钮上方的一行 metadata 徽章。
 *
 * 原则：不造假。
 * - 版本号来自构建期注入的 themeConfig.sdkVersion（真实，读自 package.json）
 * - 「MIT」「零依赖」是确定事实，静态展示
 * - Star 数 / npm 周下载量实时 fetch；拿不到就不显示该徽章（绝不编造数字）
 */
import { ref, computed, onMounted } from 'vue'
import { useData } from 'vitepress'

const { theme, lang } = useData()
const isEn = computed(() => lang.value.toLowerCase().startsWith('en'))

const version = computed(() => (theme.value as any).sdkVersion as string | undefined)
const stars = ref<number | null>(null)
const downloads = ref<number | null>(null)

const labels = computed(() =>
  isEn.value
    ? { deps: 'Zero deps', week: '/wk', stars: 'stars' }
    : { deps: '零依赖', week: ' /周', stars: 'star' }
)

function abbr(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k'
  return String(n)
}

onMounted(async () => {
  // GitHub stars —— api.github.com 开放 CORS
  try {
    const r = await fetch('https://api.github.com/repos/chengzuopeng/stock-sdk')
    if (r.ok) {
      const j = await r.json()
      if (typeof j.stargazers_count === 'number') stars.value = j.stargazers_count
    }
  } catch {
    /* 静默：拿不到就不显示 */
  }
  // npm 周下载量 —— api.npmjs.org 开放 CORS
  try {
    const r = await fetch('https://api.npmjs.org/downloads/point/last-week/stock-sdk')
    if (r.ok) {
      const j = await r.json()
      if (typeof j.downloads === 'number') downloads.value = j.downloads
    }
  } catch {
    /* 静默 */
  }
})
</script>

<template>
  <div class="hero-meta">
    <span v-if="version" class="hero-meta__item hero-meta__item--version">
      v{{ version }}
    </span>

    <a
      v-if="stars !== null"
      class="hero-meta__item"
      href="https://github.com/chengzuopeng/stock-sdk"
      target="_blank"
      rel="noreferrer"
    >
      <span class="hero-meta__icon">★</span>
      <span class="hero-meta__num">{{ abbr(stars) }}</span>
      {{ labels.stars }}
    </a>

    <a
      v-if="downloads !== null"
      class="hero-meta__item"
      href="https://www.npmjs.com/package/stock-sdk"
      target="_blank"
      rel="noreferrer"
    >
      <span class="hero-meta__icon">↓</span>
      <span class="hero-meta__num">{{ abbr(downloads) }}</span>{{ labels.week }}
    </a>

    <span class="hero-meta__item">MIT</span>
    <span class="hero-meta__item">{{ labels.deps }}</span>
  </div>
</template>
