<script setup>
import { computed, reactive, ref } from 'vue'
import Icon from '../components/Icon.vue'
import {
  categories,
  posts,
  addCategory,
  renameCategory,
  deleteCategory,
  readDraft,
} from '../lib/store'
import { confirmAction } from '../lib/confirm'

const search = ref('')
const newCategory = ref('')
const edits = reactive({})
const error = ref('')
const success = ref('')
const filtered = computed(() =>
  categories.value.filter((name) => name.toLowerCase().includes(search.value.trim().toLowerCase())),
)
const count = (name) => posts.value.filter((p) => p.category === name).length
function update(action, message) {
  error.value = ''
  success.value = ''
  try {
    action()
    success.value = message
  } catch (e) {
    error.value =
      e.name === 'QuotaExceededError'
        ? '存储空间不足，分类未能保存。'
        : e.message || '保存失败，请重试。'
  }
}
function add() {
  update(() => {
    addCategory(newCategory.value)
    newCategory.value = ''
    search.value = ''
  }, '新分类已添加，现在可以在写作区使用。')
}
function rename(name) {
  update(() => {
    renameCategory(name, edits[name] ?? name)
    delete edits[name]
  }, '分类已改名，相关文章和草稿已同步更新。')
}
async function remove(name) {
  const total = count(name)
  const hasDraft = readDraft()?.category === name
  if (
    !(await confirmAction(
      `确定删除「${name}」吗？${total ? `其中 ${total} 篇文章将移入「未分类」。` : ''}${hasDraft ? '首页草稿也将移入「未分类」。' : ''}文章和附件内容都会保留。`,
      { title: '删除分类？', action: '删除分类', danger: true },
    ))
  )
    return
  update(() => {
    deleteCategory(name)
    delete edits[name]
  }, '分类已删除，相关内容已移入「未分类」。')
}
</script>
<template>
  <div class="settings-layout categories-layout">
    <header class="page-heading">
      <div>
        <div class="eyebrow">A PLACE FOR EVERY STORY</div>
        <h1>整理灵感的不同方向。</h1>
        <p>共 {{ categories.length }} 个分类，在这里统一新增、改名和删除。</p>
      </div>
      <Icon name="Hash" :size="35" />
    </header>
    <section class="card settings-section">
      <div class="manage-toolbar">
        <h2>文章分类</h2>
        <div class="search-box">
          <Icon name="Search" :size="17" /><input
            v-model="search"
            type="search"
            placeholder="搜索分类…"
            aria-label="搜索分类"
          />
        </div>
      </div>
      <form class="category-add" @submit.prevent="add">
        <label class="sr-only" for="new-category">新分类名称</label
        ><input
          id="new-category"
          v-model="newCategory"
          maxlength="20"
          placeholder="新分类名称，例如：摄影手记"
        /><button class="button primary" type="submit">
          <Icon name="Plus" :size="16" />新增分类
        </button>
      </form>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="success" class="settings-inline-success" role="status">{{ success }}</p>
      <div class="category-manager">
        <form
          v-for="name in filtered"
          :key="name"
          class="category-edit-row"
          @submit.prevent="rename(name)"
        >
          <Icon name="Hash" :size="16" /><input
            :value="edits[name] ?? name"
            @input="edits[name] = $event.target.value"
            :aria-label="`分类名称：${name}`"
            maxlength="20"
            :disabled="name === '未分类'"
          />
          <RouterLink
            :to="{ path: '/', query: { category: name } }"
            class="category-count"
            :aria-label="`查看${name}分类的${count(name)}篇文章`"
            >{{ count(name) }} 篇</RouterLink
          >
          <button
            class="button secondary"
            type="submit"
            :disabled="name === '未分类' || (edits[name] ?? name).trim() === name"
          >
            保存名称</button
          ><button
            class="icon-button danger"
            type="button"
            :disabled="name === '未分类'"
            :aria-label="`删除分类：${name}`"
            :title="name === '未分类' ? '默认分类不能删除' : '删除分类'"
            @click="remove(name)"
          >
            <Icon name="Trash2" :size="17" />
          </button>
        </form>
      </div>
      <div v-if="!filtered.length" class="empty-state">
        <Icon name="Hash" :size="30" />
        <h3>没有匹配的分类</h3>
        <p>换个关键词，或添加新的分类。</p>
      </div>
      <p class="settings-hint">
        分类操作即时保存。删除分类会把文章和草稿移入「未分类」，不会删除文章或附件。「未分类」为系统保留分类。
      </p>
    </section>
  </div>
</template>
