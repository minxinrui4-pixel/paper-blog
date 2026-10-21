<script setup>
import { ref, watch, nextTick } from 'vue'
import { clean } from '../lib/content'
import { assetUrl } from '../lib/assets'
const props = defineProps({ html: String })
const root = ref(null)
watch(
  () => props.html,
  async () => {
    await nextTick()
    const el = root.value
    if (!el) return
    for (const img of el.querySelectorAll('img[data-asset-id]')) {
      try {
        const url = await assetUrl(img.dataset.assetId)
        if (url) img.src = url
        else img.alt = '图片已丢失'
      } catch {
        img.alt = '图片读取失败'
      }
    }
  },
  { immediate: true, flush: 'post' },
)
</script>
<template><div ref="root" class="prose" v-html="clean(html || '')"></div></template>
