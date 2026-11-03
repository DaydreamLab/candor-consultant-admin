<script setup lang="ts">
import type { ExpertPlanWrite } from '~/utils/admin-api'
import { EXPERT_PLAN_FORM_ID } from '~/composables/useNavbarActions'
import {
  buildExpertPlanPatch,
  emptyExpertPlanFormState,
  expertPlanFormIsDirty,
  expertPlanFormStateFromPlan,
  snapshotFromExpertPlan,
  validateExpertPlanForm,
  type ExpertPlanFormState,
  type ExpertPlanSnapshot
} from '~/utils/expert-plan-form'

const props = withDefaults(defineProps<{
  expertPlan: Record<string, unknown>
  saving: boolean
  saveError?: string
  disabled?: boolean
  /** expert：鎖名稱／售價，僅可改排序與上下架（Irice 11/4）。 */
  namePriceLocked?: boolean
}>(), {
  disabled: false,
  saveError: '',
  namePriceLocked: false
})

const emit = defineEmits<{
  'save': [payload: ExpertPlanWrite]
  'no-changes': []
  'dirty-change': [dirty: boolean]
  'cancel': []
}>()

const { t } = useI18n()

const state = reactive<ExpertPlanFormState>(emptyExpertPlanFormState())
const baseline = ref<ExpertPlanSnapshot | null>(null)
const localError = ref('')
const fieldError = ref<'price' | null>(null)

const fieldsLocked = computed(() => props.disabled || props.saving)
const namePriceDisabled = computed(() => fieldsLocked.value || props.namePriceLocked)
const formOptions = computed(() => ({ allowNamePrice: !props.namePriceLocked }))
const priceChanged = computed(() => {
  if (!baseline.value || props.namePriceLocked) {
    return false
  }
  const next = Number(state.price)
  return Number.isFinite(next) && next !== baseline.value.price
})

watch(() => props.expertPlan, (plan) => {
  Object.assign(state, expertPlanFormStateFromPlan(plan))
  baseline.value = snapshotFromExpertPlan(plan)
  localError.value = ''
  fieldError.value = null
}, { immediate: true })

watch(() => props.saveError, () => {
  localError.value = ''
})

watch(() => expertPlanFormIsDirty(baseline.value, state, formOptions.value), (dirty) => {
  emit('dirty-change', dirty)
}, { immediate: true })

function onCancel() {
  if (fieldsLocked.value) {
    return
  }
  emit('cancel')
}

function onSubmit() {
  if (fieldsLocked.value || !baseline.value) {
    return
  }
  localError.value = ''
  fieldError.value = null
  const issue = validateExpertPlanForm(state, formOptions.value)
  if (issue === 'price') {
    fieldError.value = 'price'
    return
  }
  if (issue) {
    localError.value = t('expertPlans.saveFailed')
    return
  }
  const patch = buildExpertPlanPatch(baseline.value, state, formOptions.value)
  if (!Object.keys(patch).length) {
    emit('no-changes')
    return
  }
  emit('save', patch)
}
</script>

<template>
  <form
    :id="EXPERT_PLAN_FORM_ID"
    class="flex max-w-2xl flex-col gap-4"
    data-testid="expert-plan-form"
    @submit.prevent="onSubmit"
  >
    <UFormField :label="$t('expertPlans.fields.code')">
      <UInput
        :model-value="state.code"
        disabled
        data-testid="expert-plan-code"
      />
    </UFormField>

    <UFormField :label="$t('expertPlans.fields.package_plan')">
      <UInput
        :model-value="state.package_plan_label"
        disabled
        data-testid="expert-plan-package-plan"
      />
      <template #hint>
        {{ $t('expertPlans.packagePlanHint') }}
      </template>
    </UFormField>

    <UFormField :label="$t('expertPlans.fields.name_zh')">
      <UInput
        v-model="state.name_zh"
        :disabled="namePriceDisabled"
        data-testid="expert-plan-name-zh"
      />
    </UFormField>

    <UFormField
      :label="$t('expertPlans.fields.price')"
      :error="fieldError === 'price' ? $t('expertPlans.priceInvalid') : undefined"
    >
      <UInput
        v-model="state.price"
        type="number"
        inputmode="numeric"
        :disabled="namePriceDisabled"
        data-testid="expert-plan-price"
      />
      <template
        v-if="priceChanged && fieldError !== 'price'"
        #hint
      >
        <span data-testid="expert-plan-price-hint">{{ $t('expertPlans.priceHint') }}</span>
      </template>
    </UFormField>

    <UFormField :label="$t('expertPlans.fields.sort_order')">
      <UInput
        v-model="state.sort_order"
        type="number"
        inputmode="numeric"
        :disabled="fieldsLocked"
        data-testid="expert-plan-sort-order"
      />
    </UFormField>

    <UFormField :label="$t('expertPlans.fields.active')">
      <div class="flex items-center gap-3">
        <USwitch
          v-model="state.active"
          :disabled="fieldsLocked"
          data-testid="expert-plan-active"
        />
        <UBadge
          :color="state.active ? 'success' : 'neutral'"
          variant="subtle"
        >
          {{ state.active ? $t('expertPlans.status.active') : $t('expertPlans.status.inactive') }}
        </UBadge>
      </div>
    </UFormField>

    <p
      v-if="localError || saveError"
      class="text-sm text-error"
      data-testid="expert-plan-form-error"
    >
      {{ localError || saveError }}
    </p>

    <div class="flex flex-wrap gap-2">
      <UButton
        type="submit"
        :loading="saving"
        :disabled="fieldsLocked"
        data-testid="expert-plan-save"
      >
        {{ $t('actions.save') }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        :disabled="fieldsLocked"
        data-testid="expert-plan-cancel"
        @click="onCancel"
      >
        {{ $t('actions.cancel') }}
      </UButton>
    </div>
  </form>
</template>
