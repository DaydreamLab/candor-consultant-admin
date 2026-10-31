<script setup lang="ts">
import {
  validateCapsuleDose,
  type ExpertLineDecision
} from '~/utils/expert-case-dose'
import { reasonIsFilled } from '~/utils/expert-case-sellable'

const props = withDefaults(defineProps<{
  open: boolean
  itemTitle: string
  suggestionText?: string
  scoreText?: string
  initialDecision?: ExpertLineDecision | ''
  initialReason?: string
  initialDose?: string
  suggestedCount?: string
  busy?: boolean
}>(), {
  suggestionText: '',
  scoreText: '',
  initialDecision: '',
  initialReason: '',
  initialDose: '1',
  suggestedCount: '1',
  busy: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'apply': [payload: {
    decision: ExpertLineDecision
    reason: string
    dailyDose: number | null
  }]
  'request-swap': []
}>()

const { t } = useI18n()

const decision = ref<ExpertLineDecision | ''>('')
const reason = ref('')
const dose = ref('1')
const localError = ref('')
const doseError = ref('')

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return
    }
    decision.value = props.initialDecision || ''
    reason.value = props.initialReason || ''
    dose.value = props.initialDose || props.suggestedCount || '1'
    localError.value = ''
    doseError.value = ''
  },
  { immediate: true }
)

watch(dose, () => {
  if (decision.value !== 'adjust') {
    doseError.value = ''
    return
  }
  if (!dose.value.trim()) {
    doseError.value = ''
    return
  }
  doseError.value = validateCapsuleDose(dose.value).ok
    ? ''
    : t('expertCaseReviews.doseInvalid')
})

function onOpen(value: boolean) {
  emit('update:open', value)
}

function selectDecision(next: ExpertLineDecision) {
  decision.value = next
  localError.value = ''
  if (next !== 'adjust') {
    doseError.value = ''
  }
}

function requestSwap() {
  emit('request-swap')
}

function submit() {
  localError.value = ''
  doseError.value = ''
  if (!decision.value) {
    localError.value = t('expertCaseReviews.editItemDecisionRequired')
    return
  }
  if (decision.value === 'reject' || decision.value === 'adjust') {
    if (!reasonIsFilled(reason.value)) {
      localError.value = t('expertCaseReviews.reasonRequiredAdminOnly')
      return
    }
  }
  let dailyDose: number | null = null
  if (decision.value === 'adjust') {
    const doseCheck = validateCapsuleDose(dose.value)
    if (!doseCheck.ok) {
      doseError.value = t('expertCaseReviews.doseInvalid')
      return
    }
    dailyDose = doseCheck.dose
  }
  emit('apply', {
    decision: decision.value,
    reason: reason.value.trim(),
    dailyDose
  })
}
</script>

<template>
  <UModal
    :open="open"
    :title="$t('expertCaseReviews.editItemTitle')"
    :ui="{ footer: 'justify-end gap-2' }"
    data-testid="expert-case-item-edit-modal"
    @update:open="onOpen"
  >
    <template #body>
      <div class="space-y-4">
        <div>
          <p
            class="font-medium text-highlighted"
            data-testid="expert-case-item-edit-title"
          >
            {{ itemTitle }}
          </p>
          <p
            v-if="suggestionText || scoreText"
            class="mt-1 text-sm text-muted"
          >
            <span v-if="suggestionText">{{ suggestionText }}</span>
            <span v-if="suggestionText && scoreText"> · </span>
            <span v-if="scoreText">{{ scoreText }}</span>
          </p>
        </div>

        <div>
          <p class="mb-2 text-sm font-medium text-highlighted">
            {{ $t('expertCaseReviews.editItemDecision') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton
              size="sm"
              variant="soft"
              :color="decision === 'approve' ? 'primary' : 'neutral'"
              :disabled="busy"
              data-testid="expert-case-edit-approve"
              @click="selectDecision('approve')"
            >
              {{ $t('expertCaseReviews.approve') }}
            </UButton>
            <UButton
              size="sm"
              color="error"
              variant="soft"
              :disabled="busy"
              data-testid="expert-case-edit-reject"
              @click="selectDecision('reject')"
            >
              {{ $t('expertCaseReviews.reject') }}
            </UButton>
            <UButton
              size="sm"
              color="warning"
              variant="soft"
              :disabled="busy"
              data-testid="expert-case-edit-adjust"
              @click="selectDecision('adjust')"
            >
              {{ $t('expertCaseReviews.adjust') }}
            </UButton>
            <UButton
              size="sm"
              color="primary"
              variant="outline"
              :disabled="busy"
              data-testid="expert-case-edit-swap"
              @click="requestSwap"
            >
              {{ $t('expertCaseReviews.swapItem') }}
            </UButton>
          </div>
        </div>

        <div
          v-if="decision === 'adjust'"
          data-testid="expert-case-edit-dose-row"
        >
          <UFormField
            :label="$t('expertCaseReviews.dose')"
            required
          >
            <CapsuleDoseStepper
              v-model="dose"
              :disabled="busy"
              :invalid="Boolean(doseError)"
              test-id="expert-case-edit-dose"
            />
            <template #hint>
              <span class="text-muted">
                {{ $t('expertCaseReviews.doseCapsuleHint') }}
              </span>
            </template>
          </UFormField>
          <p
            v-if="doseError"
            class="mt-1 text-sm text-error"
            data-testid="expert-case-edit-dose-error"
          >
            {{ doseError }}
          </p>
        </div>

        <UFormField
          :label="decision === 'approve'
            ? $t('expertCaseReviews.reason')
            : $t('expertCaseReviews.reasonAdminOnly')"
          :required="decision === 'reject' || decision === 'adjust'"
        >
          <UTextarea
            v-model="reason"
            :rows="3"
            :disabled="busy"
            data-testid="expert-case-edit-reason"
          />
          <template #hint>
            <span data-testid="expert-case-edit-reason-hint">
              {{ $t('expertCaseReviews.reasonAdminOnlyHint') }}
            </span>
          </template>
        </UFormField>

        <p
          v-if="localError"
          class="text-sm text-error"
          data-testid="expert-case-edit-error"
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
        data-testid="expert-case-edit-cancel"
        @click="close()"
      >
        {{ $t('actions.cancel') }}
      </UButton>
      <UButton
        color="primary"
        :disabled="busy || Boolean(doseError)"
        :loading="busy"
        data-testid="expert-case-edit-confirm"
        @click="submit"
      >
        {{ $t('expertCaseReviews.editItemConfirm') }}
      </UButton>
    </template>
  </UModal>
</template>
