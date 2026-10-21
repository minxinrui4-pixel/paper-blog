<script setup>
import { computed, reactive, ref, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import Icon from '../components/Icon.vue'
import { settings, saveSettings, imageData, backgroundOptions } from '../lib/settings'
import { categories, posts, addCategory, renameCategory } from '../lib/store'
import { confirmAction } from '../lib/confirm'

const form = reactive({ ...settings.value })
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(settings.value))
const error = ref('')
const success = ref('')
const uploading = ref(false)
const newCategory = ref('')
const categoryEdits = reactive({})
const categoryError = ref('')
const categorySuccess = ref('')
const categoryCount = (name) => posts.value.filter((p) => p.category === name).length
function jump(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function removeBackground() {
  form.backgroundImage = ''
  form.background = 'blowfish'
}
function save() {
  error.value = ''
  success.value = ''
  try {
    saveSettings(form)
    Object.assign(form, settings.value)
    success.value = '设置已保存，刷新页面后也会保留。'
  } catch (e) {
    error.value =
      e.name === 'QuotaExceededError'
        ? '本地存储空间不足，请换一张更小的图片再保存。'
        : e.message || '保存失败，请检查浏览器存储设置。'
  }
}
async function upload(event, kind) {
  const file = event.target.files?.[0]
  if (!file) return
  uploading.value = true
  error.value = ''
  success.value = ''
  try {
    const data = await imageData(file, kind)
    if (kind === 'avatar') form.avatar = data
    else {
      form.backgroundImage = data
      form.background = 'custom'
    }
  } catch (e) {
    error.value = e.message || '图片处理失败，请重试。'
  } finally {
    uploading.value = false
    event.target.value = ''
  }
}
function createCategory() {
  categoryError.value = ''
  categorySuccess.value = ''
  try {
    addCategory(newCategory.value)
    categorySuccess.value = `已新增「${newCategory.value.trim()}」，现在可以在写作区使用。`
    newCategory.value = ''
  } catch (e) {
    categoryError.value =
      e.name === 'QuotaExceededError' ? '保存失败，本地存储空间不足。' : e.message
  }
}
function rename(name) {
  categoryError.value = ''
  categorySuccess.value = ''
  try {
    const value = categoryEdits[name] ?? name
    renameCategory(name, value)
    delete categoryEdits[name]
    categorySuccess.value = `「${name}」已更新为「${value.trim()}」，相关文章和草稿已同步更新。`
  } catch (e) {
    categoryError.value =
      e.name === 'QuotaExceededError' ? '保存失败，本地存储空间不足。' : e.message
  }
}
onBeforeRouteLeave(async () => {
  if (uploading.value) {
    error.value = '图片正在处理，请稍候。'
    return false
  }
  return (
    !dirty.value ||
    (await confirmAction('设置还未保存，离开将丢弃本次修改。', {
      title: '离开设置？',
      action: '放弃修改',
    }))
  )
})
function beforeUnload(event) {
  if (dirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <div class="settings-layout">
    <header class="page-heading settings-heading">
      <div>
        <div class="eyebrow">MAKE IT YOUR OWN</div>
        <h1>让纸间，更像你。</h1>
        <p>你的名字、你的风格，还有你想分享的世界。</p>
      </div>
      <button class="button primary" :disabled="uploading || !dirty" @click="save">
        <Icon name="Check" :size="17" />保存设置
      </button>
    </header>
    <nav class="settings-jump" aria-label="设置分区">
      <a href="#profile" @click.prevent="jump('profile')"
        ><Icon name="UserRound" :size="16" />作者资料</a
      ><a href="#categories" @click.prevent="jump('categories')"
        ><Icon name="Hash" :size="16" />文章分类</a
      ><a href="#appearance" @click.prevent="jump('appearance')"
        ><Icon name="Palette" :size="16" />背景风格</a
      ><a href="#links" @click.prevent="jump('links')"
        ><Icon name="ExternalLink" :size="16" />社交链接</a
      >
    </nav>
    <p v-if="error" class="error settings-feedback" role="alert">{{ error }}</p>
    <p v-if="success" class="success-message settings-feedback" role="status">
      <Icon name="Check" :size="16" />{{ success }}
    </p>

    <section id="profile" class="card settings-section">
      <div class="settings-section-title">
        <span class="settings-icon"><Icon name="UserRound" /></span>
        <div>
          <h2>作者资料</h2>
          <p>在首页和侧栏，向读者介绍自己。</p>
        </div>
      </div>
      <div class="profile-settings">
        <div class="avatar-settings">
          <div class="avatar-preview">
            <img v-if="form.avatar" :src="form.avatar" alt="作者头像预览" /><span v-else>{{
              [...form.name][0] || '你'
            }}</span>
          </div>
          <label class="button secondary upload-label"
            ><Icon name="Image" :size="15" />更换头像<input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              :disabled="uploading"
              @change="upload($event, 'avatar')" /></label
          ><button v-if="form.avatar" class="text-button" @click="form.avatar = ''">
            使用文字头像
          </button>
        </div>
        <div class="settings-fields">
          <label
            >作者名字<input
              v-model="form.name"
              maxlength="30"
              placeholder="你希望大家如何称呼你"
              autocomplete="nickname" /></label
          ><label
            >个人简介<textarea
              v-model="form.bio"
              maxlength="200"
              rows="3"
              placeholder="分享你的兴趣、生活或一句喜欢的话"
            ></textarea></label
          ><label
            >所在地<input
              v-model="form.location"
              maxlength="40"
              placeholder="例如：中国 · 杭州（可留空）"
          /></label>
        </div>
      </div>
    </section>

    <section id="categories" class="card settings-section">
      <div class="settings-section-title">
        <span class="settings-icon"><Icon name="Hash" /></span>
        <div>
          <h2>文章分类</h2>
          <p>分类独立保存；改名会同步更新相关文章和首页草稿。</p>
        </div>
        <span class="settings-counter">{{ categories.length }} 个分类</span>
      </div>
      <div class="category-manager">
        <form
          v-for="name in categories"
          :key="name"
          class="category-edit-row"
          @submit.prevent="rename(name)"
        >
          <Icon name="Hash" :size="16" /><input
            :value="categoryEdits[name] ?? name"
            @input="categoryEdits[name] = $event.target.value"
            :aria-label="`分类名称：${name}`"
            maxlength="20"
          /><span>{{ categoryCount(name) }} 篇</span
          ><button
            class="button secondary"
            :disabled="(categoryEdits[name] ?? name).trim() === name"
            type="submit"
          >
            保存名称
          </button>
        </form>
      </div>
      <form class="category-add" @submit.prevent="createCategory">
        <label class="sr-only" for="new-category">新分类名称</label
        ><input
          id="new-category"
          v-model="newCategory"
          placeholder="新分类名称，例如：摄影手记"
          maxlength="20"
        /><button class="button primary" type="submit">
          <Icon name="Plus" :size="16" />新增分类
        </button>
      </form>
      <p v-if="categoryError" class="error" role="alert">{{ categoryError }}</p>
      <p v-if="categorySuccess" class="settings-inline-success" role="status">
        {{ categorySuccess }}
      </p>
      <p class="settings-hint">
        分类操作即时保存；新增后可直接在写作区选择，也会显示在导航与筛选中。
      </p>
    </section>

    <section id="appearance" class="card settings-section">
      <div class="settings-section-title">
        <span class="settings-icon"><Icon name="Palette" /></span>
        <div>
          <h2>背景风格</h2>
          <p>为文字选一个喜欢的底色，搭配侧栏的深浅模式使用。</p>
        </div>
      </div>
      <div class="background-options">
        <button
          v-for="option in backgroundOptions"
          :key="option.id"
          class="background-option"
          :class="{ selected: form.background === option.id }"
          :aria-pressed="form.background === option.id"
          @click="form.background = option.id"
        >
          <span
            class="background-swatch"
            :class="`swatch-${option.id}`"
            :style="
              option.id === 'custom' && form.backgroundImage
                ? { backgroundImage: `url(${form.backgroundImage})` }
                : {}
            "
            ><Icon v-if="form.background === option.id" name="Check" :size="20" /><Icon
              v-else-if="option.id === 'custom' && !form.backgroundImage"
              name="Image"
              :size="26" /></span
          ><strong>{{ option.name }}</strong
          ><small>{{ option.description }}</small>
        </button>
      </div>
      <div v-if="form.background === 'custom'" class="custom-background">
        <label class="button secondary upload-label"
          ><Icon name="Image" :size="16" />{{
            form.backgroundImage ? '更换背景图片' : '上传背景图片'
          }}<input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            :disabled="uploading"
            @change="upload($event, 'background')" /></label
        ><button
          v-if="form.backgroundImage"
          class="text-button"
          @click="removeBackground"
        >
          移除自定义背景
        </button>
      </div>
      <div
        class="appearance-preview"
        :class="`preview-${form.background}`"
        :style="
          form.background === 'custom' && form.backgroundImage
            ? {
                backgroundImage: `linear-gradient(0deg, #061126a6, #06112630), url(${form.backgroundImage})`,
              }
            : {}
        "
      >
        <div>
          <span>风格预览</span>
          <h3>把热爱留在这里。</h3>
          <p>{{ form.name || '你的名字' }} 的数字花园</p>
        </div>
      </div>
      <p class="settings-hint">
        图片支持 JPG、PNG、WebP，最大 10 MB，会自动压缩。星海流光背景来自
        <a href="https://blowfish.page/zh-cn/" target="_blank" rel="noopener noreferrer">Blowfish</a
        >，已保存在项目本地。
      </p>
    </section>

    <section id="links" class="card settings-section">
      <div class="settings-section-title">
        <span class="settings-icon"><Icon name="ExternalLink" /></span>
        <div>
          <h2>社交链接</h2>
          <p>点击首页或导航中的图标，在新窗口打开。</p>
        </div>
      </div>
      <div class="settings-fields">
        <label
          ><span><Icon name="Github" :size="16" /> GitHub</span
          ><input
            v-model="form.github"
            type="url"
            placeholder="https://github.com/你的用户名" /></label
        ><label
          ><span><Icon name="MessageCircle" :size="16" /> ChatGPT</span
          ><input v-model="form.chatgpt" type="url" placeholder="https://chatgpt.com/"
        /></label>
      </div>
    </section>
    <footer class="settings-save-bar">
      <p>{{ uploading ? '正在处理图片…' : dirty ? '有尚未保存的设置' : '所有设置已保存' }}</p>
      <button class="button primary" :disabled="uploading || !dirty" @click="save">
        <Icon name="Check" :size="16" />保存设置
      </button>
    </footer>
  </div>
</template>
