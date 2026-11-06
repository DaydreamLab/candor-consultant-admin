<script setup lang="ts">
import { EXPERT_BOOKING_PRODUCT_FORM_ID } from '~/composables/useNavbarActions'
import {
  buildExpertBookingProductWrite,
  emptyExpertBookingProductFormState,
  expertBookingProductFormIsDirty,
  expertBookingProductFormStateFromProduct,
  snapshotFromExpertBookingProduct,
  validateExpertBookingProductForm,
  type ExpertBookingProductFormState,
  type ExpertBookingProductSnapshot
} from '~/utils/expert-booking-product-form'
import type {
  ExpertBookingProduct,
  ExpertBookingProductField,
  ExpertBookingProductFieldErrors,
  ExpertBookingProductWrite
} from '~/utils/expert-booking-product-types'

const props = withDefaults(defineProps<{
  product: ExpertBookingProduct | null
  saving: boolean
  saveError?: string
  fieldErrors?: ExpertBookingProductFieldErrors
  disabled?: boolean
}>(), {
  disabled: false,
  saveError: '',
  fieldErrors: () => ({})
})

const emit = defineEmits<{
  'save': [payload: ExpertBookingProductWrite]
  'no-changes': []
  'dirty-change': [dirty: boolean]
  'cancel': []
  'clear-field-error': [field: ExpertBookingProductField]
}>()

const { t } = useI18n()

const state = reactive<ExpertBookingProductFormState>(emptyExpertBookingProductFormState())
const baseline = ref<ExpertBookingProductSnapshot | null>(null)
const localFieldErrors = ref<Partial<Record<ExpertBookingProductField, true>>>({})

const fieldsLocked = computed(() => props.disabled || props.saving)
const priceChanged = computed(() => {
  if (!baseline.value || fieldsLocked.value) {
    return false
  }
  const next = Number(state.price)
  return Number.isFinite(next) && next !== baseline.value.price
})
const becameInactive = computed(() => {
  if (!baseline.value || fieldsLocked.value) {
    return false
  }
  return baseline.value.active && !state.active
})

watch(() => props.product, (product) => {
  if (!product) {
    return
  }
  Object.assign(state, expertBookingProductFormStateFromProduct(product))
  baseline.value = snapshotFromExpertBookingProduct(product)
  localFieldErrors.value = {}
}, { immediate: true })

watch(() => expertBookingProductFormIsDirty(baseline.value, state), (dirty) => {
  emit('dirty-change', dirty)
}, { immediate: true })

function onCancel() {
  if (fieldsLocked.value) {
    return
  }
  emit('cancel')
}

function clearField(field: ExpertBookingProductField) {
  if (localFieldErrors.value[field]) {
    localFieldErrors.value = Object.fromEntries(
      Object.entries(localFieldErrors.value).filter(([key]) => key !== field)
    )
  }
  emit('clear-field-error', field)
}

function onSubmit() {
  if (fieldsLocked.value) {
    return
  }
  localFieldErrors.value = {}
  const issue = validateExpertBookingProductForm(state)
  if (issue) {
    localFieldErrors.value = { [issue]: true }
    return
  }
  if (!baseline.value) {
    return
  }
  if (!expertBookingProductFormIsDirty(baseline.value, state)) {
    emit('no-changes')
    return
  }
  const payload = buildExpertBookingProductWrite(state)
  if (!payload) {
    localFieldErrors.value = { price: true }
    return
  }
  emit('save', payload)
}

function fieldErrorText(field: ExpertBookingProductField) {
  const server = props.fieldErrors?.[field]
  if (server) {
    return server
  }
  if (!localFieldErrors.value[field]) {
    return undefined
  }
  if (field === 'name_zh') {
    return t('expertBookingProduct.validation.nameRequired')
  }
  if (field === 'price') {
    return t('expertBookingProduct.validation.priceInvalid')
  }
  return t('expertBookingProduct.saveFailed')
}
</script>

