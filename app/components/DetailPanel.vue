<template>
  <div class="flex min-h-80 flex-col">
    <div
      v-if="!open"
      class="flex min-h-80 flex-col items-center justify-center p-6 text-center text-base text-muted"
    >
      <UIcon
        :name="icon"
        class="mb-3 size-9 text-dimmed"
      />
      {{ empty }}
    </div>
    <div
      v-else
      class="flex flex-col"
    >
      <header class="flex items-start justify-between gap-3 border-b border-default px-4 py-3.5">
        <div class="min-w-0">
          <p class="text-base font-semibold text-highlighted">
            {{ title }}
          </p>
          <p
            v-if="subtitle"
            class="mt-1 text-sm text-muted"
          >
            {{ subtitle }}
          </p>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          size="md"
          square
          :aria-label="$t('actions.close')"
          @click="emit('close')"
        />
      </header>
      <div class="p-4">
        <slot />
      </div>
      <footer
        v-if="$slots.footer"
        class="flex flex-wrap items-center justify-end gap-2 border-t border-default px-4 py-3.5"
      >
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  open?: boolean
  title?: string
  subtitle?: string
  empty?: string
  icon?: string
}>(), {
  open: false,
  title: '',
  subtitle: '',
  empty: '',
  icon: 'i-lucide-panel-right'
})

const emit = defineEmits<{
  close: []
}>()
</script>
