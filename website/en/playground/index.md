---
layout: page
title: Playground
---

<script setup>
import Playground from '../../.vitepress/theme/components/Playground.vue'
import { onMounted, onUnmounted } from 'vue'

// Dynamically add body class for scoped styles
onMounted(() => {
  document.body.classList.add('playground-page')
})

onUnmounted(() => {
  document.body.classList.remove('playground-page')
})
</script>

<Playground />

<style>
/* ===== Playground page specific styles (scoped with body.playground-page) ===== */

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

/* Hide page footer */
body.playground-page .VPFooter {
  display: none !important;
}

body.playground-page footer {
  display: none !important;
}

/* Prevent page scrolling */
body.playground-page .VPContent {
  overflow: hidden !important;
}
</style>

