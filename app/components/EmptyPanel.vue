<template>
  <div
    class="rounded-xl border bg-elevated p-8 text-center text-base text-muted"
    :class="dashed ? 'border-dashed border-default' : 'border-default'"
  >
    <p
      v-if="title"
      class="mb-2 text-base font-medium text-default"
    >
      {{ title }}
    </p>
    <p>
      {{ description || $t('table.empty') }}
    </p>
    <div
      v-if="$slots.default"
      class="mt-4 flex flex-wrap items-center justify-center gap-2"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  /** 虛線邊框（空態基線，見設計稿） */
  dashed?: boolean
}>(), {
  dashed: false
})
</script>
