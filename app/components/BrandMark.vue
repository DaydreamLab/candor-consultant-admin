<template>
  <NuxtLink
    :to="localePath('/')"
    active-class=""
    exact-active-class=""
    class="flex min-w-0 rounded-md px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    :class="collapsed ? 'flex-col items-center' : 'flex-col'"
  >
    <span
      class="font-semibold tracking-tight text-highlighted"
      :class="collapsed ? 'text-base' : 'text-lg'"
    >
      {{ collapsed ? $t('brandShort') : $t('brand') }}
    </span>
    <span
      v-if="!collapsed"
      class="text-xs font-medium text-primary"
    >
      {{ $t('brandAdmin') }}
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()

const localePath = useLocalePath()
</script>
