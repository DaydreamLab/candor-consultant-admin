<template>
  <NuxtLink
    :to="localePath('/')"
    active-class=""
    exact-active-class=""
    class="flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    :class="collapsed ? 'size-12 shrink-0 justify-center -mx-2' : 'min-w-0 px-1'"
  >
    <img
      :src="src"
      :alt="collapsed ? $t('brandShort') : `${$t('brand')} ${$t('brandAdmin')}`"
      class="object-contain"
      :class="collapsed ? 'size-12 shrink-0' : 'h-8 w-auto max-w-full'"
    >
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  collapsed?: boolean
}>()

const localePath = useLocalePath()
const colorMode = useColorMode()
const runtimeConfig = useRuntimeConfig()

const src = computed(() => {
  const file = props.collapsed
    ? '/brand/candor-mark.png'
    : colorMode.value === 'dark'
      ? '/brand/candor-logo-dark.png'
      : '/brand/candor-logo.png'
  return withAppBase(runtimeConfig.app.baseURL, file)
})
</script>
