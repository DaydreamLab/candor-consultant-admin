<script setup lang="ts">
import type { ExpertPlanCreate, ExpertPlanWrite } from '~/utils/admin-api'
import { EXPERT_PLAN_FORM_ID } from '~/composables/useNavbarActions'
import {
  applyPackagePlanNameAutofill,
  buildExpertPlanCreate,
  buildExpertPlanPatch,
  emptyExpertPlanCreateState,
  emptyExpertPlanFormState,
  expertPlanFormIsDirty,
  expertPlanFormStateFromPlan,
  snapshotFromExpertPlan,
  validateExpertPlanCreateForm,
  validateExpertPlanForm,
  type ExpertPlanFormField,
  type ExpertPlanFormState,
  type ExpertPlanSnapshot
} from '~/utils/expert-plan-form'

export type ExpertPlanOption = {
  id: string
  label: string
}

const props = withDefaults(defineProps<{
  mode?: 'create' | 'update'
  expertPlan: Record<string, unknown> | null
  packagePlanOptions?: ExpertPlanOption[]
  saving: boolean
  saveError?: string
  disabled?: boolean
  /** expert：鎖名稱／英文名／售價／綁定，僅可改排序與上下架（core #143 `b7c5ed0`）。 */
  namePriceLocked?: boolean
}>(), {
  mode: 'update',
  disabled: false,
  saveError: '',
  namePriceLocked: false,
  packagePlanOptions: () => []
})

const emit = defineEmits<{
  'save': [payload: ExpertPlanWrite | ExpertPlanCreate]
  'no-changes': []
  'dirty-change': [dirty: boolean]
  'cancel': []
}>()

const { t } = useI18n()

const state = reactive<ExpertPlanFormState>(
  props.mode === 'create' ? emptyExpertPlanCreateState() : emptyExpertPlanFormState()
)
const baseline = ref<ExpertPlanSnapshot | null>(null)
const localError = ref('')
const fieldErrors = ref<Partial<Record<ExpertPlanFormField, true>>>({})
/** 上次自動帶入的中文名（換綁定時比對用）。 */
const lastAutoNameZh = ref('')

const fieldsLocked = computed(() => props.disabled || props.saving)
const namePriceDisabled = computed(() => fieldsLocked.value || props.namePriceLocked)
const packagePlanDisabled = computed(() => namePriceDisabled.value)
const isCreate = computed(() => props.mode === 'create')
const formOptions = computed(() => ({
  allowNamePrice: !props.namePriceLocked,
  mode: props.mode
}))
const priceChanged = computed(() => {
  if (isCreate.value || !baseline.value || props.namePriceLocked) {
    return false
  }
  const next = Number(state.price)
  return Number.isFinite(next) && next !== baseline.value.price
})

const packagePlanSelectItems = computed(() => {
  return props.packagePlanOptions.map(option => ({
    label: option.label,
    value: option.id
  }))
})

watch(() => props.expertPlan, (plan) => {
  if (isCreate.value || !plan) {
    return
  }
  Object.assign(state, expertPlanFormStateFromPlan(plan))
  baseline.value = snapshotFromExpertPlan(plan)
  lastAutoNameZh.value = ''
  localError.value = ''
  fieldErrors.value = {}
}, { immediate: true })

watch(() => props.saveError, () => {
  localError.value = ''
})

watch(() => expertPlanFormIsDirty(baseline.value, state, formOptions.value), (dirty) => {
  if (isCreate.value) {
    emit('dirty-change', false)
    return
  }
  emit('dirty-change', dirty)
}, { immediate: true })

function onPackagePlanChange(nextId: string | undefined | null) {
  const id = typeof nextId === 'string' ? nextId : ''
  state.package_plan_id = id
  const option = props.packagePlanOptions.find(item => item.id === id)
  const label = option?.label ?? ''
  state.package_plan_label = label
  if (!id) {
    return
  }
  const applied = applyPackagePlanNameAutofill(state.name_zh, lastAutoNameZh.value, label)
  state.name_zh = applied.nameZh
  lastAutoNameZh.value = applied.autoName
  if (fieldErrors.value.package_plan_id) {
    const next = { ...fieldErrors.value }
    delete next.package_plan_id
    fieldErrors.value = next
  }
}

function onCancel() {
  if (fieldsLocked.value) {
    return
  }
  emit('cancel')
}

