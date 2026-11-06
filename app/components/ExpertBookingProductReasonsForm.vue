<script setup lang="ts">
import type {
  ExpertBookingProductPickDraft,
  ExpertBookingSellableOption
} from '~/utils/expert-booking-types'

const props = defineProps<{
  options: ExpertBookingSellableOption[]
  modelValue: ExpertBookingProductPickDraft[]
  pending?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ExpertBookingProductPickDraft[]]
  'save': []
}>()

const { locale } = useI18n()

function itemLabel(option: ExpertBookingSellableOption) {
  return String(locale.value).startsWith('en')
    ? (option.name_en || option.name_zh)
    : (option.name_zh || option.name_en)
}

function isChecked(id: string) {
  return props.modelValue.some(row => row.sellable_item_id === id)
}

function reasonFor(id: string) {
  return props.modelValue.find(row => row.sellable_item_id === id)?.reason ?? ''
}

function toggle(option: ExpertBookingSellableOption, checked: boolean | 'indeterminate') {
  if (props.disabled || props.pending) {
    return
  }
  const on = checked === true
  if (on) {
    if (isChecked(option.id)) {
      return
    }
    emit('update:modelValue', [
      ...props.modelValue,
      {
        sellable_item_id: option.id,
        name_zh: option.name_zh,
        name_en: option.name_en,
        reason: ''
      }
    ])
    return
  }
  emit('update:modelValue', props.modelValue.filter(row => row.sellable_item_id !== option.id))
}

function setReason(option: ExpertBookingSellableOption, reason: string) {
  emit('update:modelValue', props.modelValue.map((row) => {
    if (row.sellable_item_id !== option.id) {
      return row
    }
    return { ...row, reason }
  }))
}
</script>

<template>
  <div
    class="space-y-4"
    data-testid="expert-booking-product-reasons"
  >
    <div
      v-for="option in options"
      :key="option.id"
      class="rounded-lg border border-default p-3"
    >
      <UCheckbox
        :model-value="isChecked(option.id)"
        :label="itemLabel(option)"
        :disabled="disabled || pending"
        @update:model-value="toggle(option, $event)"
      />
      <UInput
        v-if="isChecked(option.id)"
        class="mt-2"
        :model-value="reasonFor(option.id)"
        :placeholder="$t('expertBookings.selections.reasonPlaceholder')"
        :disabled="disabled || pending"
        @update:model-value="setReason(option, String($event))"
      />
    </div>

    <UButton
      color="primary"
      :loading="pending"
      :disabled="disabled"
      data-testid="expert-booking-product-reasons-save"
      @click="emit('save')"
    >
      <slot name="save-label">
        {{ $t('expertBookings.selections.save') }}
      </slot>
    </UButton>
  </div>
</template>
