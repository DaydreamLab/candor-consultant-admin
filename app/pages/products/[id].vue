<script setup lang="ts">
import { AdminApiError, adminDeleteSellableItem, adminGetSellableItem, adminUpdateSellableItem } from '~/utils/admin-api'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const crumbLabel = useSellableItemCrumbLabel()

const sellableItemId = computed(() => String(route.params.id ?? ''))
const title = computed(() => crumbLabel.value || sellableItemId.value)

const sellableItem = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const saving = ref(false)
const deleting = ref(false)
const errorMessage = ref('')
const confirmDelete = ref(false)

if (import.meta.client) {
  watch(sellableItemId, (id) => {
    void load(id)
  }, { immediate: true })
}

onUnmounted(() => {
  if (!normalizeAdminPath(route.path).startsWith('/products/')) {
    crumbLabel.value = null
  }
})

async function load(id: string) {
  crumbLabel.value = null
  sellableItem.value = null
  errorMessage.value = ''
  confirmDelete.value = false

  const token = readOperatorToken()
  if (!token || !id) {
    pending.value = false
    errorMessage.value = t('products.failed')
    return
  }

  pending.value = true
  try {
    const row = await adminGetSellableItem(config.public.apiBase, token, id)
    if (sellableItemId.value !== id) {
      return
    }
    sellableItem.value = row
    crumbLabel.value = scalarText(row.name).trim() || null
    errorMessage.value = ''
  } catch (error) {
    if (sellableItemId.value !== id) {
      return
    }
    sellableItem.value = null
    errorMessage.value = failText(error, t('products.failed'))
  } finally {
    if (sellableItemId.value === id) {
      pending.value = false
    }
  }
}

async function onSave(body: Record<string, unknown>) {
  const token = readOperatorToken()
  const id = sellableItemId.value
  if (!token || !id) {
    errorMessage.value = t('products.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const row = await adminUpdateSellableItem(config.public.apiBase, token, id, body)
    if (sellableItemId.value !== id) {
      return
    }
    sellableItem.value = row
    crumbLabel.value = scalarText(row.name).trim() || null
  } catch (error) {
    if (sellableItemId.value !== id) {
      return
    }
    errorMessage.value = failText(error, t('products.saveFailed'))
  } finally {
    if (sellableItemId.value === id) {
      saving.value = false
    }
  }
}

async function onDelete() {
  confirmDelete.value = false
  const token = readOperatorToken()
  const id = sellableItemId.value
  if (!token || !id) {
    errorMessage.value = t('products.deleteFailed')
    return
  }

  deleting.value = true
  errorMessage.value = ''
  try {
    await adminDeleteSellableItem(config.public.apiBase, token, id)
    crumbLabel.value = null
    await navigateTo(localePath('/products'))
  } catch (error) {
    errorMessage.value = failText(error, t('products.deleteFailed'))
  } finally {
    deleting.value = false
  }
}

function scalarText(value: unknown) {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function failText(error: unknown, fallback: string) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || fallback
}
</script>

<template>
  <PageHeader
    :title="title"
    plain
  >
    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('products.loading') }}
    </p>
    <SellableItemForm
      v-else-if="sellableItem"
      mode="update"
      :sellable-item="sellableItem"
      :fallback-id="sellableItemId"
      :saving="saving"
      :deleting="deleting"
      @save="onSave"
      @remove="confirmDelete = true"
    />
    <ConfirmDelete
      :open="confirmDelete"
      :double="false"
      :description="$t('products.deleteConfirm')"
      @update:open="(open) => { if (!open) confirmDelete = false }"
      @confirm="onDelete"
    />
  </PageHeader>
</template>
