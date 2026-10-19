import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    dedupe: ['vue'],
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  },
  test: {
    environment: 'happy-dom',
    include: ['app/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts']
  }
})
