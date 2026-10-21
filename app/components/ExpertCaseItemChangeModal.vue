<script setup lang="ts">
import {
  defaultDoseForItem,
  reasonIsFilled,
  validateDailyDose,
  type ExpertCaseItemChangeMode,
  type SellablePickRow
} from '~/utils/expert-case-sellable'

const props = withDefaults(defineProps<{
  open: boolean
  mode: ExpertCaseItemChangeMode
  items: SellablePickRow[]
  catalogPending?: boolean
  catalogError?: string
  busy?: boolean
  /** Preselect when swapping (original line product). */
  initialSellableId?: string | null
}>(), {
  catalogPending: false,
  catalogError: '',
  busy: false,
  initialSellableId: null
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [payload: {
    sellableItemId: string
    dailyDose: number
    reason: string
  }]
}>()

const { t } = useI18n()

const selectedId = ref<string | null>(null)
const dose = ref('')
const reason = ref('')
const localError = ref('')

const selectedItem = computed(() => {
  if (!selectedId.value) {
    return null
  }
  return props.items.find(row => row.id === selectedId.value) ?? null
})

const title = computed(() => {
  return props.mode === 'add'
    ? t('expertCaseReviews.addItemTitle')
    : t('expertCaseReviews.swapItemTitle')
})

function resetForm() {
  localError.value = ''
  reason.value = ''
  selectedId.value = props.mode === 'swap' ? (props.initialSellableId || null) : null
  const initial = selectedId.value
    ? props.items.find(row => row.id === selectedId.value) ?? null
    : null
  dose.value = defaultDoseForItem(initial)
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return
    }
    resetForm()
  },
  { immediate: true }
)

watch(selectedId, (id, prev) => {
  if (!props.open || id === prev) {
    return
  }
  const item = props.items.find(row => row.id === id) ?? null
  dose.value = defaultDoseForItem(item)
  localError.value = ''
})

function onOpen(value: boolean) {
  emit('update:open', value)
}

function submit() {
  localError.value = ''
  if (!selectedId.value) {
    localError.value = t('expertCaseReviews.pickerSelectRequired')
    return
  }
  if (!reasonIsFilled(reason.value)) {
    localError.value = t('expertCaseReviews.reasonRequiredMemberFacing')
    return
  }
  const doseCheck = validateDailyDose(dose.value, selectedItem.value)
  if (!doseCheck.ok) {
    localError.value = doseErrorMessage(doseCheck)
    return
  }
  emit('confirm', {
    sellableItemId: selectedId.value,
    dailyDose: doseCheck.dose,
    reason: reason.value.trim()
  })
}

function doseErrorMessage(
  check: Exclude<ReturnType<typeof validateDailyDose>, { ok: true }>
) {
  if (check.code === 'required' || check.code === 'invalid') {
    return t('expertCaseReviews.doseInvalid')
  }
  if (check.code === 'below_min') {
    return t('expertCaseReviews.doseBelowMin', { min: check.min })
  }
  return t('expertCaseReviews.doseAboveMax', { max: check.max })
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :ui="{ footer: 'justify-end gap-2' }"
    data-testid="expert-case-item-change-modal"
    @update:open="onOpen"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">
          {{ mode === 'add'
            ? $t('expertCaseReviews.addItemHint')
            : $t('expertCaseReviews.swapItemHint') }}
        </p>

        <div>
          <p class="mb-2 text-sm font-medium text-highlighted">
            {{ $t('expertCaseReviews.pickerLabel') }}
          </p>
          <ExpertCaseSellableItemPicker
            v-model="selectedId"
            :items="items"
            :pending="catalogPending"
            :error-message="catalogError"
            :disabled="busy"
          />
        </div>

        <UFormField
          :label="$t('expertCaseReviews.dose')"
          required
        >
          <UInput
            v-model="dose"
            type="number"
            step="0.1"
            size="sm"
            :disabled="busy"
            data-testid="expert-case-item-change-dose"
          />
          <template
            v-if="selectedItem && selectedItem.daily_servings_min !== null && selectedItem.daily_servings_max !== null"
            #hint
          >
            {{ $t('expertCaseReviews.pickerDoseRange', {
              min: selectedItem.daily_servings_min,
              max: selectedItem.daily_servings_max
            }) }}
          </template>
        </UFormField>

        <UFormField
          :label="$t('expertCaseReviews.reasonMemberFacing')"
          required
        >
          <UTextarea
            v-model="reason"
            :rows="3"
            :disabled="busy"
            data-testid="expert-case-item-change-reason"
          />
          <template #hint>
            <span data-testid="expert-case-item-change-reason-hint">
              {{ $t('expertCaseReviews.reasonMemberFacingHint') }}
            </span>
          </template>
        </UFormField>

        <p
          v-if="localError"
          class="text-sm text-error"
          data-testid="expert-case-item-change-error"
        >
          {{ localError }}
        </p>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton
        color="neutral"
        variant="outline"
        :disabled="busy"
        data-testid="expert-case-item-change-cancel"
        @click="close()"
      >
        {{ $t('actions.cancel') }}
      </UButton>
      <UButton
        color="primary"
        :disabled="busy || catalogPending"
        :loading="busy"
        data-testid="expert-case-item-change-confirm"
        @click="submit"
      >
        {{ mode === 'add'
          ? $t('expertCaseReviews.addItemConfirm')
          : $t('expertCaseReviews.swapItemConfirm') }}
      </UButton>
    </template>
  </UModal>
</template>
