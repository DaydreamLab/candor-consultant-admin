// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  files: ['app/surfaces/expert/pages/**/*.{vue,js,ts}', 'app/surfaces/expert/layouts/**/*.{vue,js,ts}'],
  rules: {
    // Expert-station surface uses Nuxt file-based routes/layouts (same as app/pages).
    'vue/multi-word-component-names': 'off'
  }
})
