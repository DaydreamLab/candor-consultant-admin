<script setup lang="ts">
import { EXPERT_BOOKING_PRODUCT_FORM_ID, bindNavbarActions } from '~/composables/useNavbarActions'
import { useDirtyLeaveModal } from '~/composables/useDirtyLeaveModal'
import { operatorRoles } from '~/utils/operator-roles'
import {
  ExpertBookingProductApiError,
  adminGetExpertBookingProduct,
  adminPutExpertBookingProduct
} from '~/utils/expert-booking-product-api'
import {
  canEditExpertBookingProduct,
  canViewExpertBookingProduct
} from '~/utils/expert-booking-product-access'
import type {
  ExpertBookingProduct,
  ExpertBookingProductField,
  ExpertBookingProductFieldErrors,
  ExpertBookingProductWrite
} from '~/utils/expert-booking-product-types'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const session = useSessionStore()
const { set } = bindNavbarActions()

const canView = computed(() => canViewExpertBookingProduct(operatorRoles(session.operator)))
const canEdit = computed(() => canEditExpertBookingProduct(operatorRoles(session.operator)))

const product = ref<ExpertBookingProduct | null>(null)
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const fieldErrors = ref<ExpertBookingProductFieldErrors>({})
const formDirty = ref(false)
const saveNotice = ref<'success' | 'noChanges' | null>(null)
const forbiddenSave = ref(false)

const {
  leaveOpen,
  requestLeave,
  stay,
  discardAndLeave,
  allowNavigationWithoutConfirm
} = useDirtyLeaveModal(formDirty)

watch([saving, pending, product, locale, canEdit], () => {
  if (pending.value || !product.value || !canEdit.value) {
    set(null)
    return
  }
  set({
    showDelete: false,
    deleteDisabled: false,
    deleting: false,
    busy: saving.value,
    onDelete: () => {},
    primaryLabel: t('actions.save'),
    primaryLoading: saving.value,
    primaryForm: EXPERT_BOOKING_PRODUCT_FORM_ID,
    onPrimary: null
  })
}, { immediate: true })

if (import.meta.client) {
  watch(canView, (ok) => {
    if (!ok && !pending.value) {
      void navigateTo(localePath('/expert-bookings'))
    }
  }, { immediate: true })

  void load()
}

async function load() {
  product.value = null
  errorMessage.value = ''
  fieldErrors.value = {}
  formDirty.value = false
  saveNotice.value = null
  forbiddenSave.value = false

  const token = readOperatorToken()
  if (!token || !canView.value) {
    pending.value = false
    errorMessage.value = t('expertBookingProduct.failed')
    return
  }

  pending.value = true
  try {
    product.value = await adminGetExpertBookingProduct(config.public.apiBase, token)
    errorMessage.value = ''
  } catch (error) {
    product.value = null
    errorMessage.value = failText(error, t('expertBookingProduct.failed'))
  } finally {
    pending.value = false
  }
}

async function onSave(payload: ExpertBookingProductWrite) {
  const token = readOperatorToken()
  if (!token || !canEdit.value) {
    forbiddenSave.value = true
    errorMessage.value = t('expertBookingProduct.saveForbidden')
    return
  }

  saving.value = true
  errorMessage.value = ''
  fieldErrors.value = {}
  saveNotice.value = null
  forbiddenSave.value = false
  try {
    product.value = await adminPutExpertBookingProduct(config.public.apiBase, token, payload)
    formDirty.value = false
    saveNotice.value = 'success'
  } catch (error) {
    if (error instanceof ExpertBookingProductApiError && error.statusCode === 403) {
      forbiddenSave.value = true
      errorMessage.value = failText(error, t('expertBookingProduct.saveForbidden'))
      return
    }
    if (error instanceof ExpertBookingProductApiError && error.statusCode === 422) {
      fieldErrors.value = { ...error.fields }
      errorMessage.value = failText(error, t('expertBookingProduct.validationFailed'))
      return
    }
    errorMessage.value = failText(error, t('expertBookingProduct.saveFailed'))
  } finally {
    saving.value = false
  }
}

function onNoChanges() {
  saveNotice.value = 'noChanges'
  errorMessage.value = ''
  fieldErrors.value = {}
  forbiddenSave.value = false
}

async function onCancel() {
  const ok = await requestLeave()
  if (!ok) {
    return
  }
  allowNavigationWithoutConfirm()
  void navigateTo(localePath('/expert-bookings'))
}

function onClearFieldError(field: ExpertBookingProductField) {
  if (!fieldErrors.value[field]) {
    return
  }
  fieldErrors.value = Object.fromEntries(
    Object.entries(fieldErrors.value).filter(([key]) => key !== field)
  )
}

watch(formDirty, (dirty) => {
  if (dirty) {
    saveNotice.value = null
    forbiddenSave.value = false
  }
})

function failText(error: unknown, fallback: string) {
  const message = error instanceof ExpertBookingProductApiError
    ? error.message.trim()
    : error instanceof Error
      ? error.message.trim()
      : ''
  return message || fallback
}
</script>

<template>
  <PageHeader
    :title="$t('nav.expertBookingProduct')"
    :description="$t('expertBookingProduct.description')"
    plain
  >
    <UAlert
      v-if="saveNotice === 'success' && product"
      color="success"
      variant="subtle"
      class="mb-4"
      :title="$t('expertBookingProduct.saveOk')"
      data-testid="expert-booking-product-save-ok"
    />
    <UAlert
      v-if="saveNotice === 'noChanges' && product"
      color="neutral"
      variant="subtle"
      class="mb-4"
      :title="$t('expertBookingProduct.noChanges')"
    />
    <UAlert
      v-if="forbiddenSave"
      color="error"
      variant="subtle"
      class="mb-4"
      :title="$t('expertBookingProduct.saveForbidden')"
      data-testid="expert-booking-product-forbidden"
    />
    <p
      v-else-if="errorMessage"
      class="mb-4 text-sm text-error"
      data-testid="expert-booking-product-page-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="!canEdit && product && !pending"
      class="mb-4 text-sm text-muted"
      data-testid="expert-booking-product-readonly"
    >
      {{ $t('expertBookingProduct.readOnlyHint') }}
    </p>
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('expertBookingProduct.loading') }}
    </p>
    <ExpertBookingProductForm
      v-else-if="product && canView"
      :product="product"
      :disabled="!canEdit"
      :saving="saving"
      :save-error="forbiddenSave ? '' : errorMessage"
      :field-errors="fieldErrors"
      @dirty-change="formDirty = $event"
      @cancel="onCancel"
      @no-changes="onNoChanges"
      @save="onSave"
      @clear-field-error="onClearFieldError"
    />

    <UModal
      :open="leaveOpen"
      :title="$t('expertBookingProduct.leaveTitle')"
      :description="$t('expertBookingProduct.leaveBody')"
      :ui="{ footer: 'justify-end gap-2' }"
      @update:open="(open: boolean) => { if (!open) stay() }"
    >
      <template #body>
        <p
          class="sr-only"
          data-testid="expert-booking-product-leave-modal"
        >
          {{ $t('expertBookingProduct.leaveTitle') }}
        </p>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          data-testid="expert-booking-product-leave-stay"
          @click="stay"
        >
          {{ $t('expertBookingProduct.leaveStay') }}
        </UButton>
        <UButton
          color="error"
          data-testid="expert-booking-product-leave-discard"
          @click="discardAndLeave"
        >
          {{ $t('expertBookingProduct.leaveDiscard') }}
        </UButton>
      </template>
    </UModal>
  </PageHeader>
</template>
