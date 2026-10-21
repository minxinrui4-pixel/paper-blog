import DOMPurify from 'dompurify'
export function clean(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      's',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'hr',
      'a',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'data-asset-id', 'alt', 'title'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['data-asset-id'],
  })
}
export function plain(html) {
  const el = document.createElement('div')
  el.innerHTML = clean(html)
  return el.textContent || ''
}
export function assetIds(html) {
  const el = document.createElement('div')
  el.innerHTML = clean(html)
  return [...el.querySelectorAll('img[data-asset-id]')].map((i) => i.dataset.assetId)
}
export function selectPosts(
  posts,
  { search = '', category = '', tag = '', page = 1, size = 6 } = {},
) {
  const q = search.trim().toLowerCase()
  const items = posts
    .filter(
      (p) =>
        (!category || p.category === category) &&
        (!tag || p.tags.includes(tag)) &&
        (!q || `${p.title} ${p.summary} ${plain(p.html)}`.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.max(1, Math.min(page, pages))
  return {
    total: items.length,
    pages,
    page: current,
    items: items.slice((current - 1) * size, current * size),
  }
}
export const date = (value) =>
  new Date(value)
    .toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .replaceAll('/', '.')
export const fileSize = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
