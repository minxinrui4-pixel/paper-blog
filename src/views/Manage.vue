<script setup>
import { ref, computed } from 'vue'
import { posts, deletePost } from '../lib/store'
import { selectPosts, date } from '../lib/content'
import Icon from '../components/Icon.vue'
import { confirmAction } from '../lib/confirm'
const search = ref('')
const error = ref('')
const items = computed(
  () =>
    selectPosts(posts.value, { search: search.value, size: Math.max(1, posts.value.length) }).items,
)
async function remove(p) {
  if (
    !(await confirmAction(`确定删除「${p.title}」吗？删除后无法恢复。`, {
      title: '删除文章？',
      action: '确认删除',
      danger: true,
    }))
  )
    return
  try {
    await deletePost(p.id)
  } catch {
    error.value = '删除失败，请检查浏览器存储设置。'
  }
}
</script>
<template>
  <div class="manage-layout">
    <header class="page-heading">
      <div>
        <div class="eyebrow">YOUR WORDS, YOUR SPACE</div>
        <h1>整理你的每一份灵感。</h1>
        <p>共 {{ posts.length }} 篇文章，在这里管理你的记录。</p>
      </div>
      <RouterLink to="/" class="button primary"><Icon name="Plus" :size="16" />写新文章</RouterLink>
    </header>
    <section class="card manage-card">
      <div class="manage-toolbar">
        <h2>文章管理</h2>
        <div class="search-box">
          <Icon name="Search" :size="17" /><input
            v-model="search"
            aria-label="搜索管理文章"
            placeholder="搜索文章…"
            type="search"
          />
        </div>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>文章标题</th>
              <th>分类</th>
              <th>发布日期</th>
              <th>阅读</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in items" :key="p.id">
              <td>
                <RouterLink :to="`/posts/${p.id}`">{{ p.title }}</RouterLink
                ><small>{{ p.tags.map((t) => `# ${t}`).join('　') }}</small>
              </td>
              <td>
                <span class="category-pill">{{ p.category }}</span>
              </td>
              <td>{{ date(p.createdAt) }}</td>
              <td>{{ p.views }}</td>
              <td>
                <div class="button-row">
                  <RouterLink
                    :to="`/posts/${p.id}/edit`"
                    class="icon-button"
                    :aria-label="`编辑 ${p.title}`"
                    title="编辑"
                    ><Icon name="PencilLine" :size="17" /></RouterLink
                  ><button
                    class="icon-button danger"
                    :aria-label="`删除 ${p.title}`"
                    title="删除"
                    @click="remove(p)"
                  >
                    <Icon name="Trash2" :size="17" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!items.length" class="empty-state">
        <Icon name="FileText" :size="32" />
        <h3>{{ search ? '没有匹配的文章' : '还没有文章' }}</h3>
        <p>回到首页，写下你的第一份灵感。</p>
      </div>
    </section>
  </div>
</template>
