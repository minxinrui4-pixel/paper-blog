<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { findPost } from '../lib/store'
import Editor from '../components/Editor.vue'
import Icon from '../components/Icon.vue'
const route = useRoute()
const router = useRouter()
const post = computed(() => findPost(route.params.id))
</script>
<template>
  <div class="reading-layout">
    <RouterLink :to="`/posts/${route.params.id}`" class="back-link"
      ><Icon name="ArrowLeft" :size="16" />返回文章</RouterLink
    >
    <header class="page-heading">
      <div>
        <div class="eyebrow">MAKE EVERY WORD COUNT</div>
        <h1>好文章，值得慢慢打磨。</h1>
        <p>修改内容、整理图片，让你的故事更完整。</p>
      </div>
    </header>
    <Editor
      v-if="post"
      :post="post"
      @saved="router.push(`/posts/${$event.id}`)"
      @cancel="router.push(`/posts/${post.id}`)"
    />
    <div v-else class="empty-state card">
      <h2>找不到这篇文章</h2>
      <RouterLink to="/" class="button primary">返回首页</RouterLink>
    </div>
  </div>
</template>
