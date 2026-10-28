<script setup lang="ts">
import {
  filterSellablePickRows,
  type SellablePickRow
} from '~/utils/expert-case-sellable'

const props = withDefaults(defineProps<{
  items: SellablePickRow[]
  modelValue: string | null
  pending?: boolean
  errorMessage?: string
  disabled?: boolean
}>(), {
  pending: false,
  errorMessage: '',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const query = ref('')

const filtered = computed(() => filterSellablePickRows(props.items, query.value))

function select(id: string) {
  if (props.disabled || props.pending) {
    return
  }
  emit('update:modelValue', id)
}

function isSelected(id: string) {
  return props.modelValue === id
}

function optionMeta(row: SellablePickRow) {
  const parts: string[] = []
  const idPart = row.sku || row.code
  if (idPart) {
    parts.push(idPart)
  }
  if (row.spec_text) {
    parts.push(row.spec_text)
  }
  return parts.join(' · ')
}
</script>

<template>
  <div
    class="space-y-3"
    data-testid="expert-case-sellable-picker"
  >
    <UInput
      v-model="query"
      :placeholder="$t('expertCaseReviews.pickerSearch')"
      icon="i-lucide-search"
      size="sm"
      :disabled="disabled || pending"
      data-testid="expert-case-sellable-picker-search"
    />

    <p
      v-if="pending"
      class="text-sm text-muted"
      data-testid="expert-case-sellable-picker-loading"
    >
      {{ $t('expertCaseReviews.pickerLoading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
      data-testid="expert-case-sellable-picker-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="!filtered.length"
      class="text-sm text-muted"
      data-testid="expert-case-sellable-picker-empty"
    >
      {{ query.trim() ? $t('expertCaseReviews.pickerEmptySearch') : $t('expertCaseReviews.pickerEmpty') }}
    </p>
    <ul
      v-else
      class="max-h-64 divide-y divide-default overflow-y-auto rounded-lg border border-default"
      data-testid="expert-case-sellable-picker-list"
    >
      <li
        v-for="row in filtered"
        :key="row.id"
      >
        <button
          type="button"
          class="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-elevated"
          :class="isSelected(row.id) ? 'bg-primary/10 ring-inset ring-1 ring-primary' : ''"
          :disabled="disabled || pending"
          :data-testid="`expert-case-sellable-picker-option-${row.id}`"
          @click="select(row.id)"
        >
          <span class="font-medium text-highlighted">
            {{ row.name }}
          </span>
          <span class="text-xs text-muted">
            {{ optionMeta(row) }}
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
