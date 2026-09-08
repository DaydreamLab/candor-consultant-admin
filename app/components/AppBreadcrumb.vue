<template>
  <nav
    class="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-muted"
    :aria-label="$t('form.breadcrumb')"
  >
    <template
      v-for="(item, index) in items"
      :key="`${item.to ?? item.label}-${index}`"
    >
      <UIcon
        v-if="index > 0"
        name="i-lucide-chevron-right"
        class="size-3.5 text-dimmed"
      />
      <NuxtLink
        v-if="item.to && index < items.length - 1"
        :to="item.to"
        class="hover:text-highlighted"
      >
        {{ item.label }}
      </NuxtLink>
      <span
        v-else
        :class="index === items.length - 1 ? 'font-medium text-highlighted' : ''"
      >
        {{ item.label }}
      </span>
    </template>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  items: Array<{ label: string, to?: string }>
}>()
</script>
