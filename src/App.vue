<script setup>
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './components/Icon.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import SocialLinks from './components/SocialLinks.vue'
import { posts, notice, categories } from './lib/store'
import { settings } from './lib/settings'
const route = useRoute()
const menu = ref(false)
let savedTheme = ''
try {
  savedTheme = localStorage.getItem('paper-theme') || ''
} catch {}
const dark = ref(savedTheme ? savedTheme === 'dark' : true)

watchEffect(() => {
  document.documentElement.dataset.background = settings.value.background
})
const backgroundStyle = computed(() =>
  settings.value.background === 'custom' && settings.value.backgroundImage
    ? { backgroundImage: `url("${settings.value.backgroundImage}")` }
    : {},
)
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
  <div class="site-backdrop" :style="backgroundStyle" aria-hidden="true"></div>
  <div class="app-shell">
    <header class="mobile-header">
      <RouterLink to="/" class="brand">纸间<span>PAPER & THOUGHTS</span></RouterLink>
      <div class="mobile-header-actions">
        <SocialLinks /><button
          aria-label="展开导航"
          :aria-expanded="menu"
          aria-controls="site-sidebar"
          @click="menu = !menu"
        >
          <Icon name="Menu" />
        </button>
      </div>
    </header>
    <button v-if="menu" class="menu-backdrop" aria-label="关闭导航" @click="menu = false"></button>
    <aside id="site-sidebar" class="left-sidebar" :class="{ 'is-open': menu }">
      <RouterLink to="/" class="brand">纸间<span>PAPER & THOUGHTS</span></RouterLink>
      <div class="profile">
        <RouterLink
          to="/settings#profile"
          class="profile-portrait"
          aria-label="编辑作者资料"
          @click="menu = false"
          ><img
            v-if="settings.avatar"
            :src="settings.avatar"
            :alt="settings.name + '的头像'" /><span v-else>{{ [...settings.name][0] }}</span
          ><i><Icon name="PencilLine" :size="12" /></i
        ></RouterLink>
        <h2>{{ settings.name }}</h2>
        <p class="profile-bio">{{ settings.bio }}</p>
        <span v-if="settings.location" class="location"
          ><Icon name="MapPin" :size="13" />{{ settings.location }}</span
        >
        <SocialLinks />
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
          ><Icon name="Home" />首页<Icon class="nav-arrow" name="ChevronRight" :size="14"
        /></RouterLink>
        <div class="nav-section-label">
          我的分类
          <RouterLink to="/settings#categories" aria-label="管理分类" @click="menu = false"
            ><Icon name="Plus" :size="14"
          /></RouterLink>
        </div>
        <RouterLink
          v-for="category in categories"
          :key="category"
          :to="{ path: '/', query: { category } }"
          :class="{ selected: route.path === '/' && route.query.category === category }"
          @click="menu = false"
          ><Icon name="Hash" :size="16" /><span class="nav-category-name">{{ category }}</span
          ><small>{{ posts.filter((p) => p.category === category).length }}</small></RouterLink
        >
        <RouterLink
          to="/manage"
          :class="{ selected: route.path === '/manage' }"
          @click="menu = false"
          ><Icon name="LayoutList" />文章管理</RouterLink
        ><RouterLink
          to="/settings"
          :class="{ selected: route.path === '/settings' }"
          @click="menu = false"
          ><Icon name="Settings" />个性化设置</RouterLink
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
