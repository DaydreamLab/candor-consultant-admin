<template>
  <UModal
    :open="open"
    :title="currentTitle"
    :description="currentDescription"
    :ui="{ footer: 'justify-end gap-2' }"
    @update:open="onOpen"
  >
    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        size="md"
        @click="onBack(close)"
      >
        {{ step === 2 ? $t('actions.back') : $t('actions.cancel') }}
      </UButton>
      <UButton
        :color="color"
        size="md"
        @click="onPrimary(close)"
      >
        {{ primaryLabel }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  color?: 'error' | 'primary' | 'warning'
  double?: boolean
}>(), {
  title: '',
  description: '',
  confirmLabel: '',
  color: 'error',
  double: undefined
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

const { t } = useI18n()
const step = ref(1)
const useDouble = computed(() => props.double ?? props.color === 'error')

const currentTitle = computed(() => {
  if (useDouble.value && step.value === 2) {
    return t('actions.confirmAgainTitle')
  }
  return props.title || t('actions.confirmTitle')
})

const currentDescription = computed(() => {
  if (useDouble.value && step.value === 2) {
    return t('actions.confirmAgainBody')
  }
  return props.description || t('actions.confirmBody')
})

const primaryLabel = computed(() => {
  if (useDouble.value && step.value === 1) {
    return t('actions.confirmNext')
  }
  return props.confirmLabel || t('actions.delete')
})

watch(() => props.open, (open) => {
  if (open) {
    step.value = 1
  }
})

function onOpen(value: boolean) {
  if (!value) {
    step.value = 1
  }
  emit('update:open', value)
}

function onBack(close: () => void) {
  if (useDouble.value && step.value === 2) {
    step.value = 1
    return
  }
  close()
}

function onPrimary(_close: () => void) {
  if (useDouble.value && step.value === 1) {
    step.value = 2
    return
  }
  emit('confirm')
}
</script>
