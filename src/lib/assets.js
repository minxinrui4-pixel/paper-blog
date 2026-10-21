export const MAX_FILE_SIZE = 10 * 1024 * 1024
let dbPromise
const urls = new Map()
function database() {
  if (!dbPromise)
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('paper-blog-assets', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('files', { keyPath: 'id' })
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => db.close()
        resolve(db)
      }
      request.onerror = () => {
        dbPromise = null
        reject(request.error)
      }
    })
  return dbPromise
}
async function transact(mode, action) {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', mode)
    const req = action(tx.objectStore('files'))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error || new Error('附件保存失败'))
  })
}
export async function storeFile(file) {
  if (file.size > MAX_FILE_SIZE) throw new Error('单个文件不能超过 10 MB')
  const asset = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
  }
  await transact('readwrite', (store) => store.put(asset))
  const { blob, ...meta } = asset
  return meta
}
export const readAsset = (id) => transact('readonly', (store) => store.get(id))
export async function assetUrl(id) {
  if (!id) return ''
  if (urls.has(id)) return urls.get(id)
  const item = await readAsset(id)
  if (!item) return ''
  const url = URL.createObjectURL(item.blob)
  urls.set(id, url)
  return url
}
export async function collectAssets(keep) {
  const all = await transact('readonly', (store) => store.getAllKeys())
  for (const id of all)
    if (!keep.has(id)) {
      await transact('readwrite', (store) => store.delete(id))
      if (urls.has(id)) URL.revokeObjectURL(urls.get(id))
      urls.delete(id)
    }
}
export function releaseUrls() {
  for (const url of urls.values()) URL.revokeObjectURL(url)
  urls.clear()
}