<template>
  <form
    :id="EXPERT_BOOKING_PRODUCT_FORM_ID"
    class="flex max-w-2xl flex-col gap-4"
    data-testid="expert-booking-product-form"
    @submit.prevent="onSubmit"
  >
    <UAlert
      color="neutral"
      variant="subtle"
      :title="$t('expertBookingProduct.hintsTitle')"
      data-testid="expert-booking-product-hints"
    >
      <template #description>
        <ul class="mt-1 list-disc space-y-1 pl-4 text-sm">
          <li>{{ $t('expertBookingProduct.priceHint') }}</li>
          <li>{{ $t('expertBookingProduct.inactiveHint') }}</li>
        </ul>
      </template>
    </UAlert>

    <UFormField :label="$t('expertBookingProduct.fields.code')">
      <UInput
        :model-value="state.code"
        disabled
        data-testid="expert-booking-product-code"
      />
      <template #hint>
        {{ $t('expertBookingProduct.codeHint') }}
      </template>
    </UFormField>

    <UFormField
      :label="$t('expertBookingProduct.fields.name_zh')"
      required
      :error="fieldErrorText('name_zh')"
    >
      <UInput
        v-model="state.name_zh"
        :disabled="fieldsLocked"
        data-testid="expert-booking-product-name-zh"
        @update:model-value="clearField('name_zh')"
      />
    </UFormField>

    <UFormField
      :label="$t('expertBookingProduct.fields.name_en')"
      :error="fieldErrorText('name_en')"
    >
      <UInput
        v-model="state.name_en"
        :disabled="fieldsLocked"
        data-testid="expert-booking-product-name-en"
        @update:model-value="clearField('name_en')"
      />
      <template #hint>
        {{ $t('expertBookingProduct.nameEnHint') }}
      </template>
    </UFormField>

    <UFormField
      :label="$t('expertBookingProduct.fields.description')"
      :error="fieldErrorText('description')"
    >
      <UTextarea
        v-model="state.description"
        :disabled="fieldsLocked"
        :rows="4"
        data-testid="expert-booking-product-description"
        @update:model-value="clearField('description')"
      />
    </UFormField>

    <UFormField
      :label="$t('expertBookingProduct.fields.price')"
      required
      :error="fieldErrorText('price')"
    >
      <UInput
        v-model="state.price"
        type="number"
        inputmode="numeric"
        :disabled="fieldsLocked"
        data-testid="expert-booking-product-price"
        @update:model-value="clearField('price')"
      >
        <template #leading>
          <span class="text-sm text-muted">NT$</span>
        </template>
      </UInput>
      <template
        v-if="priceChanged && !fieldErrorText('price')"
        #hint
      >
        <span data-testid="expert-booking-product-price-changed">{{ $t('expertBookingProduct.priceHint') }}</span>
      </template>
    </UFormField>

    <UFormField
      :label="$t('expertBookingProduct.fields.active')"
      :error="fieldErrorText('active')"
    >
      <div class="flex items-center gap-3">
        <USwitch
          v-model="state.active"
          :disabled="fieldsLocked"
          data-testid="expert-booking-product-active"
          @update:model-value="clearField('active')"
        />
        <UBadge
          :color="state.active ? 'success' : 'neutral'"
          variant="subtle"
        >
          {{ state.active ? $t('expertBookingProduct.status.active') : $t('expertBookingProduct.status.inactive') }}
        </UBadge>
      </div>
      <template
        v-if="becameInactive && !fieldErrorText('active')"
        #hint
      >
        <span data-testid="expert-booking-product-inactive-changed">{{ $t('expertBookingProduct.inactiveHint') }}</span>
      </template>
    </UFormField>

    <p
      v-if="saveError"
      class="text-sm text-error"
      data-testid="expert-booking-product-form-error"
    >
      {{ saveError }}
    </p>

    <div class="flex flex-wrap gap-2">
      <UButton
        type="submit"
        :loading="saving"
        :disabled="fieldsLocked"
        data-testid="expert-booking-product-save"
      >
        {{ $t('actions.save') }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        :disabled="fieldsLocked"
        data-testid="expert-booking-product-cancel"
        @click="onCancel"
      >
        {{ $t('actions.cancel') }}
      </UButton>
    </div>
  </form>
</template>
