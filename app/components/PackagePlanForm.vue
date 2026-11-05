<script setup lang="ts">
import type { PackagePlanCreate, PackagePlanWrite } from '~/utils/admin-api'
import { PACKAGE_PLAN_FORM_ID } from '~/composables/useNavbarActions'
import { money } from '~/utils/format'
import { packagePlanBudget } from '~/utils/package-plan-budget'
import {
  buildPackagePlanCreate,
  buildPackagePlanPatch,
  emptyPackagePlanCreateState,
  emptyPackagePlanFormState,
  moveFeatureRow,
  originalPriceErrorMessage,
  packagePlanFormIsDirty,
  packagePlanFormStateFromPlan,
  snapshotFromPlan,
  validatePackagePlanCreateFields,
  validatePackagePlanForm,
  type PackagePlanCreateField,
  type PackagePlanCreateFieldErrors,
  type PackagePlanFormState,
  type PackagePlanSnapshot
} from '~/utils/package-plan-form'

const props = withDefaults(defineProps<{
  mode?: 'create' | 'update'
  packagePlan: Record<string, unknown> | null
  saving: boolean
  saveError?: string
  disabled?: boolean
}>(), {
  mode: 'update',
  disabled: false,
  saveError: ''
})

const emit = defineEmits<{
  'save': [payload: PackagePlanWrite | PackagePlanCreate]
  'no-changes': []
  'dirty-change': [dirty: boolean]
  'cancel': []
}>()

const { t } = useI18n()

const isCreate = computed(() => props.mode === 'create')
const state = reactive<PackagePlanFormState>(
  isCreate.value ? emptyPackagePlanCreateState() : emptyPackagePlanFormState()
)
const baseline = ref<PackagePlanSnapshot | null>(null)
const localError = ref('')
const createFieldErrors = ref<PackagePlanCreateFieldErrors>({})

const fieldsLocked = computed(() => props.disabled || props.saving)

const budget = computed(() => {
  const price = Number(state.price)
  return packagePlanBudget(price, state.period_days)
})

const originalPriceError = computed(() => {
  if (isCreate.value && !createFieldErrors.value.original_price) {
    return undefined
  }
  return originalPriceErrorMessage(state, {
    emptyInvalid: t('plans.validation.originalPriceInteger'),
    belowPrice: price => t('plans.validation.originalPriceMin', { price })
  }) ?? undefined
})

const showCreateTopError = computed(() => {
  return isCreate.value && Object.keys(createFieldErrors.value).length > 0
})

watch(() => props.packagePlan, (plan) => {
  if (isCreate.value) {
    Object.assign(state, emptyPackagePlanCreateState())
    baseline.value = null
    localError.value = ''
    createFieldErrors.value = {}
    return
  }
  if (!plan) {
    return
  }
  applyPlan(plan)
  localError.value = ''
  createFieldErrors.value = {}
}, { immediate: true })

watch(() => props.saveError, () => {
  localError.value = ''
})

