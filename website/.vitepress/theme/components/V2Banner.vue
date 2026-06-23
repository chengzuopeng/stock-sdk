<script setup lang="ts">
/**
 * V2Banner —— 全站顶部「升级到 v2」提示条。
 *
 * 背景：本站是封存的 v1 文档（sdkVersion 锁在 1.10.1），v2 文档站已上线，
 * 这条横幅引导访客前往 v2，并明确告知当前看到的是 v1。
 *
 * 机制（VitePress 官方公告栏模式）：
 *  - 横幅 position:fixed 占据视口顶部一条；
 *  - 把横幅实测高度写入 CSS 变量 --vp-layout-top-height，VitePress 默认主题会
 *    据此把固定导航 / 内容 / 侧边栏整体下移，互不遮挡（无需手改主题）。
 *
 * 可关闭：点 × 后写入 localStorage，后续访问不再出现；想重新弹出（例如 v2 有
 * 大更新需要再次提醒）时把 DISMISS_KEY 末尾的版本号 +1 即可。
 *
 * SSR 安全：服务端渲染阶段 visible=false（渲染空），仅在 onMounted（浏览器）里
 * 读 localStorage 决定是否展示，避免 hydration 不匹配。
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useData } from 'vitepress'

const V2_URL = 'https://stock-sdk.linkdiary.cn/'
// 末尾的 @1 是提示版本：将来想让已关闭过的用户再次看到，把它改成 @2 即可。
const DISMISS_KEY = 'stock-sdk-docs:v2-upgrade-notice@1'

const { lang } = useData()
const isEn = computed(() => lang.value.toLowerCase().startsWith('en'))

const t = computed(() =>
  isEn.value
    ? {
        badge: 'v2',
        text: 'Stock SDK v2 is out — you are viewing the v1 docs.',
        cta: 'Go to v2',
        close: 'Dismiss',
      }
    : {
        badge: 'v2',
        text: 'Stock SDK v2 已发布，当前为 v1 文档。',
        cta: '前往 v2 新版',
        close: '关闭提示',
      }
)

const visible = ref(false)
const bannerEl = ref<HTMLElement | null>(null)
let ro: ResizeObserver | null = null

/** 把横幅实测高度写进 --vp-layout-top-height，让 VitePress 给横幅腾出顶部空间。 */
function syncTopHeight() {
  if (!bannerEl.value) return
  const h = bannerEl.value.offsetHeight
  document.documentElement.style.setProperty('--vp-layout-top-height', `${h}px`)
}

function clearTopHeight() {
  document.documentElement.style.setProperty('--vp-layout-top-height', '0px')
}

function dismiss() {
  visible.value = false
  clearTopHeight()
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* localStorage 不可用（隐私模式等）时静默：本次会话内关闭即可 */
  }
}

onMounted(() => {
  let dismissed = false
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    /* 读不到就当未关闭，正常展示 */
  }
  if (dismissed) return

  visible.value = true
  nextTick(() => {
    syncTopHeight()
    // 文字在窄屏可能折行导致高度变化，用 ResizeObserver 持续校正。
    if (typeof ResizeObserver !== 'undefined' && bannerEl.value) {
      ro = new ResizeObserver(syncTopHeight)
      ro.observe(bannerEl.value)
    }
  })
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  if (visible.value) clearTopHeight()
})
</script>

<template>
  <div v-if="visible" ref="bannerEl" class="v2-banner" role="region" aria-label="version notice">
    <div class="v2-banner__inner">
      <span class="v2-banner__badge">{{ t.badge }}</span>
      <span class="v2-banner__text">{{ t.text }}</span>
      <a class="v2-banner__cta" :href="V2_URL" target="_blank" rel="noreferrer">
        {{ t.cta }}
        <span class="v2-banner__arrow" aria-hidden="true">→</span>
      </a>
    </div>
    <button class="v2-banner__close" type="button" :aria-label="t.close" :title="t.close" @click="dismiss">
      <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
        <path
          d="M1 1l9 9M10 1L1 10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          fill="none"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.v2-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  /* 高于固定导航，确保横幅始终压在最上层；导航已被 --vp-layout-top-height 下移 */
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 40px;
  padding: 7px 52px 7px 20px; /* 右侧多留出 × 的空间 */
  font-family: var(--font-display, inherit);
  /* 磨砂玻璃 + 品牌暖色微染，呼应导航栏与首页背景 */
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--vp-c-brand-soft) 70%, var(--vp-c-bg)),
    color-mix(in srgb, var(--vp-c-bg) 78%, transparent)
  );
  backdrop-filter: blur(14px) saturate(180%);
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  border-bottom: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 32%, var(--vp-c-divider));
  box-shadow: 0 2px 16px -10px var(--glow-color, rgba(248, 113, 113, 0.3));
}

.v2-banner__inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 12px;
  max-width: 1100px;
  line-height: 1.4;
}

/* mono 渐变「v2」徽标，复用 hero 的 accent gradient 语言 */
.v2-banner__badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
  background: var(--accent-gradient, linear-gradient(135deg, #f87171 0%, #fb923c 100%));
  border-radius: 999px;
  box-shadow: 0 2px 10px -3px var(--glow-color, rgba(248, 113, 113, 0.4));
}

.v2-banner__text {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.v2-banner__cta {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.84rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--vp-c-brand-2);
  transition: color 0.2s;
}
.v2-banner__cta:hover {
  color: var(--vp-c-brand-1);
}
.v2-banner__arrow {
  font-family: var(--font-mono, monospace);
}

.v2-banner__close {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  color: var(--vp-c-text-2);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}
.v2-banner__close:hover {
  color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-soft) 60%, transparent);
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
}

/* 窄屏：缩字号、行内紧凑，× 仍固定在右上 */
@media (max-width: 640px) {
  .v2-banner {
    padding: 6px 44px 6px 14px;
  }
  .v2-banner__inner {
    gap: 6px 8px;
  }
  .v2-banner__text {
    font-size: 0.78rem;
  }
  .v2-banner__cta {
    font-size: 0.78rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .v2-banner__cta,
  .v2-banner__arrow,
  .v2-banner__close {
    transition: none;
  }
}
</style>
