<script setup lang="ts">
import type { PackagePlanWrite } from '~/utils/admin-api'
import { PACKAGE_PLAN_FORM_ID } from '~/composables/useNavbarActions'
import { money } from '~/utils/format'
import { packagePlanBudget } from '~/utils/package-plan-budget'
import {
  buildPackagePlanPatch,
  emptyPackagePlanFormState,
  moveFeatureRow,
  originalPriceErrorMessage,
  packagePlanFormIsDirty,
  packagePlanFormStateFromPlan,
  snapshotFromPlan,
  validatePackagePlanForm,
  type PackagePlanFormState,
  type PackagePlanSnapshot
} from '~/utils/package-plan-form'

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
  'save': [payload: PackagePlanWrite]
  'dirty-change': [dirty: boolean]
  'cancel': []
}>()

const { t } = useI18n()

const state = reactive<PackagePlanFormState>(emptyPackagePlanFormState())
const baseline = ref<PackagePlanSnapshot | null>(null)
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

const originalPriceError = computed(() => originalPriceErrorMessage(state, {
  emptyInvalid: t('packagePlans.validation.originalPriceInteger'),
  belowPrice: price => t('packagePlans.validation.originalPriceMin', { price })
}) ?? undefined)

watch(() => props.packagePlan, (plan) => {
  applyPlan(plan)
  localError.value = ''
}, { immediate: true })

watch(() => props.saveError, () => {
  localError.value = ''
})

watch(() => packagePlanFormIsDirty(baseline.value, state), (dirty) => {
  emit('dirty-change', dirty)
}, { immediate: true })

function onCancel() {
  if (fieldsLocked.value) {
    return
  }
  emit('cancel')
}

function resetToBaseline() {
  if (!baseline.value || !props.packagePlan) {
    return
  }
  applyPlan(props.packagePlan)
  localError.value = ''
}

function onSubmit() {
  if (fieldsLocked.value || !baseline.value) {
    return
  }
  localError.value = ''
  const issue = validatePackagePlanForm(state)
  if (issue) {
    if (issue.field === 'original_price') {
      localError.value = originalPriceError.value || t('packagePlans.saveFailed')
      return
    }
    localError.value = t('packagePlans.saveFailed')
    return
  }
  const patch = buildPackagePlanPatch(baseline.value, state)
  if (!Object.keys(patch).length) {
    return
  }
  emit('save', patch)
}

function applyPlan(plan: Record<string, unknown>) {
  Object.assign(state, packagePlanFormStateFromPlan(plan))
  baseline.value = snapshotFromPlan(plan)
}

defineExpose({
  resetToBaseline,
  isDirty: () => packagePlanFormIsDirty(baseline.value, state)
})

function addFeature(localeKey: 'home_features_zh' | 'home_features_en') {
  state[localeKey].push('')
}

function removeFeature(localeKey: 'home_features_zh' | 'home_features_en', index: number) {
  state[localeKey].splice(index, 1)
}

function shiftFeature(
  localeKey: 'home_features_zh' | 'home_features_en',
  index: number,
  direction: -1 | 1
) {
  state[localeKey] = moveFeatureRow(state[localeKey], index, direction)
}

function moneyText(value: number) {
  return money(value)
}
</script>

