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
}>(), {
  disabled: false,
  saveError: ''
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

const fieldsLocked = computed(() => props.disabled || props.saving)

watch(() => props.expertPlan, (plan) => {
  Object.assign(state, expertPlanFormStateFromPlan(plan))
  baseline.value = snapshotFromExpertPlan(plan)
  localError.value = ''
}, { immediate: true })

watch(() => props.saveError, () => {
  localError.value = ''
})

watch(() => expertPlanFormIsDirty(baseline.value, state), (dirty) => {
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
  const issue = validateExpertPlanForm(state)
  if (issue) {
    localError.value = t('expertPlans.saveFailed')
    return
  }
  const patch = buildExpertPlanPatch(baseline.value, state)
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
        :disabled="fieldsLocked"
        data-testid="expert-plan-name-zh"
      />
    </UFormField>

    <UFormField :label="$t('expertPlans.fields.name_en')">
      <UInput
        v-model="state.name_en"
        :disabled="fieldsLocked"
        data-testid="expert-plan-name-en"
      />
    </UFormField>

    <UFormField :label="$t('expertPlans.fields.price')">
      <UInput
        v-model="state.price"
        type="number"
        inputmode="numeric"
        :disabled="fieldsLocked"
        data-testid="expert-plan-price"
      />
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
      <USwitch
        v-model="state.active"
        :disabled="fieldsLocked"
        data-testid="expert-plan-active"
      />
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
