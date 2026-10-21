<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Editor from '../components/Editor.vue'
import PostCard from '../components/PostCard.vue'
import Icon from '../components/Icon.vue'
import SocialLinks from '../components/SocialLinks.vue'
import { posts, categories as categoryNames } from '../lib/store'
import { settings } from '../lib/settings'
import { selectPosts } from '../lib/content'
const route = useRoute()
const router = useRouter()
const search = ref('')
const page = ref(1)
const success = ref('')
const composerOpen = ref(false)
function explore() {
  document.getElementById('articles')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function writePost() {
  composerOpen.value = true
  requestAnimationFrame(() =>
    document
      .getElementById('write-article')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  )
}
const desktopSearch = ref(null)
const mobileSearch = ref(null)
function searchShortcut(event) {
  if (
    event.key === '/' &&
    !event.ctrlKey &&
    !event.metaKey &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
    !document.activeElement?.isContentEditable
  ) {
    event.preventDefault()
    ;(mobileSearch.value?.offsetParent ? mobileSearch.value : desktopSearch.value)?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', searchShortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', searchShortcut))
const category = computed(() => String(route.query.category || ''))
const tag = computed(() => String(route.query.tag || ''))
const categories = computed(() =>
  categoryNames.value.map((name) => ({
    name,
    count: posts.value.filter((p) => p.category === name).length,
  })),
)
const tags = computed(() => [...new Set(posts.value.flatMap((p) => p.tags))])
const result = computed(() =>
  selectPosts(posts.value, {
    search: search.value,
    category: category.value,
    tag: tag.value,
    page: page.value,
  }),
)
watch([search, category, tag], () => {
  page.value = 1
})
function filter(key, value) {
  router.push({
    path: '/',
    query: { ...route.query, [key]: route.query[key] === value ? undefined : value },
  })
}
function published(post) {
  success.value = `「${post.title}」已发布`
  composerOpen.value = false
  search.value = ''
  page.value = 1
  router.replace('/')
}
function pagination(next) {
  page.value = next
  document.getElementById('articles')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function clearFilters() {
  search.value = ''
  router.replace('/')
}
</script>
<template>
  <section class="home-hero" :class="{ 'whale-hero': settings.background === 'blowfish' }">
    <div class="hero-copy">
      <div class="eyebrow"><Icon name="Sparkles" :size="15" /> A SPACE FOR MY THOUGHTS</div>
      <h1>把生活写成故事，<br /><span>把热爱留在这里。</span></h1>
      <p>你好，我是 {{ settings.name }}。<br />在代码与日常之间，记录每一个值得分享的瞬间。</p>
      <div class="hero-actions">
        <a href="#articles" class="button primary" @click.prevent="explore"
          >探索文章 <Icon name="ArrowUpRight" :size="17" /></a
        ><button class="button secondary" @click="writePost">
          <Icon name="PencilLine" :size="16" />写一篇文章
        </button>
      </div>
      <SocialLinks />
    </div>
    <div v-if="settings.background !== 'blowfish'" class="hero-orbit" aria-hidden="true">
      <span class="orbit-ring"></span><span class="orbit-ring orbit-ring-two"></span>
      <div class="orbit-center"><Icon name="Feather" :size="62" /></div>
      <span class="orbit-label">WRITE · CREATE · GROW</span><span class="orbit-star">✦</span>
    </div>
    <div class="hero-footnote">
      <span class="status-dot"></span> 我的数字花园
      <span>{{ posts.length }} 篇故事 · 持续生长中</span>
    </div>
  </section>
  <div class="content-layout">
    <div class="feed-column">
      <header class="page-heading">
        <div>
          <div class="eyebrow"><span></span> MY LITTLE CORNER OF THE INTERNET</div>
          <h2>生活与思考，都在这里<span>。</span></h2>
          <p>写下值得记住的瞬间，分享一路走来的收获。</p>
        </div>
        <span class="heading-flower">✳</span>
      </header>
      <div class="search-box mobile-search">
        <Icon name="Search" :size="18" /><input
          ref="mobileSearch"
          v-model="search"
          type="search"
          placeholder="搜索文章，发现灵感…"
          aria-label="搜索文章"
        />
      </div>
      <section id="write-article" class="write-section">
        <button
          class="write-toggle"
          :aria-expanded="composerOpen"
          aria-controls="home-editor"
          @click="composerOpen = !composerOpen"
        >
          <Icon name="PencilLine" :size="18" /><span>{{
            composerOpen ? '收起写作区' : '此刻，有什么想分享？'
          }}</span
          ><span>{{ composerOpen ? '草稿会自动保存' : '写文章 / 继续草稿' }}</span
          ><Icon :name="composerOpen ? 'ChevronLeft' : 'Plus'" :size="18" />
        </button>
        <div id="home-editor" v-show="composerOpen"><Editor @saved="published" /></div>
      </section>
      <div v-if="success" class="success-message" role="status">
        <Icon name="Check" :size="16" />{{ success
        }}<button aria-label="关闭发布提示" @click="success = ''">
          <Icon name="X" :size="15" />
        </button>
      </div>
      <section id="articles" class="articles-section">
        <div class="section-heading">
          <div>
            <h2>
              {{ category || (tag ? `# ${tag}` : '最新文章') }}<span>{{ result.total }} 篇</span>
            </h2>
            <p>一些文字，一些灵感，还有一些小小的热爱。</p>
          </div>
          <span class="sort-label"><Icon name="Clock3" :size="14" />最新发布</span>
        </div>
        <div class="filter-tabs">
          <button
            :class="{ active: !category }"
            @click="router.push({ path: '/', query: { ...route.query, category: undefined } })"
          >
            全部文章</button
          ><button
            v-for="item in categories"
            :key="item.name"
            :class="{ active: category === item.name }"
            @click="filter('category', item.name)"
          >
            {{ item.name }}
          </button>
        </div>
        <div v-if="tag" class="active-filter">
          标签：{{ tag
          }}<button aria-label="清除标签筛选" @click="filter('tag', tag)">
            <Icon name="X" :size="14" />
          </button>
        </div>
        <div v-if="result.items.length" class="post-grid">
          <PostCard v-for="post in result.items" :key="post.id" :post="post" />
        </div>
        <div v-else class="empty-state card">
          <Icon name="BookOpen" :size="38" />
          <h3>{{ posts.length ? '还没有找到这篇故事' : '你的第一篇故事，从这里开始' }}</h3>
          <p>
            {{
              posts.length
                ? '试试其他关键词，或清除筛选条件。'
                : '在上方写下想法，点击发布就能看到文章。'
            }}
          </p>
          <button v-if="posts.length" class="button secondary" @click="clearFilters">
            清除筛选
          </button>
        </div>
        <nav v-if="result.pages > 1" class="pagination" aria-label="文章分页">
          <button
            :disabled="result.page === 1"
            aria-label="上一页"
            @click="pagination(result.page - 1)"
          >
            <Icon name="ChevronLeft" :size="16" /></button
          ><button
            v-for="n in result.pages"
            :key="n"
            :class="{ active: n === result.page }"
            :aria-current="n === result.page ? 'page' : undefined"
            @click="pagination(n)"
          >
            {{ n }}</button
          ><button
            :disabled="result.page === result.pages"
            aria-label="下一页"
            @click="pagination(result.page + 1)"
          >
            <Icon name="ChevronRight" :size="16" />
          </button>
        </nav>
        <p class="feed-end">慢慢写，慢慢记录。每一篇都有意义。</p>
      </section>
    </div>
    <aside class="right-sidebar">
      <div class="search-box">
        <Icon name="Search" :size="18" /><input
          ref="desktopSearch"
          v-model="search"
          type="search"
          placeholder="搜索文章，发现灵感…"
          aria-label="搜索文章"
        /><kbd>/</kbd>
      </div>
      <section class="widget card intro-widget">
        <div class="widget-title">
          <span class="tiny-icon">✦</span>
          <h2>你好，欢迎来到纸间</h2>
        </div>
        <p>
          这里是我的数字花园。<br />有关于代码的探索，也有生活里的<br
            class="desktop-break"
          />细碎美好。很高兴，在这里遇见你。
        </p>
        <div class="intro-line"><span></span> 保持好奇，持续记录</div>
      </section>
      <section class="widget card">
        <div class="widget-title">
          <Icon name="LayoutList" :size="17" />
          <h2>文章分类</h2>
        </div>
        <div class="category-list">
          <button
            v-for="(item, i) in categories"
            :key="item.name"
            :class="{ active: category === item.name }"
            @click="filter('category', item.name)"
          >
            <span class="category-dot" :class="`dot-${i % 4}`"></span>{{ item.name
            }}<span class="count">{{ item.count }}</span>
          </button>
        </div>
      </section>
      <section class="widget card">
        <div class="widget-title">
          <Icon name="Hash" :size="17" />
          <h2>标签云</h2>
        </div>
        <div class="tag-cloud">
          <button
            v-for="t in tags"
            :key="t"
            :class="{ active: tag === t }"
            @click="filter('tag', t)"
          >
            <span>#</span> {{ t }}
          </button>
        </div>
      </section>
      <section class="daily-note">
        <span class="note-symbol">“</span>
        <div class="eyebrow">A LITTLE INSPIRATION</div>
        <p>生活不是用来比较的，<br />而是用来感受的。</p>
        <span class="note-author">给今天的自己</span><span class="note-plant">✺</span>
      </section>
      <div class="local-info">
        <Icon name="FileText" :size="14" /><span
          >这是一个纯前端个人空间<br />你的文字与附件，仅保存在本地</span
        >
      </div>
    </aside>
  </div>
</template>
