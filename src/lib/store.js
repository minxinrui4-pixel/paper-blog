import { ref, computed } from 'vue'
import { seeds } from './seed'
import { clean, plain, assetIds } from './content'
import { collectAssets } from './assets'
const KEY = 'paper-blog-v1',
  DRAFT = 'paper-blog-draft-v1'
const CATEGORIES = 'paper-blog-categories-v1'
const defaultCategories = ['生活随笔', '技术笔记', '旅行记录', '阅读摘记', '未分类']
export const notice = ref('')
export const warn = (message) => {
  notice.value = message
}
function initial() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== null) {
      const value = JSON.parse(raw)
      if (!Array.isArray(value)) throw Error()
      return value
    }
    localStorage.setItem(KEY, JSON.stringify(seeds))
    return structuredClone(seeds)
  } catch {
    warn('本地数据读取失败，请检查浏览器存储设置；原数据未被覆盖。')
    return []
  }
}
export const posts = ref(initial())
function readCategories() {
  try {
    const value = JSON.parse(localStorage.getItem(CATEGORIES) || 'null')
    return Array.isArray(value)
      ? value.filter((v) => typeof v === 'string' && v.trim())
      : defaultCategories
  } catch {
    return defaultCategories
  }
}
const categoryNames = ref(readCategories())
export const categories = computed(() => [
  ...new Set([...categoryNames.value, ...posts.value.map((p) => p.category).filter(Boolean)]),
])
function categoryName(value, previous) {
  const name = value.trim()
  if (!name) throw new Error('分类名称不能为空')
  if (name.length > 20) throw new Error('分类名称最多 20 个字')
  if (
    categories.value.some(
      (c) => c !== previous && c.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
  )
    throw new Error('这个分类已经存在')
  return name
}
export function addCategory(value) {
  const name = categoryName(value)
  const next = [...categories.value, name]
  localStorage.setItem(CATEGORIES, JSON.stringify(next))
  categoryNames.value = next
}
export function renameCategory(previous, value) {
  if (!categories.value.includes(previous)) throw new Error('这个分类已经不存在')
  const name = categoryName(value, previous)
  if (name === previous) return
  const nextCategories = categories.value.map((c) => (c === previous ? name : c))
  const nextPosts = posts.value.map((p) => (p.category === previous ? { ...p, category: name } : p))
  const draft = readDraft()
  const writes = [
    [CATEGORIES, JSON.stringify(nextCategories)],
    [KEY, JSON.stringify(nextPosts)],
  ]
  if (draft?.category === previous)
    writes.push([DRAFT, JSON.stringify({ ...draft, category: name })])
  const original = writes.map(([key]) => [key, localStorage.getItem(key)])
  try {
    for (const [key, content] of writes) localStorage.setItem(key, content)
  } catch (error) {
    for (const [key, content] of original) {
      try {
        if (content === null) localStorage.removeItem(key)
        else localStorage.setItem(key, content)
      } catch {
        warn('分类保存失败，请检查浏览器存储空间并刷新确认。')
      }
    }
    throw error
  }
  categoryNames.value = nextCategories
  posts.value = nextPosts
}
export const findPost = (id) => posts.value.find((p) => p.id === id)
function persist(next) {
  localStorage.setItem(KEY, JSON.stringify(next))
  posts.value = next
}
export function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT) || 'null')
  } catch {
    return null
  }
}
export function saveDraft(value) {
  localStorage.setItem(DRAFT, JSON.stringify(value))
}
export function clearDraft() {
  localStorage.removeItem(DRAFT)
}
const activeAssets = new Set()
export function retainAsset(id) {
  activeAssets.add(id)
}
export function releaseAsset(id) {
  activeAssets.delete(id)
}
export async function cleanup() {
  const keep = new Set(activeAssets)
  for (const p of [...posts.value, readDraft()].filter(Boolean)) {
    if (p.coverId) keep.add(p.coverId)
    for (const a of p.attachments || []) keep.add(a.id)
    for (const id of assetIds(p.html || '')) keep.add(id)
  }
  await collectAssets(keep)
}
export function savePost(value, id) {
  const html = clean(value.html)
  if (!value.title.trim() || !plain(html).trim()) throw new Error('请填写文章标题和正文')
  const previous = id ? findPost(id) : null
  if (id && !previous) throw new Error('这篇文章已经不存在')
  const now = new Date().toISOString()
  const post = {
    ...previous,
    ...value,
    html,
    title: value.title.trim(),
    summary: plain(html).slice(0, 100),
    category: value.category.trim() || '未分类',
    tags: [...new Set(value.tags.map((t) => t.trim()).filter(Boolean))],
    id: id || crypto.randomUUID(),
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    views: previous?.views || 0,
    art: value.coverId ? '' : previous?.art || '',
  }
  persist(previous ? posts.value.map((p) => (p.id === id ? post : p)) : [post, ...posts.value])
  return post
}
export async function deletePost(id) {
  persist(posts.value.filter((p) => p.id !== id))
  try {
    await cleanup()
  } catch {
    warn('文章已删除，附件清理暂时失败。')
  }
}
export function visitPost(id) {
  const p = findPost(id)
  if (!p) return
  try {
    const key = `paper-read-${id}`
    if (!sessionStorage.getItem(key)) {
      persist(posts.value.map((p) => (p.id === id ? { ...p, views: p.views + 1 } : p)))
      sessionStorage.setItem(key, '1')
    }
  } catch {
    warn('阅读次数暂时无法保存。')
  }
}
