import DefaultTheme from 'vitepress/theme'
import { defineComponent, h, onMounted, onBeforeUnmount } from 'vue'
import HeroMeta from './components/HeroMeta.vue'
import HeroLinks from './components/HeroLinks.vue'
import LiveTicker from './components/LiveTicker.vue'
import { initFaro } from './faro'
import './custom.css'

// v2 主题：基于 VitePress 默认主题，差异化样式集中在 custom.css。
//
// Layout 包了一层，两个职责：
// 1. 把页面滚动比例写入根元素的 --scroll-progress，custom.css 用它在导航栏
//    底部画"红→金"滚动进度线。SSR 安全：仅在 onMounted（纯客户端）里挂监听。
// 2. 注入首页 hero 具名插槽（仅首页 hero 生效，其它页面零影响）：
//    - home-hero-info-after    → HeroMeta（版本 / star / 下载量 / MIT / 零依赖徽章）
//    - home-hero-image         → LiveTicker（替换浮动 logo 的实时行情终端卡片）
//    - home-hero-actions-after → HeroLinks（API / MCP / 迁移 / GitHub 次级链接）
const Layout = defineComponent({
  name: 'StockSdkV2Layout',
  setup() {
    let update: (() => void) | null = null

    onMounted(() => {
      const root = document.documentElement
      update = () => {
        const max = root.scrollHeight - root.clientHeight
        const ratio = max > 0 ? root.scrollTop / max : 0
        root.style.setProperty('--scroll-progress', ratio.toFixed(4))
      }
      window.addEventListener('scroll', update, { passive: true })
      window.addEventListener('resize', update, { passive: true })
      update()
    })

    onBeforeUnmount(() => {
      if (update) {
        window.removeEventListener('scroll', update)
        window.removeEventListener('resize', update)
        update = null
      }
    })

    return () =>
      h(DefaultTheme.Layout, null, {
        'home-hero-info-after': () => h(HeroMeta),
        'home-hero-image': () => h(LiveTicker),
        'home-hero-actions-after': () => h(HeroLinks),
      })
  },
})

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ siteData }) {
    // 用站点真实版本号（config.ts 注入的 themeConfig.sdkVersion = package.json version）
    // 标记 Faro release，避免硬编码版本随发版漂移。
    initFaro((siteData.value.themeConfig as { sdkVersion?: string }).sdkVersion)
  },
}
