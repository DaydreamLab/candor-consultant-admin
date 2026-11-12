<script setup lang="ts">
import { EXPERT_BOOKING_PRODUCT_FORM_ID } from '~/composables/useNavbarActions'
import {
  buildExpertBookingProductWrite,
  digitsOnlyPrice,
  emptyExpertBookingProductFormState,
  expertBookingProductFormIsDirty,
  expertBookingProductFormStateFromProduct,
  expertBookingProductSaveConfirmKind,
  formatExpertBookingProductUpdatedAt,
  formatPriceNtLabel,
  formatPriceWithComma,
  snapshotFromExpertBookingProduct,
  validateExpertBookingProductForm,
  type ExpertBookingProductFormState,
  type ExpertBookingProductSaveConfirmKind,
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
  'clear-field-error': [field: ExpertBookingProductField]
}>()

const { t } = useI18n()

const state = reactive<ExpertBookingProductFormState>(emptyExpertBookingProductFormState())
const baseline = ref<ExpertBookingProductSnapshot | null>(null)
const localFieldErrors = ref<Partial<Record<ExpertBookingProductField, true>>>({})
const confirmOpen = ref(false)
const confirmKind = ref<ExpertBookingProductSaveConfirmKind>(null)
const pendingPayload = ref<ExpertBookingProductWrite | null>(null)

const fieldsLocked = computed(() => props.disabled || props.saving)
const dirty = computed(() => expertBookingProductFormIsDirty(baseline.value, state))
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
const priceDisplay = computed({
  get: () => formatPriceWithComma(state.price),
  set: (value: string | number) => {
    state.price = digitsOnlyPrice(value)
    clearField('price')
  }
})
const updatedAtText = computed(() => formatExpertBookingProductUpdatedAt(props.product?.updated_at))
const previewPrice = computed(() => formatPriceNtLabel(state.price) || formatPriceNtLabel(0))
const confirmPriceLabel = computed(() => formatPriceNtLabel(pendingPayload.value?.price ?? state.price))

watch(() => props.product, (product) => {
  if (!product) {
    return
  }
  Object.assign(state, expertBookingProductFormStateFromProduct(product))
  baseline.value = snapshotFromExpertBookingProduct(product)
  localFieldErrors.value = {}
  confirmOpen.value = false
  confirmKind.value = null
  pendingPayload.value = null
}, { immediate: true })

watch(dirty, (value) => {
  emit('dirty-change', value)
}, { immediate: true })

function clearField(field: ExpertBookingProductField) {
  if (localFieldErrors.value[field]) {
    localFieldErrors.value = Object.fromEntries(
      Object.entries(localFieldErrors.value).filter(([key]) => key !== field)
    )
  }
  emit('clear-field-error', field)
}

function restore() {
  if (fieldsLocked.value || !props.product) {
    return
  }
  Object.assign(state, expertBookingProductFormStateFromProduct(props.product))
  baseline.value = snapshotFromExpertBookingProduct(props.product)
  localFieldErrors.value = {}
  confirmOpen.value = false
  confirmKind.value = null
  pendingPayload.value = null
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
  const kind = expertBookingProductSaveConfirmKind(baseline.value, state)
  if (kind) {
    pendingPayload.value = payload
    confirmKind.value = kind
    confirmOpen.value = true
    return
  }
  emit('save', payload)
}

function closeConfirm() {
  confirmOpen.value = false
  confirmKind.value = null
  pendingPayload.value = null
}

