<script setup lang="ts">
import { isBottlePriceSaveError } from '~/utils/sellable-item-form'
import { AdminApiError, adminGetSellableItem, adminUpdateSellableItem, type SellableItemWrite } from '~/utils/admin-api'
import { SELLABLE_ITEM_FORM_ID, bindNavbarActions } from '~/composables/useNavbarActions'
import { normalizeAdminPath } from '~/utils/nav'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const route = useRoute()
const { t, locale } = useI18n()
const session = useSessionStore()
const crumbLabel = useSellableItemCrumbLabel()
const { set } = bindNavbarActions()

const sellableItemId = computed(() => String(route.params.id ?? ''))
const title = computed(() => crumbLabel.value || sellableItemId.value)
const canEdit = computed(() => session.operator?.role !== 'expert')

const sellableItem = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const bannerError = computed(() => {
  const message = errorMessage.value.trim()
  return message && !isBottlePriceSaveError(message) ? message : ''
})

watch([saving, pending, sellableItem, locale, canEdit], () => {
  if (pending.value || !sellableItem.value || !canEdit.value) {
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
    primaryForm: SELLABLE_ITEM_FORM_ID,
    onPrimary: null
  })
}, { immediate: true })

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
    crumbLabel.value = itemName(row)
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

async function onSave(payload: SellableItemWrite) {
  const token = readOperatorToken()
  const id = sellableItemId.value
  if (!token || !id || !canEdit.value) {
    errorMessage.value = t('products.saveFailed')
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const row = await adminUpdateSellableItem(config.public.apiBase, token, id, payload)
    if (sellableItemId.value !== id) {
      return
    }
    sellableItem.value = row
    crumbLabel.value = itemName(row)
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

function itemName(row: Record<string, unknown>) {
  return scalarText(row.name_zh).trim() || scalarText(row.name).trim() || null
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
      v-if="bannerError"
      class="mb-4 text-sm text-error"
    >
      {{ bannerError }}
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
      :disabled="!canEdit"
      :sellable-item="sellableItem"
      :saving="saving"
      :save-error="errorMessage"
      @save="onSave"
    />
  </PageHeader>
</template>
