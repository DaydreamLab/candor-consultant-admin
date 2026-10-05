<script setup lang="ts">
import { isBottlePriceSaveError } from '~/utils/sellable-item-form'
import { AdminApiError, adminCreateSellableItem, type SellableItemWrite } from '~/utils/admin-api'
import { SELLABLE_ITEM_FORM_ID, bindNavbarActions } from '~/composables/useNavbarActions'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const { set } = bindNavbarActions()

const saving = ref(false)
const errorMessage = ref('')
const bannerError = computed(() => {
  const message = errorMessage.value.trim()
  return message && !isBottlePriceSaveError(message) ? message : ''
})

watch([saving, locale], () => {
  set({
    showDelete: false,
    deleteDisabled: false,
    deleting: false,
    busy: saving.value,
    onDelete: () => {},
    primaryLabel: t('actions.save'),
    primaryLoading: saving.value,
    primaryForm: SELLABLE_ITEM_FORM_ID,
    onPrimary: null
  })
}, { immediate: true })

async function onSave(payload: SellableItemWrite) {
  const token = readOperatorToken()
  if (!token) {
    errorMessage.value = t('products.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const created = await adminCreateSellableItem(config.public.apiBase, token, payload)
    const id = idOf(created)
    if (id) {
      await navigateTo(localePath(`/products/${encodeURIComponent(id)}`))
      return
    }
    await navigateTo(localePath('/products'))
  } catch (error) {
    errorMessage.value = failText(error)
  } finally {
    saving.value = false
  }
}

function idOf(row: Record<string, unknown>) {
  const id = row.id
  if (typeof id === 'string' && id.trim()) {
    return id.trim()
  }
  if (typeof id === 'number' && Number.isFinite(id)) {
    return String(id)
  }
  return ''
}

function failText(error: unknown) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || t('products.saveFailed')
}
</script>

<template>
  <PageHeader plain>
    <p
      v-if="bannerError"
      class="mb-4 text-sm text-error"
    >
      {{ bannerError }}
    </p>
    <SellableItemForm
      mode="create"
      :sellable-item="null"
      :saving="saving"
      :save-error="errorMessage"
      @save="onSave"
    />
  </PageHeader>
</template>
