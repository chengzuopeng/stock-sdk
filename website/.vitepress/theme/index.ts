import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Playground from './components/Playground.vue'
import './custom.css'
import { initFaro } from './faro'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 注册全局组件
    app.component('Playground', Playground)

    // 初始化 Grafana Faro 监控
    initFaro()
  },
} satisfies Theme

