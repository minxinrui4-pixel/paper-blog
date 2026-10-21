<script setup>
import Icon from './Icon.vue'
import Art from './Art.vue'
import AssetImage from './AssetImage.vue'
import { date } from '../lib/content'
defineProps({ post: Object })
</script>
<template>
  <article class="post-card card">
    <RouterLink :to="`/posts/${post.id}`" class="post-cover" :aria-label="`阅读：${post.title}`"
      ><AssetImage v-if="post.coverId" :id="post.coverId" :alt="post.title" /><Art
        v-else
        :kind="post.art"
    /></RouterLink>
    <div class="post-content">
      <span
        class="category-pill"
        :class="{ green: post.category === '技术笔记', orange: post.category === '旅行记录' }"
        >{{ post.category }}</span
      ><RouterLink :to="`/posts/${post.id}`"
        ><h2>{{ post.title }}</h2></RouterLink
      >
      <p class="post-summary">{{ post.summary }}</p>
      <div class="post-meta">
        <span><Icon name="CalendarDays" :size="14" />{{ date(post.createdAt) }}</span
        ><span><Icon name="Eye" :size="15" />{{ post.views }}</span
        ><RouterLink :to="`/posts/${post.id}`" class="read-link"
          >阅读全文 <Icon name="ArrowUpRight" :size="15"
        /></RouterLink>
      </div>
      <div class="post-tags">
        <span v-for="tag in post.tags" :key="tag"># {{ tag }}</span>
      </div>
    </div>
  </article>
</template>
