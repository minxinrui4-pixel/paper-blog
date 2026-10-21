<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { findPost, deletePost, visitPost } from '../lib/store'
import { date, fileSize, plain } from '../lib/content'
import { assetUrl } from '../lib/assets'
import { confirmAction } from '../lib/confirm'
import ArticleBody from '../components/ArticleBody.vue'
import AssetImage from '../components/AssetImage.vue'
import Art from '../components/Art.vue'
import Icon from '../components/Icon.vue'
const route = useRoute()
const router = useRouter()
const post = computed(() => findPost(route.params.id))
const error = ref('')
watch(
  () => route.params.id,
  (id) => visitPost(id),
  { immediate: true },
)
async function remove() {
  if (
    !(await confirmAction(`确定删除「${post.value.title}」吗？删除后无法恢复。`, {
      title: '删除文章？',
      action: '确认删除',
      danger: true,
    }))
  )
    return
  try {
    await deletePost(post.value.id)
    router.push('/')
  } catch {
    error.value = '删除失败，原文章已保留，请检查存储空间。'
  }
}
async function download(a) {
  try {
    const url = await assetUrl(a.id)
    if (!url) throw Error()
    const link = document.createElement('a')
    link.href = url
    link.download = a.name
    link.click()
  } catch {
    error.value = '附件无法读取，可能已被浏览器清理。'
  }
}
</script>
<template>
  <div class="reading-layout">
    <RouterLink to="/" class="back-link"
      ><Icon name="ArrowLeft" :size="16" />返回所有文章</RouterLink
    >
    <article v-if="post" class="detail-card card">
      <div class="detail-cover">
        <AssetImage v-if="post.coverId" :id="post.coverId" :alt="post.title" /><Art
          v-else
          :kind="post.art"
        />
      </div>
      <div class="detail-content">
        <div class="detail-top">
          <span class="category-pill">{{ post.category }}</span>
          <div class="button-row">
            <RouterLink :to="`/posts/${post.id}/edit`" class="button secondary"
              ><Icon name="PencilLine" :size="15" />编辑文章</RouterLink
            ><button
              class="icon-button danger"
              aria-label="删除文章"
              title="删除文章"
              @click="remove"
            >
              <Icon name="Trash2" :size="17" />
            </button>
          </div>
        </div>
        <h1>{{ post.title }}</h1>
        <div class="post-meta detail-meta">
          <span><Icon name="CalendarDays" :size="15" />{{ date(post.createdAt) }}</span
          ><span><Icon name="Eye" :size="15" />{{ post.views }} 次阅读</span
          ><span
            ><Icon name="Clock3" :size="15" />约
            {{ Math.max(1, Math.ceil(plain(post.html).length / 400)) }} 分钟</span
          >
        </div>
        <div class="post-tags detail-tags">
          <RouterLink v-for="t in post.tags" :key="t" :to="{ path: '/', query: { tag: t } }"
            ># {{ t }}</RouterLink
          >
        </div>
        <ArticleBody :html="post.html" />
        <section v-if="post.attachments.length" class="detail-attachments">
          <h2><Icon name="Paperclip" :size="19" />文章附件</h2>
          <button v-for="a in post.attachments" :key="a.id" @click="download(a)">
            <Icon name="FileText" :size="21" /><span
              >{{ a.name }}<small>{{ fileSize(a.size) }}</small></span
            ><Icon name="Download" :size="18" />
          </button>
        </section>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <footer class="article-footer">
          <span>最后修改于 {{ date(post.updatedAt) }}</span
          ><span>记录思考，收藏日常。 ✦</span>
        </footer>
      </div>
    </article>
    <section v-else class="empty-state card">
      <Icon name="BookOpen" :size="40" />
      <h1>这篇文章不在这里了</h1>
      <p>文章可能已被删除，或链接地址有误。</p>
      <RouterLink to="/" class="button primary">回到首页</RouterLink>
    </section>
  </div>
</template>