function confirmSave() {
  const payload = pendingPayload.value
  closeConfirm()
  if (!payload) {
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

const confirmTitle = computed(() => {
  if (confirmKind.value === 'price') {
    return t('expertBookingProduct.confirm.priceTitle')
  }
  if (confirmKind.value === 'inactive') {
    return t('expertBookingProduct.confirm.inactiveTitle')
  }
  if (confirmKind.value === 'price_and_inactive') {
    return t('expertBookingProduct.confirm.bothTitle')
  }
  return ''
})

const confirmPrimaryLabel = computed(() => {
  if (confirmKind.value === 'price') {
    return t('expertBookingProduct.confirm.priceOk')
  }
  if (confirmKind.value === 'inactive') {
    return t('expertBookingProduct.confirm.inactiveOk')
  }
  return t('expertBookingProduct.confirm.bothOk')
})

const confirmPrimaryColor = computed(() => {
  return confirmKind.value === 'price' ? 'primary' : 'error'
})

defineExpose({ restore, dirty })
</script>

<template>
  <form
    :id="EXPERT_BOOKING_PRODUCT_FORM_ID"
    class="mx-auto flex w-full max-w-6xl flex-col gap-8"
    data-testid="expert-booking-product-form"
    @submit.prevent="onSubmit"
  >
    <section
      class="grid grid-cols-2 gap-6"
      data-testid="expert-booking-product-section-names"
    >
      <div class="min-w-0">
        <p class="text-xs font-semibold text-muted">
          {{ $t('expertBookingProduct.columnZh') }}
        </p>
      </div>
      <div class="min-w-0">
        <p class="text-xs font-semibold text-muted">
          {{ $t('expertBookingProduct.columnEn') }}
        </p>
        <p class="mt-1 text-xs text-muted">
          {{ $t('expertBookingProduct.enFallbackHint') }}
        </p>
      </div>

      <UFormField
        :label="$t('expertBookingProduct.fields.name_zh')"
        required
        :error="fieldErrorText('name_zh')"
        :ui="{ label: 'text-xs font-semibold text-muted' }"
      >
        <UInput
          v-model="state.name_zh"
          class="w-full"
          :disabled="fieldsLocked"
          data-testid="expert-booking-product-name-zh"
          @update:model-value="clearField('name_zh')"
        />
      </UFormField>

      <UFormField
        :label="$t('expertBookingProduct.fields.name_en')"
        :error="fieldErrorText('name_en')"
        :ui="{ label: 'text-xs font-semibold text-muted' }"
      >
        <UInput
          v-model="state.name_en"
          class="w-full"
          :disabled="fieldsLocked"
          data-testid="expert-booking-product-name-en"
          @update:model-value="clearField('name_en')"
        />
      </UFormField>

      <UFormField
        :label="$t('expertBookingProduct.fields.description')"
        :error="fieldErrorText('description')"
        :ui="{ label: 'text-xs font-semibold text-muted' }"
      >
        <UTextarea
          v-model="state.description"
          class="w-full"
          :disabled="fieldsLocked"
          :rows="5"
          data-testid="expert-booking-product-description"
          @update:model-value="clearField('description')"
        />
      </UFormField>

      <UFormField
        :label="$t('expertBookingProduct.fields.description_en')"
        :error="fieldErrorText('description_en')"
        :ui="{ label: 'text-xs font-semibold text-muted' }"
      >
        <UTextarea
          v-model="state.description_en"
          class="w-full"
          :disabled="fieldsLocked"
          :rows="5"
          data-testid="expert-booking-product-description-en"
          @update:model-value="clearField('description_en')"
        />
      </UFormField>
    </section>

    <section
      class="grid grid-cols-2 gap-6"
      data-testid="expert-booking-product-section-sale"
    >
      <div class="flex min-w-0 flex-col gap-4">
        <UFormField
          :label="$t('expertBookingProduct.fields.price')"
          required
          :error="fieldErrorText('price')"
          :ui="{ label: 'text-xs font-semibold text-muted' }"
        >
          <UInput
            v-model="priceDisplay"
            inputmode="numeric"
            class="w-full tabular-nums"
            :disabled="fieldsLocked"
            data-testid="expert-booking-product-price"
          >
            <template #leading>
              <span class="text-sm text-muted">NT$</span>
            </template>
          </UInput>
          <template
            v-if="priceChanged && !fieldErrorText('price')"
            #hint
          >
            <span data-testid="expert-booking-product-price-changed">
              {{ $t('expertBookingProduct.priceHint') }}
            </span>
          </template>
        </UFormField>

        <UFormField
          :label="$t('expertBookingProduct.fields.active')"
          :error="fieldErrorText('active')"
          :ui="{ label: 'text-xs font-semibold text-muted' }"
        >
          <USwitch
            v-model="state.active"
            class="w-full"
            :disabled="fieldsLocked"
            data-testid="expert-booking-product-active"
            @update:model-value="clearField('active')"
          />
          <template
            v-if="becameInactive && !fieldErrorText('active')"
            #hint
          >
            <span data-testid="expert-booking-product-inactive-changed">
              {{ $t('expertBookingProduct.inactiveHint') }}
            </span>
          </template>
        </UFormField>

        <p
          v-if="updatedAtText"
          class="text-xs tabular-nums text-muted"
          data-testid="expert-booking-product-updated-at"
        >
          {{ $t('expertBookingProduct.updatedAt', { time: updatedAtText }) }}
        </p>
      </div>

      <div
        class="flex w-full min-w-0 flex-col gap-3 rounded-xl border border-default bg-elevated p-5"
        data-testid="expert-booking-product-preview"
      >
        <p class="text-xs font-semibold text-muted">
          {{ $t('expertBookingProduct.previewLabel') }}
        </p>
        <span
          class="inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium"
          :class="state.active
            ? 'bg-success/15 text-success'
            : 'bg-muted text-muted'"
          data-testid="expert-booking-product-preview-status"
        >
          {{
            state.active
              ? $t('expertBookingProduct.previewBookable')
              : $t('expertBookingProduct.previewInactive')
          }}
        </span>
        <p
          class="text-lg font-semibold text-highlighted"
          data-testid="expert-booking-product-preview-name"
        >
          {{ state.name_zh.trim() || $t('status.na') }}
        </p>
        <p
          class="text-2xl font-semibold tabular-nums text-primary"
          data-testid="expert-booking-product-preview-price"
        >
          {{ previewPrice }}
        </p>
        <p
          class="whitespace-pre-wrap text-sm text-muted"
          data-testid="expert-booking-product-preview-description"
        >
          {{ state.description.trim() || $t('status.na') }}
        </p>
      </div>
    </section>

    <p
      v-if="saveError"
      class="text-sm text-error"
      data-testid="expert-booking-product-form-error"
    >
      {{ saveError }}
    </p>

    <UModal
      v-model:open="confirmOpen"
      :title="confirmTitle"
      :ui="{ footer: 'justify-end gap-2' }"
      @update:open="(open: boolean) => { if (!open) closeConfirm() }"
    >
      <template #body>
        <div
          class="space-y-3 text-sm text-toned"
          data-testid="expert-booking-product-confirm-modal"
        >
          <p v-if="confirmKind === 'price' || confirmKind === 'price_and_inactive'">
            {{ $t('expertBookingProduct.confirm.priceBody', { price: confirmPriceLabel }) }}
          </p>
          <p v-if="confirmKind === 'inactive' || confirmKind === 'price_and_inactive'">
            {{ $t('expertBookingProduct.confirm.inactiveBody') }}
          </p>
        </div>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          data-testid="expert-booking-product-confirm-back"
          @click="closeConfirm"
        >
          {{ $t('expertBookingProduct.confirm.back') }}
        </UButton>
        <UButton
          :color="confirmPrimaryColor"
          data-testid="expert-booking-product-confirm-ok"
          @click="confirmSave"
        >
          {{ confirmPrimaryLabel }}
        </UButton>
      </template>
    </UModal>
  </form>
</template>
