<script setup lang="ts">
import {
  defaultCapsuleDoseForItem,
  validateCapsuleDose
} from '~/utils/expert-case-dose'
import {
  reasonIsFilled,
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
const dose = ref('1')
const reason = ref('')
const localError = ref('')
const doseError = ref('')

const title = computed(() => {
  return props.mode === 'add'
    ? t('custom.addItemTitle')
    : t('custom.swapItemTitle')
})

function resetForm() {
  localError.value = ''
  doseError.value = ''
  reason.value = ''
  selectedId.value = props.mode === 'swap' ? (props.initialSellableId || null) : null
  const initial = selectedId.value
    ? props.items.find(row => row.id === selectedId.value) ?? null
    : null
  dose.value = defaultCapsuleDoseForItem(initial)
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
  dose.value = defaultCapsuleDoseForItem(item)
  localError.value = ''
  doseError.value = ''
})

watch(dose, () => {
  if (!dose.value.trim()) {
    doseError.value = ''
    return
  }
  doseError.value = validateCapsuleDose(dose.value).ok
    ? ''
    : t('custom.doseInvalid')
})

function onOpen(value: boolean) {
  emit('update:open', value)
}

function submit() {
  localError.value = ''
  doseError.value = ''
  if (!selectedId.value) {
    localError.value = t('custom.pickerSelectRequired')
    return
  }
  if (!reasonIsFilled(reason.value)) {
    localError.value = t('custom.reasonRequiredMemberFacing')
    return
  }
  const doseCheck = validateCapsuleDose(dose.value)
  if (!doseCheck.ok) {
    doseError.value = t('custom.doseInvalid')
    return
  }
  emit('confirm', {
    sellableItemId: selectedId.value,
    dailyDose: doseCheck.dose,
    reason: reason.value.trim()
  })
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
            ? $t('custom.addItemHint')
            : $t('custom.swapItemHint') }}
        </p>

        <div>
          <p class="mb-2 text-sm font-medium text-highlighted">
            {{ $t('custom.pickerLabel') }}
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
          :label="$t('custom.dose')"
          required
        >
          <CapsuleDoseStepper
            v-model="dose"
            :disabled="busy"
            :invalid="Boolean(doseError)"
            test-id="expert-case-item-change-dose"
          />
          <template #hint>
            <span class="text-muted">
              {{ $t('custom.doseCapsuleHint') }}
            </span>
          </template>
        </UFormField>
        <p
          v-if="doseError"
          class="text-sm text-error"
          data-testid="expert-case-item-change-dose-error"
        >
          {{ doseError }}
        </p>

        <UFormField
          :label="$t('custom.reasonMemberFacing')"
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
              {{ $t('custom.reasonMemberFacingHint') }}
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
        :disabled="busy || catalogPending || Boolean(doseError)"
        :loading="busy"
        data-testid="expert-case-item-change-confirm"
        @click="submit"
      >
        {{ mode === 'add'
          ? $t('custom.addItemConfirm')
          : $t('custom.swapItemConfirm') }}
      </UButton>
    </template>
  </UModal>
</template>
