import { describe, it, expect, beforeEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { File as NodeFile } from 'node:buffer'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { LocalImage } from './editor'
import { clean, plain, assetIds, selectPosts } from './content'
import { storeFile, readAsset, collectAssets, MAX_FILE_SIZE } from './assets'

describe('正文安全与筛选分页', () => {
  it('编辑器恢复没有临时 src 的本地图片，不丢失正文插图', () => {
    const editor = new Editor({
      extensions: [StarterKit, LocalImage],
      content: '<p>正文</p><img data-asset-id="persisted-image" alt="图片">',
    })
    expect(assetIds(editor.getHTML())).toEqual(['persisted-image'])
    editor.destroy()
  })
  it('过滤脚本、事件、危险链接和临时图片地址，保留本地图片 ID', () => {
    const html = clean(
      '<p onclick="alert(1)">你好</p><script>alert(1)</script><a href="javascript:alert(1)">链接</a><img src="blob:old" data-asset-id="photo-1" onerror="alert(1)">',
    )
    expect(html).not.toMatch(/script|onclick|onerror|blob:old/)
    expect(assetIds(html)).toEqual(['photo-1'])
    expect(plain(html)).toBe('你好链接')
  })
  const posts = Array.from({ length: 14 }, (_, i) => ({
    id: `${i}`,
    title: `文章 ${i}`,
    category: i % 2 ? '技术' : '生活',
    tags: ['Vue'],
    summary: '摘要',
    html: '<p>正文关键词</p>',
    createdAt: new Date(2026, 0, i + 1).toISOString(),
  }))
  it('关键词与分类标签可组合，按最新发布排序', () => {
    const result = selectPosts(posts, { search: '正文关键词', category: '技术', tag: 'Vue' })
    expect(result.total).toBe(7)
    expect(result.items).toHaveLength(6)
    expect(result.items[0].id).toBe('13')
    expect(selectPosts(posts, { search: '不存在' }).total).toBe(0)
  })
  it('分页每页六篇，越界页回到有效页', () => {
    expect(selectPosts(posts, { page: 2 }).items).toHaveLength(6)
    expect(selectPosts(posts, { page: 100 }).items).toHaveLength(2)
    expect(selectPosts([], { page: 4 })).toMatchObject({ page: 1, pages: 1, total: 0 })
  })
})
describe('附件持久化', () => {
  it('写入后可读取文件内容与元数据，并只清理不再引用的附件', async () => {
    const a = await storeFile(new NodeFile(['hello'], 'hello.txt', { type: 'text/plain' }))
    const b = await storeFile(new NodeFile(['keep'], 'keep.txt', { type: 'text/plain' }))
    expect((await readAsset(a.id)).name).toBe('hello.txt')
    expect((await readAsset(a.id)).blob.size).toBe(5)
    await collectAssets(new Set([b.id]))
    expect(await readAsset(a.id)).toBeUndefined()
    expect((await readAsset(b.id)).name).toBe('keep.txt')
  })
  it('超过10 MB时不写入数据库', async () => {
    await expect(storeFile({ size: MAX_FILE_SIZE + 1 })).rejects.toThrow('10 MB')
  })
})
describe('文章存储', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.resetModules()
    vi.restoreAllMocks()
  })
  it('首次初始化示例，删除全部后不重新填充', async () => {
    let store = await import('./store')
    expect(store.posts.value.length).toBeGreaterThan(0)
    for (const p of [...store.posts.value]) await store.deletePost(p.id)
    vi.resetModules()
    store = await import('./store')
    expect(store.posts.value).toHaveLength(0)
  })
  it('新增编辑文章、草稿恢复和会话阅读去重', async () => {
    const store = await import('./store')
    const input = {
      title: ' 我的文章 ',
      html: '<p>这是正文</p>',
      category: '技术',
      tags: ['Vue', 'Vue'],
      coverId: '',
      attachments: [],
    }
    const p = store.savePost(input)
    expect(p.title).toBe('我的文章')
    expect(p.tags).toEqual(['Vue'])
    const changed = store.savePost({ ...p, title: '修改后' }, p.id)
    expect(changed.createdAt).toBe(p.createdAt)
    store.visitPost(p.id)
    store.visitPost(p.id)
    expect(store.findPost(p.id).views).toBe(1)
    store.saveDraft(input)
    expect(store.readDraft().title).toBe(input.title)
    store.clearDraft()
    expect(store.readDraft()).toBeNull()
    vi.resetModules()
    const reloaded = await import('./store')
    expect(reloaded.findPost(p.id).title).toBe('修改后')
  })
  it('保存失败时内存文章不改变，空标题和空正文不能发布', async () => {
    const store = await import('./store')
    const count = store.posts.value.length
    const input = {
      title: '新文章',
      html: '<p>正文</p>',
      category: '生活',
      tags: [],
      attachments: [],
    }
    expect(() => store.savePost({ ...input, title: '' })).toThrow('标题和正文')
    expect(() => store.savePost({ ...input, html: '<p></p>' })).toThrow('标题和正文')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => store.savePost(input)).toThrow('quota')
    expect(store.posts.value).toHaveLength(count)
  })
})
