<script setup>
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import AssetImage from './AssetImage.vue'
import ArticleBody from './ArticleBody.vue'
import { date, plain, assetIds } from '../lib/content'
const props = defineProps({ post: Object })
const expanded = ref(false)
const hasCover = computed(() => Boolean(props.post.coverId))
const text = computed(() => plain(props.post.html || ''))
const hasMore = computed(
  () => text.value.length > 100 || assetIds(props.post.html || '').length > 0,
)
const excerpt = computed(() => text.value.slice(0, 100))
</script>
<template>
  <article class="post-card card" :class="{ 'text-post': !hasCover, 'is-expanded': expanded }">
    <RouterLink
      v-if="hasCover"
      :to="`/posts/${post.id}`"
      class="post-cover"
      :aria-label="`阅读：${post.title}`"
      ><AssetImage :id="post.coverId" :alt="post.title"
    /></RouterLink>
    <div class="post-content">
      <span
        class="category-pill"
        :class="{ green: post.category === '技术笔记', orange: post.category === '旅行记录' }"
        >{{ post.category }}</span
      ><RouterLink :to="`/posts/${post.id}`"
        ><h2>{{ post.title }}</h2></RouterLink
      >
      <div :id="`post-body-${post.id}`" class="post-excerpt">
        <ArticleBody v-if="expanded" :html="post.html" />
        <p v-else class="post-summary">{{ excerpt }}{{ text.length > 100 ? '…' : '' }}</p>
      </div>
      <button
        v-if="hasMore"
        class="expand-post"
        :aria-expanded="expanded"
        :aria-controls="`post-body-${post.id}`"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起正文' : '展开全文'
        }}<Icon :name="expanded ? 'ChevronUp' : 'ChevronDown'" :size="15" />
      </button>
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
