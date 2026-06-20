---
layout: page
title: Playground
---

<script setup>
import Playground from '../../.vitepress/theme/components/Playground.vue'
import { onMounted, onUnmounted } from 'vue'

// Scope page-level styles via a body class
onMounted(() => {
  document.body.classList.add('playground-page')
})

onUnmounted(() => {
  document.body.classList.remove('playground-page')
})
</script>

<Playground />

<style>
/* ===== Playground page-level styles (scoped via body.playground-page) ===== */

body.playground-page .VPDoc {
  padding: 0 !important;
}

body.playground-page .VPDoc .container {
  max-width: 100% !important;
}

body.playground-page .VPDoc .content {
  padding: 0 !important;
}

body.playground-page .vp-doc {
  padding: 0 !important;
}

body.playground-page .VPSidebar {
  display: none !important;
}

body.playground-page .VPContent.has-sidebar {
  padding-left: 0 !important;
}

body.playground-page .VPNavBar .wrapper {
  max-width: 100% !important;
  padding-left: 24px !important;
  padding-right: 24px !important;
}

body.playground-page .VPNavBar .container {
  max-width: 100% !important;
}

body.playground-page .VPFooter,
body.playground-page footer {
  display: none !important;
}

body.playground-page .VPContent {
  overflow: hidden !important;
}
</style>
