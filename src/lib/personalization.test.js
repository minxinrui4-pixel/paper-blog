import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.resetModules()
})
afterEach(() => {
  document.documentElement.classList.remove('dark')
  delete document.documentElement.dataset.background
})

describe('可管理的文章分类', () => {
  it('新增的空分类独立保存，刷新后仍能选择', async () => {
    let store = await import('./store')
    store.addCategory('摄影手记')
    expect(store.categories.value).toContain('摄影手记')
    expect(store.posts.value.some((p) => p.category === '摄影手记')).toBe(false)
    vi.resetModules()
    store = await import('./store')
    expect(store.categories.value).toContain('摄影手记')
    expect(() => store.addCategory(' 摄影手记 ')).toThrow('已经存在')
    expect(() => store.addCategory('   ')).toThrow('不能为空')
  })
  it('分类改名同步文章与草稿，刷新后保留，禁止重名', async () => {
    let store = await import('./store')
    const ids = store.posts.value.filter((p) => p.category === '生活随笔').map((p) => p.id)
    store.saveDraft({ title: '草稿', category: '生活随笔', html: '<p>正文</p>', tags: [] })
    store.renameCategory('生活随笔', '日常记录')
    expect(store.categories.value).not.toContain('生活随笔')
    expect(ids.every((id) => store.findPost(id).category === '日常记录')).toBe(true)
    expect(store.readDraft().category).toBe('日常记录')
    expect(() => store.renameCategory('日常记录', '技术笔记')).toThrow('已经存在')
    vi.resetModules()
    store = await import('./store')
    expect(store.categories.value).toContain('日常记录')
    expect(ids.every((id) => store.findPost(id).category === '日常记录')).toBe(true)
  })
  it('分类改名写入中途失败时恢复原分类、文章与草稿', async () => {
    const store = await import('./store')
    store.saveDraft({ title: '草稿', category: '技术笔记', tags: [] })
    const originalPosts = localStorage.getItem('paper-blog-v1')
    const originalDraft = localStorage.getItem('paper-blog-draft-v1')
    const write = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'paper-blog-v1' && value.includes('工程实践'))
        throw new DOMException('quota', 'QuotaExceededError')
      return write.call(this, key, value)
    })
    expect(() => store.renameCategory('技术笔记', '工程实践')).toThrow()
    expect(store.categories.value).toContain('技术笔记')
    expect(store.categories.value).not.toContain('工程实践')
    expect(localStorage.getItem('paper-blog-v1')).toBe(originalPosts)
    expect(localStorage.getItem('paper-blog-draft-v1')).toBe(originalDraft)
    expect(localStorage.getItem('paper-blog-categories-v1')).toBeNull()
  })
})

describe('作者、背景与外链设置', () => {
  it('保存名字、头像、背景和链接，刷新后恢复', async () => {
    let service = await import('./settings')
    service.saveSettings({
      ...service.settings.value,
      name: ' 小林 ',
      avatar: 'data:image/png;base64,aGVsbG8=',
      background: 'custom',
      backgroundImage: 'data:image/webp;base64,aGVsbG8=',
      github: 'https://github.com/example',
    })
    vi.resetModules()
    service = await import('./settings')
    expect(service.settings.value).toMatchObject({
      name: '小林',
      background: 'custom',
      github: 'https://github.com/example',
    })
    expect(service.settings.value.avatar).toContain('data:image/png;')
    expect(service.settings.value.backgroundImage).toContain('data:image/webp;')
  })
  it('拒绝空名字、危险链接和没有图片的自定义背景', async () => {
    const service = await import('./settings')
    expect(() => service.saveSettings({ ...service.settings.value, name: ' ' })).toThrow('名字')
    expect(() => service.externalUrl('javascript:alert(1)')).toThrow('HTTPS')
    expect(() => service.externalUrl('https://user:password@example.com')).toThrow('HTTPS')
    expect(() => service.saveSettings({ ...service.settings.value, background: 'custom' })).toThrow(
      '上传',
    )
    await expect(service.imageData({ type: 'image/svg+xml', size: 1 }, 'avatar')).rejects.toThrow(
      'JPG',
    )
    await expect(
      service.imageData({ type: 'image/png', size: 11 * 1024 * 1024 }, 'avatar'),
    ).rejects.toThrow('10 MB')
  })
  it('保存失败保留原资料，损坏的设置使用默认值', async () => {
    const service = await import('./settings')
    const before = { ...service.settings.value }
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => service.saveSettings({ ...before, name: '新名字' })).toThrow()
    expect(service.settings.value).toEqual(before)
    vi.restoreAllMocks()
    localStorage.setItem('paper-blog-settings-v1', '{invalid')
    vi.resetModules()
    expect((await import('./settings')).settings.value.name).toBe('林间来信')
  })
})

it('页面中保存资料、新增分类，并在首页编辑器与筛选中同步显示', async () => {
  const { createApp, nextTick } = await import('vue')
  const { createRouter, createMemoryHistory } = await import('vue-router')
  const App = (await import('../App.vue')).default
  const Settings = (await import('../views/Settings.vue')).default
  const Categories = (await import('../views/Categories.vue')).default
  const Home = (await import('../views/Home.vue')).default
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Home },
      { path: '/settings', component: Settings },
      { path: '/categories', component: Categories },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  })
  await router.push('/settings')
  await router.isReady()
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(App).use(router)
  try {
    app.mount(host)
    await nextTick()
    const name = host.querySelector('input[autocomplete="nickname"]')
    name.value = '测试作者'
    name.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    host.querySelector('.settings-heading button').click()
    await nextTick()
    expect(host.querySelector('.profile h2').textContent).toBe('测试作者')
    await router.push('/categories')
    await nextTick()
    const category = host.querySelector('#new-category')
    category.value = '摄影手记'
    category.dispatchEvent(new Event('input', { bubbles: true }))
    host
      .querySelector('.category-add')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await nextTick()
    expect(host.querySelector('.main-nav').textContent).toContain('文章分类')
    expect(host.querySelector('.main-nav').textContent).not.toContain('摄影手记')
    expect(host.querySelectorAll('.main-nav > a')).toHaveLength(4)
    await router.push('/')
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(host.querySelector('.home-hero').textContent).toContain('测试作者')
    expect(host.querySelector('.filter-tabs').textContent).toContain('摄影手记')
    expect(
      [...host.querySelectorAll('.editor-fields select option')].some(
        (el) => el.value === '摄影手记',
      ),
    ).toBe(true)
    const github = host.querySelector('.hero-copy a[title="GitHub"]')
    const chatgpt = host.querySelector('.hero-copy a[title="ChatGPT"]')
    expect(github.href).toBe('https://github.com/')
    expect(chatgpt.href).toBe('https://chatgpt.com/')
    expect(github.rel).toContain('noopener')
    expect(chatgpt.querySelector('img.brand-icon')).not.toBeNull()
    expect(document.documentElement.dataset.background).toBe('blowfish')
    expect(host.querySelector('.home-hero').classList.contains('whale-hero')).toBe(true)
    expect(host.querySelector('.hero-orbit')).toBeNull()
  } finally {
    app.unmount()
    host.remove()
  }
})
