<script setup lang="ts">
import type { PackagePlanWrite } from '~/utils/admin-api'
import { PACKAGE_PLAN_FORM_ID } from '~/composables/useNavbarActions'
import { money } from '~/utils/format'
import { packagePlanBudget } from '~/utils/package-plan-budget'

const PRESET_DAYS = [30, 60, 90] as const

const props = withDefaults(defineProps<{
  packagePlan: Record<string, unknown>
  saving: boolean
  saveError?: string
  disabled?: boolean
}>(), {
  disabled: false,
  saveError: ''
})

const emit = defineEmits<{
  save: [payload: PackagePlanWrite]
}>()

const { t } = useI18n()

type FormState = {
  code: string
  name_zh: string
  name_en: string
  description: string
  price: string
  period_days: number
  sort_order: string
  active: boolean
}

const state = reactive<FormState>(emptyState())
const localError = ref('')

const fieldsLocked = computed(() => props.disabled || props.saving)

const periodOptions = computed(() => {
  const values = new Set<number>([...PRESET_DAYS])
  if (Number.isFinite(state.period_days) && state.period_days > 0) {
    values.add(state.period_days)
  }
  return [...values]
    .sort((a, b) => a - b)
    .map(value => ({
      label: String(value),
      value
    }))
})

const budget = computed(() => {
  const price = Number(state.price)
  return packagePlanBudget(price, state.period_days)
})

watch(() => props.packagePlan, (plan) => {
  applyPlan(plan)
  localError.value = ''
}, { immediate: true })

watch(() => props.saveError, () => {
  localError.value = ''
})

function onSubmit() {
  if (fieldsLocked.value) {
    return
  }
  localError.value = ''
  const nameZh = state.name_zh.trim()
  if (!nameZh) {
    localError.value = t('packagePlans.saveFailed')
    return
  }
  const price = Number(state.price)
  if (!Number.isInteger(price) || price <= 0) {
    localError.value = t('packagePlans.saveFailed')
    return
  }
  const periodDays = Math.trunc(state.period_days)
  if (!Number.isFinite(periodDays) || periodDays <= 0) {
    localError.value = t('packagePlans.saveFailed')
    return
  }
  const sortOrder = state.sort_order.trim() === '' ? 0 : Number(state.sort_order)
  if (!Number.isInteger(sortOrder)) {
    localError.value = t('packagePlans.saveFailed')
    return
  }

  emit('save', {
    name_zh: nameZh,
    name_en: state.name_en.trim() || null,
    description: state.description.trim() || null,
    price,
    period_days: periodDays,
    sort_order: sortOrder,
    active: state.active
  })
}

function applyPlan(plan: Record<string, unknown>) {
  state.code = textOf(plan.code)
  state.name_zh = textOf(plan.name_zh) || textOf(plan.name)
  state.name_en = textOf(plan.name_en)
  state.description = textOf(plan.description)
  state.price = numberText(plan.price)
  state.period_days = positiveInt(plan.period_days) ?? 30
  state.sort_order = numberText(plan.sort_order, '0')
  state.active = plan.active !== false
}

function emptyState(): FormState {
  return {
    code: '',
    name_zh: '',
    name_en: '',
    description: '',
    price: '',
    period_days: 30,
    sort_order: '0',
    active: true
  }
}

function textOf(value: unknown) {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function numberText(value: unknown, fallback = '') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return String(Number(value))
  }
  return fallback
}

function positiveInt(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isInteger(n) && n > 0) {
      return n
    }
  }
  return null
}

function moneyText(value: number) {
  return money(value)
}
</script>

<template>
  <form
    :id="PACKAGE_PLAN_FORM_ID"
    class="flex flex-col gap-6"
    @submit.prevent="onSubmit"
  >
    <p
      v-if="localError || saveError"
      class="text-sm text-error"
    >
      {{ localError || saveError }}
    </p>

    <div class="grid gap-4 rounded-xl border border-default bg-elevated p-4 md:grid-cols-2">
      <UFormField :label="$t('packagePlans.fields.code')">
        <UInput
          v-model="state.code"
          disabled
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('packagePlans.fields.active')">
        <USwitch
          v-model="state.active"
          :disabled="fieldsLocked"
        />
      </UFormField>
      <UFormField :label="$t('packagePlans.fields.name_zh')">
        <UInput
          v-model="state.name_zh"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('packagePlans.fields.name_en')">
        <UInput
          v-model="state.name_en"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('packagePlans.fields.price')">
        <UInput
          v-model="state.price"
          type="number"
          min="1"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('packagePlans.fields.period_days')">
        <USelect
          v-model="state.period_days"
          :items="periodOptions"
          value-key="value"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('packagePlans.fields.sort_order')">
        <UInput
          v-model="state.sort_order"
          type="number"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
        />
      </UFormField>
      <UFormField
        class="md:col-span-2"
        :label="$t('packagePlans.fields.description')"
      >
        <UTextarea
          v-model="state.description"
          :disabled="fieldsLocked"
          :rows="3"
          class="w-full"
        />
      </UFormField>
    </div>

    <dl
      v-if="budget"
      class="grid grid-cols-2 gap-3 rounded-xl border border-default bg-elevated p-4 text-sm md:grid-cols-4"
    >
      <div>
        <dt class="text-muted">
          {{ $t('packagePlans.fields.price') }}
        </dt>
        <dd class="tabular-money mt-1 font-medium text-highlighted">
          {{ moneyText(Number(state.price) || 0) }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">
          {{ $t('packagePlans.fields.period_days') }}
        </dt>
        <dd class="mt-1 font-medium text-highlighted">
          {{ state.period_days }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">
          {{ $t('packagePlans.dailyBudget') }}
        </dt>
        <dd class="tabular-money mt-1 font-medium text-highlighted">
          {{ moneyText(budget.dailyBudget) }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">
          {{ $t('packagePlans.remainder') }}
        </dt>
        <dd class="tabular-money mt-1 font-medium text-highlighted">
          {{ moneyText(budget.remainder) }}
        </dd>
        <p class="mt-1 text-xs text-muted">
          {{ $t('packagePlans.remainderHint') }}
        </p>
      </div>
    </dl>
  </form>
</template>
