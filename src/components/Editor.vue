<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { LocalImage } from '../lib/editor'
import { onBeforeRouteLeave } from 'vue-router'
import { confirmAction } from '../lib/confirm'
import Icon from './Icon.vue'
import AssetImage from './AssetImage.vue'
import { storeFile, assetUrl } from '../lib/assets'
import { clean, fileSize, assetIds } from '../lib/content'
import {
  readDraft,
  saveDraft,
  clearDraft,
  savePost,
  cleanup,
  retainAsset,
  releaseAsset,
  categories,
} from '../lib/store'
const props = defineProps({ post: Object })
const emit = defineEmits(['saved', 'cancel'])
const initial = props.post ||
  readDraft() || {
    title: '',
    html: '',
    category: categories.value[0] || '未分类',
    tags: [],
    coverId: '',
    attachments: [],
  }
const title = ref(initial.title)
const category = ref(initial.category)
const tags = ref(initial.tags.join('，'))
const coverId = ref(initial.coverId || '')
const attachments = ref([...(initial.attachments || [])])
const html = ref(clean(initial.html || ''))
const dirty = ref(false)
const busy = ref(false)
const error = ref('')
const draftState = ref(
  props.post ? '编辑文章' : initial.title ? '已恢复本地草稿' : '灵感值得被记录',
)
const images = ref(null)
const files = ref(null)
const retained = new Set()
const editor = useEditor({
  content: html.value,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: { openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } },
    }),
    LocalImage,
  ],
  editorProps: {
    attributes: {
      'aria-label': '文章正文',
      role: 'textbox',
      'data-placeholder': '此刻，有什么想分享的？写下你的想法吧…',
    },
  },
  onUpdate: ({ editor }) => {
    html.value = clean(editor.getHTML())
    changed()
  },
})
function value() {
  return {
    title: title.value,
    html: html.value,
    category: category.value,
    tags: tags.value
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean),
    coverId: coverId.value,
    attachments: attachments.value,
  }
}
function changed() {
  dirty.value = true
  error.value = ''
  if (!props.post) {
    try {
      saveDraft(value())
      draftState.value = '草稿已自动保存'
    } catch {
      error.value = '草稿保存失败，请检查浏览器存储空间。'
    }
  }
}
watch([title, category, tags, coverId, attachments], changed, { deep: true })
async function hydrate() {
  if (!editor.value) return
  for (const id of assetIds(html.value)) {
    try {
      const url = await assetUrl(id)
      if (!editor.value || editor.value.isDestroyed) return
      editor.value.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs.assetId === id)
          editor.value.view.dispatch(
            editor.value.state.tr
              .setNodeMarkup(pos, undefined, { ...node.attrs, src: url })
              .setMeta('preventUpdate', true),
          )
      })
    } catch {
      error.value = '部分图片读取失败'
    }
  }
}
watch(editor, hydrate)
const imageItems = computed(() => attachments.value.filter((a) => a.type.startsWith('image/')))
async function upload(event, imageOnly) {
  busy.value = true
  error.value = ''
  try {
    for (const file of event.target.files) {
      if (
        imageOnly &&
        !['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'].includes(file.type)
      )
        throw new Error('请选择 PNG、JPG、WebP、GIF 或 AVIF 图片')
      const asset = await storeFile(file)
      retainAsset(asset.id)
      retained.add(asset.id)
      attachments.value.push(asset)
      if (imageOnly) {
        const url = await assetUrl(asset.id)
        editor.value.chain().focus().setImage({ src: url, alt: file.name, assetId: asset.id }).run()
        if (!coverId.value) coverId.value = asset.id
      }
      changed()
    }
  } catch (e) {
    error.value = e.message || '文件保存失败，请检查存储空间'
  } finally {
    busy.value = false
    event.target.value = ''
  }
}
function remove(asset) {
  attachments.value = attachments.value.filter((a) => a.id !== asset.id)
  if (coverId.value === asset.id) coverId.value = ''
  const positions = []
  editor.value.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image' && node.attrs.assetId === asset.id)
      positions.push([pos, node.nodeSize])
  })
  for (const [pos, size] of positions.reverse())
    editor.value.view.dispatch(editor.value.state.tr.delete(pos, pos + size))
  html.value = clean(editor.value.getHTML())
  changed()
}
async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const post = savePost(value(), props.post?.id)
    if (!props.post) {
      try {
        clearDraft()
      } catch {
        /* article already saved */
      }
      title.value = ''
      tags.value = ''
      category.value = categories.value[0] || '未分类'
      coverId.value = ''
      attachments.value = []
      editor.value.commands.clearContent()
      html.value = ''
      try {
        clearDraft()
      } catch {}
    }
    dirty.value = false
    for (const id of retained) releaseAsset(id)
    retained.clear()
    draftState.value = '发布成功，继续记录下一份灵感'
    busy.value = false
    emit('saved', post)
    try {
      await cleanup()
    } catch {
      /* next cleanup will retry */
    }
  } catch (e) {
    error.value = e.message || '保存失败，请检查浏览器存储空间。'
  } finally {
    busy.value = false
  }
}
async function canLeave() {
  if (busy.value) {
    error.value = '文件或文章正在保存，请稍候再离开。'
    return false
  }
  return (
    !props.post ||
    !dirty.value ||
    (await confirmAction('修改还未保存，离开将丢弃本次修改。', {
      title: '离开编辑？',
      action: '放弃修改',
    }))
  )
}
onBeforeRouteLeave(canLeave)
async function cancel() {
  if (await canLeave()) {
    dirty.value = false
    emit('cancel')
  }
}
function beforeUnload(event) {
  if (props.post && dirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  for (const id of retained) releaseAsset(id)
  editor.value?.destroy()
  cleanup().catch(() => {})
})
const tools = [
  { icon: 'Bold', label: '加粗', action: 'toggleBold', active: 'bold' },
  { icon: 'Italic', label: '斜体', action: 'toggleItalic', active: 'italic' },
  {
    icon: 'Heading2',
    label: '二级标题',
    action: 'toggleHeading',
    args: { level: 2 },
    active: 'heading',
  },
  { icon: 'List', label: '无序列表', action: 'toggleBulletList', active: 'bulletList' },
  { icon: 'ListOrdered', label: '有序列表', action: 'toggleOrderedList', active: 'orderedList' },
  { icon: 'Quote', label: '引用', action: 'toggleBlockquote', active: 'blockquote' },
]
</script>
<template>
  <section class="composer card">
    <div class="composer-heading">
      <span class="composer-avatar"><Icon name="Feather" :size="20" /></span>
      <div>
        <h2>{{ post ? '继续打磨你的文章' : '写点什么，记录此刻' }}</h2>
        <p>{{ post ? '每一次修改，都让想法更清晰。' : '让想法落在纸上，让日常有迹可循。' }}</p>
      </div>
      <span class="local-badge"><span></span> 本地作者</span>
    </div>
    <input
      v-model="title"
      class="title-input"
      aria-label="文章标题"
      placeholder="给这份灵感起个标题…"
      maxlength="120"
    />
    <div class="editor-toolbar" v-if="editor">
      <button
        v-for="tool in tools"
        :key="tool.icon"
        type="button"
        :title="tool.label"
        :aria-label="tool.label"
        :class="{ active: editor.isActive(tool.active) }"
        @click="editor.chain().focus()[tool.action](tool.args).run()"
      >
        <Icon :name="tool.icon" :size="17" /></button
      ><span class="toolbar-divider"></span
      ><button aria-label="插入图片" title="插入图片" @click="images.click()">
        <Icon name="Image" :size="17" /></button
      ><button aria-label="添加附件" title="添加附件" @click="files.click()">
        <Icon name="Paperclip" :size="17" />
      </button>
    </div>
    <EditorContent :editor="editor" class="editor-content prose" />
    <div class="editor-fields">
      <label
        >分类<select v-model="category">
          <option v-for="name in [...new Set([...categories, category])]" :key="name" :value="name">
            {{ name }}
          </option>
        </select></label
      ><label class="tag-field"
        >标签<input v-model="tags" placeholder="用逗号分隔，如：生活，日常" aria-label="文章标签"
      /></label>
    </div>
    <input
      ref="images"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
      multiple
      hidden
      @change="upload($event, true)"
    /><input ref="files" type="file" multiple hidden @change="upload($event, false)" />
    <div v-if="imageItems.length" class="image-previews">
      <div v-for="a in imageItems" :key="a.id" class="image-preview">
        <AssetImage :id="a.id" :alt="a.name" /><button
          :class="{ selected: coverId === a.id }"
          @click="coverId = coverId === a.id ? '' : a.id"
        >
          {{ coverId === a.id ? '✓ 封面' : '设为封面' }}
        </button>
      </div>
    </div>
    <div class="attachment-editor" v-if="attachments.length">
      <div v-for="a in attachments" :key="a.id">
        <Icon name="Paperclip" :size="14" /><span
          >{{ a.name }} <small>{{ fileSize(a.size) }}</small></span
        ><button :aria-label="`移除 ${a.name}`" @click="remove(a)">
          <Icon name="X" :size="14" />
        </button>
      </div>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div class="composer-footer">
      <div class="upload-actions">
        <button :disabled="busy" @click="images.click()">
          <Icon name="Image" :size="16" />图片</button
        ><button :disabled="busy" @click="files.click()">
          <Icon name="Paperclip" :size="16" />附件</button
        ><span class="draft-state"><Icon name="Check" :size="13" />{{ draftState }}</span>
      </div>
      <div class="button-row">
        <button v-if="post" class="button secondary" @click="cancel">取消</button
        ><button class="button primary" :disabled="busy" @click="submit">
          <Icon :name="post ? 'Check' : 'Send'" :size="15" />{{
            busy ? '正在保存…' : post ? '保存修改' : '发布文章'
          }}
        </button>
      </div>
    </div>
    <p class="storage-note">仅保存在当前浏览器 · 单个文件最大 10 MB</p>
  </section>
</template>
