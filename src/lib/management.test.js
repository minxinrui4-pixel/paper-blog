import { beforeEach, it, expect, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { File as NodeFile } from 'node:buffer'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
  vi.resetModules()
})

it('删除分类保留文章和附件，把文章、草稿移入未分类，刷新后不复活', async () => {
  let store = await import('./store')
  const original = store.posts.value
    .filter((p) => p.category === '技术笔记')
    .map((p) => JSON.parse(JSON.stringify(p)))
  const total = store.posts.value.length
  store.saveDraft({
    title: '待发布',
    category: '技术笔记',
    html: '<p>正文</p>',
    tags: [],
    attachments: [{ id: 'keep-file', name: '附件' }],
  })
  store.deleteCategory('技术笔记')
  expect(store.posts.value.length).toBe(total)
  for (const post of original)
    expect(store.findPost(post.id)).toEqual({ ...post, category: '未分类' })
  expect(store.readDraft()).toMatchObject({
    category: '未分类',
    attachments: [{ id: 'keep-file', name: '附件' }],
  })
  expect(store.categories.value).not.toContain('技术笔记')
  expect(() => store.deleteCategory('未分类')).toThrow('不能删除')
  expect(() => store.renameCategory('未分类', '其他')).toThrow('不能改名')
  vi.resetModules()
  store = await import('./store')
  expect(store.categories.value).not.toContain('技术笔记')
  expect(store.findPost(original[0].id).category).toBe('未分类')
  store.addCategory('空分类')
  store.deleteCategory('空分类')
  expect(store.categories.value).not.toContain('空分类')
})

it('删除分类最后一步保存失败时，分类、文章和草稿全部恢复', async () => {
  const store = await import('./store')
  store.saveDraft({ title: '草稿', category: '生活随笔', tags: [] })
  const before = [
    localStorage.getItem('paper-blog-categories-v1'),
    localStorage.getItem('paper-blog-v1'),
    localStorage.getItem('paper-blog-draft-v1'),
  ]
  const write = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === 'paper-blog-draft-v1' && value.includes('未分类'))
      throw new DOMException('quota', 'QuotaExceededError')
    return write.call(this, key, value)
  })
  expect(() => store.deleteCategory('生活随笔')).toThrow()
  expect(store.categories.value).toContain('生活随笔')
  expect([
    localStorage.getItem('paper-blog-categories-v1'),
    localStorage.getItem('paper-blog-v1'),
    localStorage.getItem('paper-blog-draft-v1'),
  ]).toEqual(before)
  expect(store.posts.value.some((p) => p.category === '生活随笔')).toBe(true)
})

it('文件夹保留子目录和同名文件，单个失败不会阻止后续文件', async () => {
  const { storeFileBatch, readAsset, MAX_FILE_SIZE } = await import('./assets')
  const first = new NodeFile(['first'], 'readme.txt', { type: 'text/plain' })
  const second = new NodeFile(['second'], 'readme.txt', { type: 'text/plain' })
  Object.defineProperty(first, 'webkitRelativePath', { value: '资料/笔记/readme.txt' })
  Object.defineProperty(second, 'webkitRelativePath', { value: '资料/代码/readme.txt' })
  const progress = []
  const result = await storeFileBatch(
    [first, { name: 'big.zip', size: MAX_FILE_SIZE + 1 }, second],
    { onProgress: (p) => progress.push(p) },
  )
  expect(result.saved.map((a) => a.path)).toEqual(['资料/笔记/readme.txt', '资料/代码/readme.txt'])
  expect(result.saved[0].id).not.toBe(result.saved[1].id)
  expect((await readAsset(result.saved[1].id)).blob.size).toBe(6)
  expect(result.failures).toEqual([{ name: 'big.zip', reason: '单个文件不能超过 10 MB' }])
  expect(progress.at(-1)).toEqual({ done: 3, total: 3 })
  const store = await import('./store')
  store.saveDraft({
    title: '文件夹草稿',
    category: '生活随笔',
    html: '<p>资料</p>',
    tags: [],
    attachments: result.saved,
  })
  expect(store.readDraft().attachments[1].path).toBe('资料/代码/readme.txt')
})

