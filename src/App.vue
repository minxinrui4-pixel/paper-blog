<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './components/Icon.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import { posts, notice } from './lib/store'
const route = useRoute()
const menu = ref(false)
let savedTheme = ''
try {
  savedTheme = localStorage.getItem('paper-theme') || ''
} catch {}
const dark = ref(savedTheme === 'dark')
document.documentElement.classList.toggle('dark', dark.value)
function theme() {
  dark.value = !dark.value
  document.documentElement.classList.toggle('dark', dark.value)
  try {
    localStorage.setItem('paper-theme', dark.value ? 'dark' : 'light')
  } catch {
    notice.value = '主题暂时无法保存。'
  }
}
const tagCount = computed(() => new Set(posts.value.flatMap((p) => p.tags)).size)
</script>
<template>
  <ConfirmDialog />
  <div class="app-shell">
    <header class="mobile-header">
      <RouterLink to="/" class="brand">纸间<span>PAPER & THOUGHTS</span></RouterLink
      ><button aria-label="展开导航" @click="menu = !menu"><Icon name="Menu" /></button>
    </header>
    <aside class="left-sidebar" :class="{ 'is-open': menu }">
      <RouterLink to="/" class="brand">纸间<span>PAPER & THOUGHTS</span></RouterLink>
      <div class="profile">
        <div class="profile-portrait"><span>林</span><i>✦</i></div>
        <h2>林间来信</h2>
        <p>记录思考，收藏日常。<br />在自己的节奏里，慢慢生长。</p>
        <span class="location"><Icon name="MapPin" :size="13" />中国 · 杭州</span>
        <div class="profile-stats">
          <div>
            <strong>{{ posts.length }}</strong
            ><span>篇文章</span>
          </div>
          <div>
            <strong>{{ tagCount }}</strong
            ><span>个标签</span>
          </div>
          <div><strong>∞</strong><span>份热爱</span></div>
        </div>
      </div>
      <nav class="main-nav" aria-label="主导航">
        <RouterLink
          to="/"
          :class="{ selected: route.path === '/' && !route.query.category }"
          @click="menu = false"
          ><Icon name="Home" />首页<Icon
            class="nav-arrow"
            name="ChevronRight"
            :size="14" /></RouterLink
        ><RouterLink
          to="/?category=生活随笔"
          :class="{ selected: route.query.category === '生活随笔' }"
          @click="menu = false"
          ><Icon name="Coffee" />生活随笔</RouterLink
        ><RouterLink
          to="/?category=技术笔记"
          :class="{ selected: route.query.category === '技术笔记' }"
          @click="menu = false"
          ><Icon name="BookOpen" />技术笔记</RouterLink
        ><RouterLink
          to="/?category=旅行记录"
          :class="{ selected: route.query.category === '旅行记录' }"
          @click="menu = false"
          ><Icon name="MapPin" />旅行记录</RouterLink
        ><RouterLink
          to="/manage"
          :class="{ selected: route.path === '/manage' }"
          @click="menu = false"
          ><Icon name="LayoutList" />文章管理</RouterLink
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-quote">
          “把生活写成故事，<br />把日子过成诗。”<span>— 写给每一个热爱生活的你</span>
        </div>
        <button class="theme-button" @click="theme">
          <Icon :name="dark ? 'Sun' : 'Moon'" :size="17" />{{ dark ? '浅色模式' : '深色模式'
          }}<span class="theme-switch" :class="{ on: dark }"></span>
        </button>
        <div class="sidebar-footer">
          © 2026 纸间 · 用心记录<br /><span>Built with Vue 3 & a little love.</span>
        </div>
      </div>
    </aside>
    <main class="main-area">
      <div v-if="notice" class="global-notice" role="alert">
        {{ notice
        }}<button aria-label="关闭提示" @click="notice = ''"><Icon name="X" :size="16" /></button>
      </div>
      <RouterView :key="route.path" />
    </main>
  </div>
</template>
