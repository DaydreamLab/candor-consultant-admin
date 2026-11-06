// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  files: ['app/pages/expert/**/*.{vue,js,ts}', 'app/layouts/expert.vue'],
  rules: {
    // Expert-station pages／layout use Nuxt file-based routes (same as app/pages).
    'vue/multi-word-component-names': 'off'
  }
})