watch(() => packagePlanFormIsDirty(baseline.value, state), (dirty) => {
  if (isCreate.value) {
    emit('dirty-change', false)
    return
  }
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
  if (fieldsLocked.value) {
    return
  }
  localError.value = ''
  createFieldErrors.value = {}

  if (isCreate.value) {
    const errors = validatePackagePlanCreateFields(state)
    if (Object.keys(errors).length) {
      createFieldErrors.value = errors
      return
    }
    emit('save', buildPackagePlanCreate(state))
    return
  }

  if (!baseline.value) {
    return
  }
  const issue = validatePackagePlanForm(state)
  if (issue) {
    if (issue.field === 'original_price') {
      localError.value = originalPriceError.value || t('plans.saveFailed')
      return
    }
    localError.value = t('plans.saveFailed')
    return
  }
  const patch = buildPackagePlanPatch(baseline.value, state)
  if (!Object.keys(patch).length) {
    emit('no-changes')
    return
  }
  emit('save', patch)
}

function applyPlan(plan: Record<string, unknown>) {
  Object.assign(state, packagePlanFormStateFromPlan(plan))
  // 天數固定 30、唯讀（DESIGN v1）：顯示現況但不可改；表單鎖死為目前值。
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

function createError(field: PackagePlanCreateField) {
  if (!createFieldErrors.value[field]) {
    return undefined
  }
  if (field === 'name_zh') {
    return t('plans.validation.nameZhRequired')
  }
  if (field === 'price') {
    return t('plans.validation.pricePositive')
  }
  if (field === 'pack_capacity') {
    return t('plans.validation.packCapacityMin')
  }
  if (field === 'core_count') {
    return t('plans.validation.coreCountRange')
  }
  if (field === 'original_price') {
    return originalPriceErrorMessage(state, {
      emptyInvalid: t('plans.validation.originalPriceInteger'),
      belowPrice: price => t('plans.validation.originalPriceMin', { price })
    }) ?? t('plans.validation.originalPriceInteger')
  }
  return t('plans.saveFailed')
}
</script>

<template>
  <form
    :id="PACKAGE_PLAN_FORM_ID"
    class="flex flex-col gap-6"
    novalidate
    data-testid="package-plan-form"
    @submit.prevent="onSubmit"
  >
    <div
      class="rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm text-highlighted"
      data-testid="package-plan-ai-hint"
    >
      {{ $t('plans.aiComposeHint') }}
    </div>

    <p
      v-if="showCreateTopError"
      class="text-sm font-medium text-error"
      data-testid="package-plan-create-top-error"
    >
      {{ $t('plans.validation.fixFixFields') }}
    </p>
    <p
      v-else-if="localError || saveError"
      class="text-sm text-error"
      data-testid="package-plan-form-error"
    >
      {{ localError || saveError }}
    </p>

    <div class="grid gap-4 rounded-xl border border-default bg-elevated p-4 md:grid-cols-2">
      <UFormField
        v-if="!isCreate"
        :label="$t('plans.fields.code')"
      >
        <UInput
          v-model="state.code"
          disabled
          class="w-full"
          data-testid="package-plan-code"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('plans.codeHint') }}
        </p>
      </UFormField>
      <UFormField :label="$t('plans.fields.active')">
        <div class="flex flex-wrap items-center gap-3">
          <USwitch
            v-model="state.active"
            :disabled="fieldsLocked"
            data-testid="package-plan-active"
          />
          <UBadge
            :color="state.active ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ state.active ? $t('plans.status.active') : $t('plans.status.inactive') }}
          </UBadge>
        </div>
        <p
          v-if="isCreate"
          class="mt-1 text-xs text-muted"
        >
          {{ $t('plans.createActiveHint') }}
        </p>
      </UFormField>
      <UFormField
        :label="$t('plans.fields.name_zh')"
        required
        :error="createError('name_zh')"
      >
        <UInput
          v-model="state.name_zh"
          :disabled="fieldsLocked"
          :placeholder="isCreate ? $t('plans.nameZhPlaceholder') : undefined"
          class="w-full"
          data-testid="package-plan-name-zh"
        />
      </UFormField>
      <UFormField :label="$t('plans.fields.name_en')">
        <UInput
          v-model="state.name_en"
          :disabled="fieldsLocked"
          class="w-full"
          data-testid="package-plan-name-en"
        />
      </UFormField>
      <UFormField
        :label="$t('plans.fields.price')"
        required
        :error="createError('price')"
      >
        <UInput
          v-model="state.price"
          type="number"
          min="1"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
          data-testid="package-plan-price"
        />
      </UFormField>
      <UFormField
        :label="$t('plans.fields.original_price')"
        :error="isCreate ? createError('original_price') : originalPriceError"
      >
        <UInput
          v-model="state.original_price"
          type="number"
          inputmode="numeric"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
          data-testid="package-plan-original-price"
        />
        <p
          v-if="!(isCreate && createFieldErrors.original_price)"
          class="mt-1 text-xs text-muted"
        >
          {{ $t('plans.originalPriceHint') }}
        </p>
      </UFormField>
      <UFormField :label="$t('plans.fields.period_days')">
        <UInput
          :model-value="String(state.period_days || 30)"
          disabled
          class="w-full"
          data-testid="package-plan-period-days"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('plans.periodDaysHint') }}
        </p>
      </UFormField>
      <UFormField
        :label="$t('plans.fields.pack_capacity')"
        required
        :error="createError('pack_capacity')"
      >
        <UInput
          v-model="state.pack_capacity"
          type="number"
          min="1"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
          data-testid="package-plan-pack-capacity"
        />
        <p
          v-if="!(isCreate && createFieldErrors.pack_capacity)"
          class="mt-1 text-xs text-muted"
        >
          {{ $t('plans.packCapacityHint') }}
        </p>
      </UFormField>
      <UFormField
        :label="$t('plans.fields.core_count')"
        required
        :error="createError('core_count')"
      >
        <UInput
          v-model="state.core_count"
          type="number"
          min="1"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
          data-testid="package-plan-core-count"
        />
        <p
          v-if="!(isCreate && createFieldErrors.core_count)"
          class="mt-1 text-xs text-muted"
        >
          {{ $t('plans.coreCountHint') }}
        </p>
      </UFormField>
      <UFormField
        :label="$t('plans.fields.sort_order')"
        :error="createError('sort_order')"
      >
        <UInput
          v-model="state.sort_order"
          type="number"
          step="1"
          :disabled="fieldsLocked"
          class="w-full"
          data-testid="package-plan-sort-order"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('plans.sortOrderHint') }}
        </p>
      </UFormField>
      <UFormField
        class="md:col-span-2"
        :label="$t('plans.fields.description')"
      >
        <UTextarea
          v-model="state.description"
          :disabled="fieldsLocked"
          :rows="3"
          class="w-full"
          data-testid="package-plan-description"
        />
      </UFormField>
      <UFormField
        class="md:col-span-2"
        :label="$t('plans.fields.description_en')"
      >
        <UTextarea
          v-model="state.description_en"
          :disabled="fieldsLocked"
          :rows="3"
          class="w-full"
          data-testid="package-plan-description-en"
        />
        <p class="mt-1 text-xs text-muted">
          {{ $t('plans.descriptionEnHint') }}
        </p>
      </UFormField>
    </div>

    <section class="flex flex-col gap-4 rounded-xl border border-default bg-elevated p-4">
      <h2 class="text-sm font-semibold text-highlighted">
        {{ $t('plans.sections.home') }}
      </h2>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField :label="$t('plans.fields.home_badge_zh')">
          <UInput
            v-model="state.home_badge_zh"
            :disabled="fieldsLocked"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="$t('plans.fields.home_badge_en')">
          <UInput
            v-model="state.home_badge_en"
            :disabled="fieldsLocked"
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-2"
          :label="$t('plans.fields.home_highlight')"
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
              {{ $t('plans.fields.home_features_zh') }}
            </h3>
            <UButton
              type="button"
              size="xs"
              variant="soft"
              icon="i-lucide-plus"
              :disabled="fieldsLocked"
              @click="addFeature('home_features_zh')"
            >
              {{ $t('plans.actions.addFeature') }}
            </UButton>
          </div>
          <p class="text-xs text-muted">
            {{ $t('plans.homeFeaturesHint') }}
          </p>
          <p
            v-if="!state.home_features_zh.length"
            class="text-sm text-muted"
          >
            {{ $t('plans.featuresEmpty') }}
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
              :aria-label="$t('plans.actions.moveFeatureUp')"
              @click="shiftFeature('home_features_zh', index, -1)"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              icon="i-lucide-arrow-down"
              :disabled="fieldsLocked || index === state.home_features_zh.length - 1"
              :aria-label="$t('plans.actions.moveFeatureDown')"
              @click="shiftFeature('home_features_zh', index, 1)"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              :disabled="fieldsLocked"
              :aria-label="$t('plans.actions.removeFeature')"
              @click="removeFeature('home_features_zh', index)"
            />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-medium text-highlighted">
              {{ $t('plans.fields.home_features_en') }}
            </h3>
            <UButton
              type="button"
              size="xs"
              variant="soft"
              icon="i-lucide-plus"
              :disabled="fieldsLocked"
              @click="addFeature('home_features_en')"
            >
              {{ $t('plans.actions.addFeature') }}
            </UButton>
          </div>
          <p class="text-xs text-muted">
            {{ $t('plans.homeFeaturesHint') }}
          </p>
          <p
            v-if="!state.home_features_en.length"
            class="text-sm text-muted"
          >
            {{ $t('plans.featuresEmpty') }}
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
              :aria-label="$t('plans.actions.moveFeatureUp')"
              @click="shiftFeature('home_features_en', index, -1)"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              icon="i-lucide-arrow-down"
              :disabled="fieldsLocked || index === state.home_features_en.length - 1"
              :aria-label="$t('plans.actions.moveFeatureDown')"
              @click="shiftFeature('home_features_en', index, 1)"
            />
            <UButton
              type="button"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              :disabled="fieldsLocked"
              :aria-label="$t('plans.actions.removeFeature')"
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
          {{ $t('plans.fields.price') }}
        </dt>
        <dd class="tabular-money mt-1 font-medium text-highlighted">
          {{ moneyText(Number(state.price) || 0) }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">
          {{ $t('plans.fields.period_days') }}
        </dt>
        <dd class="mt-1 font-medium text-highlighted">
          {{ state.period_days }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">
          {{ $t('plans.dailyBudget') }}
        </dt>
        <dd class="tabular-money mt-1 font-medium text-highlighted">
          {{ moneyText(budget.dailyBudget) }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">
          {{ $t('plans.remainder') }}
        </dt>
        <dd class="tabular-money mt-1 font-medium text-highlighted">
          {{ moneyText(budget.remainder) }}
        </dd>
        <p class="mt-1 text-xs text-muted">
          {{ $t('plans.remainderHint') }}
        </p>
      </div>
    </dl>

    <div
      v-if="!disabled"
      class="flex flex-wrap gap-2"
    >
      <UButton
        v-if="isCreate"
        type="submit"
        :loading="saving"
        :disabled="fieldsLocked"
        data-testid="package-plan-save"
      >
        {{ $t('actions.save') }}
      </UButton>
      <UButton
        type="button"
        variant="outline"
        :disabled="fieldsLocked"
        data-testid="package-plan-cancel"
        @click="onCancel"
      >
        {{ $t('actions.cancel') }}
      </UButton>
    </div>
  </form>
</template>
