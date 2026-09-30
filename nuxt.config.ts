export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/i18n'
  ],

  ssr: false,

  devtools: {
    enabled: true
  },

  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/'
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
    storageKey: 'candor-admin-color-mode'
  },

  runtimeConfig: {
    public: {
      apiBase: 'https://candor-core.dev.daydream-lab.com/api/v1'
    }
  },

  routeRules: {
    '/inventory': { redirect: '/products' },
    '/key-in': { redirect: '/selections' },
    '/en/inventory': { redirect: '/en/products' },
    '/en/key-in': { redirect: '/en/selections' }
  },

  compatibilityDate: '2026-09-08',

  // Project Pages 深連結／整頁重整時，用 404.html 回落到 SPA。
  nitro: {
    preset: 'github_pages'
  },

  vite: {
    resolve: {
      dedupe: ['vue']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    defaultLocale: 'zh-TW',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    locales: [
      { code: 'zh-TW', language: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    }
  }
})