function onSubmit() {
  if (fieldsLocked.value) {
    return
  }
  localError.value = ''
  fieldErrors.value = {}

  if (isCreate.value) {
    const issues = validateExpertPlanCreateForm(state)
    if (issues.length) {
      const next: Partial<Record<ExpertPlanFormField, true>> = {}
      for (const issue of issues) {
        next[issue] = true
      }
      fieldErrors.value = next
      return
    }
    emit('save', buildExpertPlanCreate(state))
    return
  }

  if (!baseline.value) {
    return
  }
  const issue = validateExpertPlanForm(state, formOptions.value)
  if (issue === 'price') {
    fieldErrors.value = { price: true }
    return
  }
  if (issue === 'name_zh') {
    fieldErrors.value = { name_zh: true }
    return
  }
  if (issue === 'package_plan_id') {
    fieldErrors.value = { package_plan_id: true }
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

function fieldErrorText(field: ExpertPlanFormField) {
  if (!fieldErrors.value[field]) {
    return undefined
  }
  if (field === 'package_plan_id') {
    return t('expertPlans.packagePlanRequired')
  }
  if (field === 'name_zh') {
    return t('expertPlans.nameRequired')
  }
  if (field === 'price') {
    return t('expertPlans.priceInvalid')
  }
  return t('expertPlans.saveFailed')
}
</script>

<template>
  <form
    :id="EXPERT_PLAN_FORM_ID"
    class="flex max-w-2xl flex-col gap-4"
    data-testid="expert-plan-form"
    @submit.prevent="onSubmit"
  >
    <UFormField
      v-if="!isCreate"
      :label="$t('expertPlans.fields.code')"
    >
      <UInput
        :model-value="state.code"
        disabled
        data-testid="expert-plan-code"
      />
      <template #hint>
        {{ $t('expertPlans.codeHint') }}
      </template>
    </UFormField>

    <UFormField
      :label="$t('expertPlans.fields.package_plan')"
      required
      :error="fieldErrorText('package_plan_id')"
    >
      <USelect
        v-if="!packagePlanDisabled && packagePlanSelectItems.length"
        :model-value="state.package_plan_id || undefined"
        :items="packagePlanSelectItems"
        value-key="value"
        :placeholder="$t('expertPlans.packagePlanPlaceholder')"
        :disabled="packagePlanDisabled"
        class="w-full"
        data-testid="expert-plan-package-plan"
        @update:model-value="onPackagePlanChange"
      />
      <UInput
        v-else
        :model-value="state.package_plan_label || state.package_plan_id"
        disabled
        data-testid="expert-plan-package-plan"
      />
      <template
        v-if="isCreate && !fieldErrors.package_plan_id"
        #hint
      >
        {{ $t('expertPlans.packagePlanCreateHint') }}
      </template>
      <template
        v-else-if="!isCreate && !packagePlanDisabled"
        #hint
      >
        <span data-testid="expert-plan-package-plan-hint">{{ $t('expertPlans.packagePlanHint') }}</span>
      </template>
    </UFormField>

    <UFormField
      :label="$t('expertPlans.fields.name_zh')"
      required
      :error="fieldErrorText('name_zh')"
    >
      <UInput
        v-model="state.name_zh"
        :disabled="namePriceDisabled"
        data-testid="expert-plan-name-zh"
      />
    </UFormField>

    <UFormField :label="$t('expertPlans.fields.name_en')">
      <UInput
        v-model="state.name_en"
        :disabled="namePriceDisabled"
        data-testid="expert-plan-name-en"
      />
      <template #hint>
        {{ $t('expertPlans.nameEnHint') }}
      </template>
    </UFormField>

    <UFormField
      :label="$t('expertPlans.fields.price')"
      required
      :error="fieldErrorText('price')"
    >
      <UInput
        v-model="state.price"
        type="number"
        inputmode="numeric"
        :disabled="namePriceDisabled"
        data-testid="expert-plan-price"
      >
        <template #leading>
          <span class="text-sm text-muted">NT$</span>
        </template>
      </UInput>
      <template
        v-if="priceChanged && !fieldErrors.price"
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
      <template #hint>
        {{ $t('expertPlans.sortOrderHint') }}
      </template>
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
      <template
        v-if="isCreate"
        #hint
      >
        {{ $t('expertPlans.createActiveHint') }}
      </template>
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
