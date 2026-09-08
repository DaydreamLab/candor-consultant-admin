<script setup lang="ts">
const { locale, t } = useI18n()

useHead({
  title: t('meta.title'),
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  htmlAttrs: {
    lang: locale
  },
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap'
    }
  ]
})

useSeoMeta({
  title: t('meta.title'),
  description: t('meta.description')
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
