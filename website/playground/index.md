---
layout: page
title: Playground
---

<script setup>
import Playground from '../.vitepress/theme/components/Playground.vue'
</script>

<Playground />

<style>
/* 隐藏默认的页面标题和导航 */
.VPDoc {
  padding: 0 !important;
}

.VPDoc .container {
  max-width: 100% !important;
}

.VPDoc .content {
  padding: 0 !important;
}

/* 全宽展示 */
.vp-doc {
  padding: 0 !important;
}

/* 隐藏侧边栏 */
.VPSidebar {
  display: none !important;
}

.VPContent.has-sidebar {
  padding-left: 0 !important;
}
</style>

