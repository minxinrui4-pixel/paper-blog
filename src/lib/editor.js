import Image from '@tiptap/extension-image'

// Stored HTML deliberately contains no temporary blob URL. Parse by asset ID,
// then let the editor restore the current session's URL from IndexedDB.
export const LocalImage = Image.extend({
  parseHTML() {
    return [{ tag: 'img[data-asset-id]' }]
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-asset-id'),
        renderHTML: (attrs) => (attrs.assetId ? { 'data-asset-id': attrs.assetId } : {}),
      },
    }
  },
})
