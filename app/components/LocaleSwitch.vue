<template>
  <UButton
    color="neutral"
    variant="ghost"
    size="sm"
    :label="collapsed ? shortLabel : label"
    :aria-label="ariaLabel"
    class="shrink-0"
    @click="toggle"
  />
</template>

<script setup lang="ts">
type LocaleCode = 'zh-TW' | 'en'

withDefaults(defineProps<{
  collapsed?: boolean
}>(), {
  collapsed: false
})

const { locale, setLocale, t } = useI18n({ useScope: 'global' })
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()

const pendingLocale = ref<LocaleCode | null>(null)

const currentLocale = computed<LocaleCode>(() => {
  if (pendingLocale.value) {
    return pendingLocale.value
  }

  if (locale.value === 'en' || route.path === '/en' || route.path.startsWith('/en/')) {
    return 'en'
  }

  return 'zh-TW'
})

const label = computed(() => currentLocale.value === 'en' ? 'EN' : '繁中')
const shortLabel = computed(() => currentLocale.value === 'en' ? 'EN' : '繁')
const ariaLabel = computed(() => t(currentLocale.value === 'en' ? 'locale.en' : 'locale.zhTW'))

watch(locale, (value) => {
  if (pendingLocale.value && value === pendingLocale.value) {
    pendingLocale.value = null
  }
})

async function toggle() {
  await switchTo(currentLocale.value === 'en' ? 'zh-TW' : 'en')
}

async function switchTo(code: LocaleCode) {
  if (code === currentLocale.value) {
    return
  }

  pendingLocale.value = code
  await setLocale(code)

  const path = switchLocalePath(code)
  if (path && path !== route.fullPath && path !== route.path) {
    await navigateTo(path)
  }
}
</script>