it('纯文字卡片无假封面，展开显示安全正文，标题可进入无封面的详情', async () => {
  const { createApp, nextTick } = await import('vue')
  const { createRouter, createMemoryHistory } = await import('vue-router')
  const PostCard = (await import('../components/PostCard.vue')).default
  const Detail = (await import('../views/Detail.vue')).default
  const store = await import('./store')
  const post = store.savePost({
    title: '纯文字测试',
    html: `<p>${'日常记录'.repeat(40)}</p><p>最后一段</p><script>alert(1)</script>`,
    category: '生活随笔',
    tags: ['生活'],
    coverId: '',
    attachments: [],
  })
  // Old sample decoration must not produce a placeholder either.
  post.art = 'sunset'
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: PostCard, props: () => ({ post }) },
      { path: '/posts/:id', component: Detail },
      { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({ template: '<RouterView />' }).use(router)
  try {
    app.mount(host)
    await nextTick()
    expect(host.querySelector('.post-cover')).toBeNull()
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('.post-summary').textContent).not.toContain('最后一段')
    const toggle = host.querySelector('.expand-post')
    toggle.click()
    await nextTick()
    expect(router.currentRoute.value.path).toBe('/')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(host.querySelector('.post-excerpt').textContent).toContain('最后一段')
    expect(host.querySelector('script')).toBeNull()
    toggle.click()
    await nextTick()
    expect(host.querySelector('.post-excerpt').textContent).not.toContain('最后一段')
    host.querySelector('.post-content h2').closest('a').click()
    await new Promise((resolve) => setTimeout(resolve, 10))
    await nextTick()
    expect(router.currentRoute.value.path).toBe(`/posts/${post.id}`)
    expect(host.querySelector('.detail-cover')).toBeNull()
    expect(host.querySelector('.detail-content').textContent).toContain('最后一段')
  } finally {
    app.unmount()
    host.remove()
  }
})

it('分类管理页删除需确认，取消保留分类，确认后归入未分类', async () => {
  const { createApp, nextTick } = await import('vue')
  const { createRouter, createMemoryHistory } = await import('vue-router')
  const Categories = (await import('../views/Categories.vue')).default
  const ConfirmDialog = (await import('../components/ConfirmDialog.vue')).default
  const store = await import('./store')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/categories', component: Categories },
      { path: '/', component: { template: '<div />' } },
    ],
  })
  await router.push('/categories')
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({
    components: { ConfirmDialog },
    template: '<ConfirmDialog /><RouterView />',
  }).use(router)
  try {
    app.mount(host)
    await nextTick()
    host.querySelector('[aria-label="删除分类：生活随笔"]').click()
    await nextTick()
    expect(document.querySelector('[role="dialog"]').textContent).toContain('未分类')
    document.querySelector('.confirm-dialog .secondary').click()
    await nextTick()
    expect(store.categories.value).toContain('生活随笔')
    host.querySelector('[aria-label="删除分类：生活随笔"]').click()
    await nextTick()
    document.querySelector('.confirm-dialog .primary').click()
    await nextTick()
    await nextTick()
    expect(store.categories.value).not.toContain('生活随笔')
    expect(host.querySelector('[aria-label="删除分类：未分类"]').disabled).toBe(true)
  } finally {
    app.unmount()
    host.remove()
  }
})

it('编辑器接收文件夹选择，显示相对路径并随文章保存', async () => {
  const { createApp, nextTick } = await import('vue')
  const { createRouter, createMemoryHistory } = await import('vue-router')
  const Editor = (await import('../components/Editor.vue')).default
  const store = await import('./store')
  store.saveDraft({
    title: '文件夹文章',
    category: '生活随笔',
    html: '<p>这是一份完整的学习资料。</p>',
    tags: [],
    coverId: '',
    attachments: [],
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: Editor }],
  })
  await router.push('/')
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp({ template: '<RouterView />' }).use(router)
  try {
    app.mount(host)
    await nextTick()
    const input = host.querySelector('input[webkitdirectory]')
    expect(input.multiple).toBe(true)
    const file = new NodeFile(['course notes'], 'notes.txt', { type: 'text/plain' })
    Object.defineProperty(file, 'webkitRelativePath', { value: '课程资料/第一章/notes.txt' })
    Object.defineProperty(input, 'files', { value: [file] })
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await vi.waitFor(() =>
      expect(host.querySelector('.upload-feedback')?.textContent).toContain('已导入 1 个文件'),
    )
    expect(host.querySelector('.attachment-editor').textContent).toContain(
      '课程资料/第一章/notes.txt',
    )
    expect(store.readDraft().attachments[0].path).toBe('课程资料/第一章/notes.txt')
    host.querySelector('.composer-footer .primary').click()
    await vi.waitFor(() => expect(store.posts.value[0].title).toBe('文件夹文章'))
    const saved = JSON.parse(localStorage.getItem('paper-blog-v1'))[0]
    expect(saved.attachments[0].path).toBe('课程资料/第一章/notes.txt')
    expect(saved.coverId).toBe('')
  } finally {
    app.unmount()
    host.remove()
  }
})
