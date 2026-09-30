<template>
  <UButton
    color="neutral"
    variant="ghost"
    size="sm"
    square
    :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
    :aria-label="ariaLabel"
    class="shrink-0"
    @click="toggle"
  />
</template>

<script setup lang="ts">
type Appearance = 'light' | 'dark'

interface ColorModeHelper {
  preference: string
  value: string
  addColorScheme?: (value: string) => void
  removeColorScheme?: (value: string) => void
}

const STORAGE_KEY = 'candor-admin-color-mode'
const colorMode = useColorMode()
const { t } = useI18n()
const pending = ref<Appearance | null>(null)

const actual = computed<Appearance>(() => {
  return colorMode.preference === 'dark' || colorMode.value === 'dark' ? 'dark' : 'light'
})

const isDark = computed(() => (pending.value ?? actual.value) === 'dark')
const ariaLabel = computed(() => t('colorMode.current', {
  mode: isDark.value ? t('colorMode.dark') : t('colorMode.day')
}))

watch(actual, (mode) => {
  if (pending.value === mode) {
    pending.value = null
  }
})

function applyClass(mode: Appearance) {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(mode)

  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // Keep the in-session class even if storage is blocked.
  }

  const helper = (window as Window & { __NUXT_COLOR_MODE__?: ColorModeHelper }).__NUXT_COLOR_MODE__
  if (!helper) {
    return
  }

  helper.removeColorScheme?.(helper.value)
  helper.addColorScheme?.(mode)
  helper.preference = mode
  helper.value = mode
}

function setMode(mode: Appearance) {
  pending.value = mode
  colorMode.preference = mode

  if (import.meta.client) {
    applyClass(mode)
  }
}

function toggle() {
  setMode(isDark.value ? 'light' : 'dark')
}
</script>
