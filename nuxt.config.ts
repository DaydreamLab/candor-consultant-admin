/** Independent expert-station build: `NUXT_APP_SURFACE=expert pnpm run build:expert` */
const isExpertSurface = process.env.NUXT_APP_SURFACE === 'expert'

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
    storageKey: isExpertSurface ? 'candor-expert-color-mode' : 'candor-admin-color-mode'
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://candor-core.dev.daydream-lab.com/api/v1',
      feSha: process.env.NUXT_PUBLIC_FE_SHA || '',
      /** prod tag 部署寫入（如 `v1.2.3`）；本機／未設時畫面顯示 `dev` */
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || '',
      /** admin | expert — surface identity for UI copy／guards */
      appSurface: isExpertSurface ? 'expert' : 'admin',
      /** 本機截圖／預覽用；正式環境勿開 */
      privacyPolicyMock: process.env.NUXT_PUBLIC_PRIVACY_POLICY_MOCK === '1',
      /**
       * CTA 目錄 mock：本機預設開啟；GitHub Pages deploy workflow 設 `NUXT_PUBLIC_CTA_CATALOG_MOCK=0` 打 candor-core Admin API。
       */
      ctaCatalogMock: process.env.NUXT_PUBLIC_CTA_CATALOG_MOCK !== '0',
      /** 定稿對話文案本機 mock；正式／Pages 勿開。預設打 core finalize-copy/generate。 */
      expertFinalizeCopyMock: process.env.NUXT_PUBLIC_EXPERT_FINALIZE_COPY_MOCK === '1',
      /**
       * 專人預約 mock：本機／專家站預設開啟；core API 合併後可設 `NUXT_PUBLIC_EXPERT_BOOKING_MOCK=0`。
       */
      expertBookingMock: process.env.NUXT_PUBLIC_EXPERT_BOOKING_MOCK !== '0'
    }
  },

  /**
   * Expert station uses its own pages／layouts／middleware under
   * `app/surfaces/expert/*` while sharing utils／stores／components.
   */
  dir: {
    pages: isExpertSurface ? 'surfaces/expert/pages' : 'pages',
    layouts: isExpertSurface ? 'surfaces/expert/layouts' : 'layouts',
    middleware: isExpertSurface ? 'surfaces/expert/middleware' : 'middleware'
  },

  routeRules: {},

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
