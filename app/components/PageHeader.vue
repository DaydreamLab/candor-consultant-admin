<template>
  <div>
    <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 max-w-3xl">
        <p
          v-if="description"
          class="text-sm text-muted"
        >
          {{ description }}
        </p>
        <p class="mt-2 text-xs text-dimmed">
          {{ hint }}
        </p>
        <p
          v-if="showLock"
          class="mt-2 text-sm text-warning"
        >
          {{ $t('actions.readOnly') }}
        </p>
      </div>
      <div
        v-if="$slots.actions"
        class="flex flex-wrap items-center gap-2"
      >
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </div>
</template>

<script setup lang="ts">
const { hint } = usePageCopy()
const { writable } = useOrgScope()

const props = defineProps<{
  title?: string
  description?: string
  locked?: boolean
}>()

const showLock = computed(() => props.locked ?? !writable.value)
</script>
