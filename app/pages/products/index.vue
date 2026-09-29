<script setup lang="ts">
import { AdminApiError, adminListSellableItems } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n()

const sellableItems = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')
const query = ref('')

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) {
    return sellableItems.value
  }
  return sellableItems.value.filter(row => searchableText(row).includes(q))
})

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token) {
    sellableItems.value = []
    errorMessage.value = t('products.failed')
    pending.value = false
    return
  }

  pending.value = true
  errorMessage.value = ''
  try {
    sellableItems.value = await adminListSellableItems(config.public.apiBase, token)
  } catch (error) {
    sellableItems.value = []
    errorMessage.value = failText(error)
  } finally {
    pending.value = false
  }
}

function openItem(row: Record<string, unknown>) {
  const id = idOf(row)
  if (!id) {
    return
  }
  void navigateTo(localePath(`/products/${encodeURIComponent(id)}`))
}

function rowKey(row: Record<string, unknown>, index: number) {
  return idOf(row) || `sellable-item-${index}`
}

function searchableText(row: Record<string, unknown>) {
  return [nameOf(row), scalarText(row.sku), scalarText(row.code), scalarText(row.id), specOf(row)]
    .join(' ')
    .toLowerCase()
}

function nameOf(row: Record<string, unknown>) {
  return scalarText(row.name_zh).trim() || scalarText(row.name).trim()
}

function imageOf(row: Record<string, unknown>) {
  const candidate = scalarText(row.image).trim() || scalarText(row.image_url).trim()
  if (/^https?:\/\//i.test(candidate)) {
    return candidate
  }
  return ''
}

function specOf(row: Record<string, unknown>) {
  return scalarText(row.spec_text).trim() || scalarText(row.spec).trim()
}

function metaOf(row: Record<string, unknown>) {
  const identifier = scalarText(row.sku).trim() || scalarText(row.code).trim() || scalarText(row.id).trim()
  const spec = specOf(row)
  return [identifier, spec].filter(Boolean).join(' · ')
}

function idOf(row: Record<string, unknown>) {
  return scalarText(row.id).trim()
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

function failText(error: unknown) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || t('products.failed')
}
</script>

<template>
  <PageHeader
    :title="$t('nav.products')"
    plain
  >
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('products.loading') }}
    </p>
    <div
      v-else
      class="overflow-hidden rounded-xl border border-default bg-elevated"
    >
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
        <UInput
          v-model="query"
          icon="i-lucide-search"
          :placeholder="$t('table.search')"
          class="w-52"
        />
        <UButton
          icon="i-lucide-plus"
          :to="localePath('/products/new')"
        >
          {{ $t('actions.add') }}
        </UButton>
      </div>
      <p
        v-if="errorMessage"
        class="px-5 py-4 text-sm text-error"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="!rows.length"
        class="p-10 text-center text-base text-muted"
      >
        {{ $t('products.empty') }}
      </p>
      <template v-else>
        <article
          v-for="(row, index) in rows"
          :key="rowKey(row, index)"
          class="flex items-center gap-4 border-b border-default px-5 py-4 last:border-0"
          :class="idOf(row) ? 'cursor-pointer hover:bg-muted/30' : ''"
          @click="openItem(row)"
        >
          <img
            v-if="imageOf(row)"
            :src="imageOf(row)"
            alt=""
            class="size-16 shrink-0 rounded-lg object-cover"
          >
          <div class="min-w-0">
            <p
              v-if="nameOf(row)"
              class="text-base font-semibold text-highlighted"
            >
              {{ nameOf(row) }}
            </p>
            <p
              v-if="metaOf(row)"
              class="text-sm text-muted"
              :class="nameOf(row) ? 'mt-1' : ''"
            >
              {{ metaOf(row) }}
            </p>
          </div>
        </article>
      </template>
    </div>
  </PageHeader>
</template>
