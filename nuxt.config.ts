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
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://candor-core.dev.daydream-lab.com/api/v1',
      feSha: process.env.NUXT_PUBLIC_FE_SHA || '',
      /** 本機截圖／預覽用；正式環境勿開 */
      privacyPolicyMock: process.env.NUXT_PUBLIC_PRIVACY_POLICY_MOCK === '1',
      /**
       * CTA 目錄 mock：預設開啟（core Admin API 尚未定案）。
       * core 就緒後設 `NUXT_PUBLIC_CTA_CATALOG_MOCK=0` 改打真實 HTTP。
       */
      ctaCatalogMock: process.env.NUXT_PUBLIC_CTA_CATALOG_MOCK !== '0'
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

  hooks: {
    close: async () => {
      if (process.env.npm_lifecycle_event !== 'generate') {
        return
      }
      const { copyFile, access } = await import('node:fs/promises')
      const { join } = await import('node:path')
      const index = join(process.cwd(), '.output/public/index.html')
      const dest = join(process.cwd(), '.output/public/404.html')
      try {
        await access(index)
        await copyFile(index, dest)
      } catch {
        // generate 未完成時略過
      }
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
