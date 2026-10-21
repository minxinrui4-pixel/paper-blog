import { ref } from 'vue'

const KEY = 'paper-blog-settings-v1'
export const backgroundOptions = [
  { id: 'blowfish', name: '星海流光', description: 'Blowfish 同款 · 蓝紫光晕' },
  { id: 'aurora', name: '晨间极光', description: '薄荷绿与淡紫色渐变' },
  { id: 'paper', name: '素色纸间', description: '安静、简洁，专注文字' },
  { id: 'custom', name: '我的背景', description: '上传你喜欢的风景或照片' },
]
const defaults = {
  name: '林间来信',
  bio: '记录思考，收藏日常。\n在自己的节奏里，慢慢生长。',
  location: '中国 · 杭州',
  avatar: '',
  background: 'blowfish',
  backgroundImage: '',
  github: 'https://github.com/',
  chatgpt: 'https://chatgpt.com/',
}
function safeImage(value) {
  return typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(value)
    ? value
    : ''
}
export function externalUrl(value) {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' || url.username || url.password) throw Error()
    return url.href
  } catch {
    throw new Error('链接请填写完整的 HTTPS 地址，例如 https://github.com/你的用户名')
  }
}
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...defaults }
    return {
      ...defaults,
      name:
        typeof value.name === 'string' && value.name.trim()
          ? value.name.slice(0, 30)
          : defaults.name,
      bio: typeof value.bio === 'string' ? value.bio.slice(0, 200) : defaults.bio,
      location:
        typeof value.location === 'string' ? value.location.slice(0, 40) : defaults.location,
      avatar: safeImage(value.avatar),
      background: backgroundOptions.some((b) => b.id === value.background)
        ? value.background
        : defaults.background,
      backgroundImage: safeImage(value.backgroundImage),
      github: externalUrl(value.github || defaults.github),
      chatgpt: externalUrl(value.chatgpt || defaults.chatgpt),
    }
  } catch {
    return { ...defaults }
  }
}
export const settings = ref(load())
export function saveSettings(value) {
  if (!value.name.trim()) throw new Error('请填写作者名字')
  if (value.background === 'custom' && !safeImage(value.backgroundImage))
    throw new Error('请先上传一张背景图片')
  const next = {
    name: value.name.trim().slice(0, 30),
    bio: value.bio.trim().slice(0, 200),
    location: value.location.trim().slice(0, 40),
    avatar: safeImage(value.avatar),
    background: backgroundOptions.some((b) => b.id === value.background)
      ? value.background
      : 'blowfish',
    backgroundImage: safeImage(value.backgroundImage),
    github: externalUrl(value.github),
    chatgpt: externalUrl(value.chatgpt),
  }
  // Commit to storage first so a quota error never changes the visible profile.
  localStorage.setItem(KEY, JSON.stringify(next))
  settings.value = next
}

export async function imageData(file, kind) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('请选择 JPG、PNG 或 WebP 图片')
  if (file.size > 10 * 1024 * 1024) throw new Error('图片不能超过 10 MB')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const limit = kind === 'avatar' ? 320 : 1920
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器无法处理图片')
    if (kind === 'avatar') {
      canvas.width = canvas.height = limit
      const side = Math.min(image.width, image.height)
      context.drawImage(
        image,
        (image.width - side) / 2,
        (image.height - side) / 2,
        side,
        side,
        0,
        0,
        limit,
        limit,
      )
    } else {
      const scale = Math.min(1, limit / Math.max(image.width, image.height))
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
    }
    const result = canvas.toDataURL('image/webp', 0.82)
    if (result.length > 2 * 1024 * 1024) throw new Error('压缩后图片仍过大，请选择更小的图片')
    return result
  } finally {
    URL.revokeObjectURL(url)
  }
}
