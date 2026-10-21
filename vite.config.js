import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules') &&
            /tiptap|prosemirror|rope-sequence|orderedmap|w3c-keyname/.test(id)
          )
            return 'editor'
        },
      },
    },
  },
  test: { environment: 'jsdom' },
})