<template>
  <form
    :id="PACKAGE_PLAN_FORM_ID"
    class="flex flex-col gap-6"
    novalidate
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
      <UFormField
        :label="$t('packagePlans.fields.original_price')"
        :error="originalPriceError"
      >
        <UInput
          v-model="state.original_price"
          type="number"
          inputmode="numeric"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('packagePlans.originalPriceHint') }}
        </p>
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
      <UFormField :label="$t('packagePlans.fields.pack_capacity')">
        <UInput
          v-model="state.pack_capacity"
          type="number"
          min="1"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('packagePlans.packCapacityHint') }}
        </p>
      </UFormField>
      <UFormField :label="$t('packagePlans.fields.core_count')">
        <UInput
          v-model="state.core_count"
          type="number"
          min="1"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('packagePlans.coreCountHint') }}
        </p>
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

    <section class="flex flex-col gap-4 rounded-xl border border-default bg-elevated p-4">
      <h2 class="text-sm font-semibold text-highlighted">
        {{ $t('packagePlans.sections.home') }}
      </h2>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField :label="$t('packagePlans.fields.home_badge_zh')">
          <UInput
            v-model="state.home_badge_zh"
            :disabled="fieldsLocked"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('packagePlans.fields.home_badge_en')">
          <UInput
            v-model="state.home_badge_en"
            :disabled="fieldsLocked"
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-2"
          :label="$t('packagePlans.fields.home_highlight')"
        >
          <USwitch
            v-model="state.home_highlight"
            :disabled="fieldsLocked"
          />
        </UFormField>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-medium text-highlighted">
              {{ $t('packagePlans.fields.home_features_zh') }}
            </h3>
            <UButton
              type="button"
              size="xs"
              variant="soft"
              icon="i-lucide-plus"
              :disabled="fieldsLocked"
              @click="addFeature('home_features_zh')"
            >
              {{ $t('packagePlans.actions.addFeature') }}
            </UButton>
          </div>
          <p class="text-xs text-muted">
            {{ $t('packagePlans.homeFeaturesHint') }}
          </p>
          <div
            v-for="(_, index) in state.home_features_zh"
            :key="`zh-${index}`"
            class="flex items-center gap-2"
          >
            <UInput
              v-model="state.home_features_zh[index]"
              :disabled="fieldsLocked"
              class="min-w-0 flex-1"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              icon="i-lucide-arrow-up"
              :disabled="fieldsLocked || index === 0"
              :aria-label="$t('packagePlans.actions.moveFeatureUp')"
              @click="shiftFeature('home_features_zh', index, -1)"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              icon="i-lucide-arrow-down"
              :disabled="fieldsLocked || index === state.home_features_zh.length - 1"
              :aria-label="$t('packagePlans.actions.moveFeatureDown')"
              @click="shiftFeature('home_features_zh', index, 1)"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              :disabled="fieldsLocked"
              :aria-label="$t('packagePlans.actions.removeFeature')"
              @click="removeFeature('home_features_zh', index)"
            />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-medium text-highlighted">
              {{ $t('packagePlans.fields.home_features_en') }}
            </h3>
            <UButton
              type="button"
              size="xs"
              variant="soft"
              icon="i-lucide-plus"
              :disabled="fieldsLocked"
              @click="addFeature('home_features_en')"
            >
              {{ $t('packagePlans.actions.addFeature') }}
            </UButton>
          </div>
          <p class="text-xs text-muted">
            {{ $t('packagePlans.homeFeaturesHint') }}
          </p>
          <div
            v-for="(_, index) in state.home_features_en"
            :key="`en-${index}`"
            class="flex items-center gap-2"
          >
            <UInput
              v-model="state.home_features_en[index]"
              :disabled="fieldsLocked"
              class="min-w-0 flex-1"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              icon="i-lucide-arrow-up"
              :disabled="fieldsLocked || index === 0"
              :aria-label="$t('packagePlans.actions.moveFeatureUp')"
              @click="shiftFeature('home_features_en', index, -1)"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              icon="i-lucide-arrow-down"
              :disabled="fieldsLocked || index === state.home_features_en.length - 1"
              :aria-label="$t('packagePlans.actions.moveFeatureDown')"
              @click="shiftFeature('home_features_en', index, 1)"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              :disabled="fieldsLocked"
              :aria-label="$t('packagePlans.actions.removeFeature')"
              @click="removeFeature('home_features_en', index)"
            />
          </div>
        </div>
      </div>
    </section>

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

    <div
      v-if="!disabled"
      class="flex flex-wrap gap-2"
    >
      <UButton
        type="button"
        variant="outline"
        :disabled="fieldsLocked"
        @click="onCancel"
      >
        {{ $t('actions.cancel') }}
      </UButton>
    </div>
  </form>
</template>
