<script setup>
import { ref, watch } from 'vue'
import { assetUrl } from '../lib/assets'
const props = defineProps({ id: String, alt: { type: String, default: '' } })
const src = ref('')
const failed = ref(false)
watch(
  () => props.id,
  async (id) => {
    src.value = ''
    failed.value = false
    try {
      const url = await assetUrl(id)
      if (props.id === id) {
        src.value = url
        failed.value = !url
      }
    } catch {
      failed.value = true
    }
  },
  { immediate: true },
)
</script>
<template>
  <img v-if="src" :src="src" :alt="alt" /><span v-else-if="failed" class="missing-image"
    >图片暂不可用</span
  >
</template>
