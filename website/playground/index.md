---
layout: page
title: Playground
---

<script setup>
import Playground from '../.vitepress/theme/components/Playground.vue'
import { onMounted, onUnmounted } from 'vue'

// 动态添加 body 类名，用于限定样式作用范围
onMounted(() => {
  document.body.classList.add('playground-page')
})

onUnmounted(() => {
  document.body.classList.remove('playground-page')
})
</script>

<Playground />

<style>
/* ===== Playground 页面专属样式（使用 body.playground-page 限定作用范围） ===== */

/* 隐藏默认的页面标题和导航 */
body.playground-page .VPDoc {
  padding: 0 !important;
}

body.playground-page .VPDoc .container {
  max-width: 100% !important;
}

body.playground-page .VPDoc .content {
  padding: 0 !important;
}

/* 全宽展示 */
body.playground-page .vp-doc {
  padding: 0 !important;
}

/* 隐藏侧边栏 */
body.playground-page .VPSidebar {
  display: none !important;
}

body.playground-page .VPContent.has-sidebar {
  padding-left: 0 !important;
}

/* 导航栏撑满宽度 */
body.playground-page .VPNavBar .wrapper {
  max-width: 100% !important;
  padding-left: 24px !important;
  padding-right: 24px !important;
}

body.playground-page .VPNavBar .container {
  max-width: 100% !important;
}

/* 隐藏页面底部 footer */
body.playground-page .VPFooter {
  display: none !important;
}

body.playground-page footer {
  display: none !important;
}

/* 防止页面整体滚动 */
body.playground-page .VPContent {
  overflow: hidden !important;
}
</style>
