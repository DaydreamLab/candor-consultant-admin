<script setup lang="ts">
import { AdminApiError, adminCreateSellableItem } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()

const saving = ref(false)
const errorMessage = ref('')

async function onSave(body: Record<string, unknown>) {
  const token = readOperatorToken()
  if (!token) {
    errorMessage.value = t('products.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const created = await adminCreateSellableItem(config.public.apiBase, token, body)
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
  <PageHeader
    :title="$t('actions.add')"
    plain
  >
    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <SellableItemForm
      mode="create"
      :sellable-item="null"
      :saving="saving"
      :deleting="false"
      @save="onSave"
    />
  </PageHeader>
</template>
