<script setup lang="ts">
import { AdminApiError, adminListSellableItems } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'
import { thumbLetter, thumbTone } from '~/utils/thumb'

const VIEW_STORAGE_KEY = 'candor.products.view'
const CATEGORY_ALL = 'all'
const OFF_SALE = new Set(['off_sale', 'discontinued', 'stopped', 'inactive'])
const SERVING_KEYS = ['servings_per_container', 'serving_per_container', 'serving_per_contain']

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t, locale } = useI18n()

const sellableItems = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')
const query = ref('')
const categoryFilter = ref<string[]>([CATEGORY_ALL])
const view = ref<'card' | 'list'>('card')

const categoryOptions = computed(() => {
  const names = new Set<string>()
  for (const row of sellableItems.value) {
    const name = categoryOf(row)
    if (name) {
      names.add(name)
    }
  }
  const sorted = [...names].sort((a, b) => a.localeCompare(b, String(locale.value)))
  return [
    { label: t('products.categoryAll'), value: CATEGORY_ALL },
    ...sorted.map(value => ({ label: value, value }))
  ]
})

const selectedCategories = computed(() => {
  return categoryFilter.value.filter(value => value !== CATEGORY_ALL)
})

const categoryTriggerLabel = computed(() => {
  const selected = selectedCategories.value
  if (!selected.length) {
    return t('products.categoryAll')
  }
  const separator = String(locale.value).startsWith('en') ? ', ' : '、'
  return selected.join(separator)
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const selected = new Set(selectedCategories.value)
  return sellableItems.value.filter((row) => {
    if (selected.size > 0 && !selected.has(categoryOf(row))) {
      return false
    }
    return !q || searchableText(row).includes(q)
  })
})

const {
  page,
  pageSize,
  rows,
  total,
  from,
  to
} = usePager(filtered, 20)

watch(categoryFilter, (value, previous) => {
  const next = normalizeCategories(value, previous ?? [])
  if (!sameList(next, value)) {
    categoryFilter.value = next
  }
})

watch([query, categoryFilter], () => {
  page.value = 1
})

if (import.meta.client) {
  const stored = localStorage.getItem(VIEW_STORAGE_KEY)
  if (stored === 'card' || stored === 'list') {
    view.value = stored
  }
  void load()
}

function normalizeCategories(value: string[], previous: string[]) {
  const hadAll = previous.includes(CATEGORY_ALL)
  const hasAll = value.includes(CATEGORY_ALL)
  if (hasAll && !hadAll) {
    return [CATEGORY_ALL]
  }
  const specific = value.filter(item => item !== CATEGORY_ALL)
  if (!specific.length) {
    return [CATEGORY_ALL]
  }
  return specific
}

function sameList(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function setView(next: 'card' | 'list') {
  view.value = next
  localStorage.setItem(VIEW_STORAGE_KEY, next)
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
  return [
    scalarText(row.name_zh),
    scalarText(row.name_en),
    scalarText(row.sku),
    scalarText(row.code),
    scalarText(row.id),
    specOf(row),
    audienceOf(row),
    categoryOf(row),
    servingsOf(row)
  ].join(' ').toLowerCase()
}

function nameOf(row: Record<string, unknown>) {
  const zh = scalarText(row.name_zh).trim()
  const en = scalarText(row.name_en).trim()
  if (String(locale.value).startsWith('en')) {
    return en || zh
  }
  return zh || en
}

function imageOf(row: Record<string, unknown>) {
  const candidate = scalarText(row.image_uri).trim()
    || scalarText(row.image).trim()
    || scalarText(row.image_url).trim()
  if (/^https?:\/\//i.test(candidate)) {
    return candidate
  }
  return ''
}

function specOf(row: Record<string, unknown>) {
  return scalarText(row.spec_text).trim() || scalarText(row.spec).trim()
}

function identifierOf(row: Record<string, unknown>) {
  return scalarText(row.sku).trim() || scalarText(row.code).trim() || scalarText(row.id).trim()
}

function audienceOf(row: Record<string, unknown>) {
  return localizedText(row.audience)
}

function categoryOf(row: Record<string, unknown>) {
  return localizedText(row.category)
}

function servingCountOf(row: Record<string, unknown>) {
  for (const key of SERVING_KEYS) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }
  return null
}

function servingsOf(row: Record<string, unknown>) {
  const count = servingCountOf(row)
  if (count !== null) {
    return t('products.servingsCount', { n: count })
  }
  for (const key of SERVING_KEYS) {
    const text = localizedText(row[key])
    if (text) {
      return text
    }
  }
  return ''
}

function portionOf(row: Record<string, unknown>) {
  const spec = specOf(row)
  const count = servingCountOf(row)
  if (spec && count !== null && spec.includes(String(count))) {
    return spec
  }
  return [servingsOf(row), spec].filter(Boolean).join(' · ')
}

function listMetaOf(row: Record<string, unknown>) {
  return [identifierOf(row), servingsOf(row), specOf(row)].filter(Boolean).join(' · ')
}

function offSaleOf(row: Record<string, unknown>) {
  return OFF_SALE.has(scalarText(row.sale_status).trim().toLowerCase())
}

function hasBadges(row: Record<string, unknown>) {
  return Boolean(categoryOf(row) || offSaleOf(row))
}

function thumbSeed(row: Record<string, unknown>) {
  return identifierOf(row) || nameOf(row) || idOf(row) || '?'
}

function idOf(row: Record<string, unknown>) {
  return scalarText(row.id).trim()
}

function localizedText(value: unknown) {
  if (!isRecord(value)) {
    return scalarText(value).trim()
  }
  const zh = scalarText(value.name_zh).trim()
  const en = scalarText(value.name_en).trim()
  const name = scalarText(value.name).trim()
  const localized = String(locale.value).startsWith('en') ? (en || zh) : (zh || en)
  return localized || name
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function failText(error: unknown) {
  const message = error instanceof AdminApiError ? error.message.trim() : ''
  return message || t('products.failed')
}
</script>

<template>
  <PageHeader
    :title="$t('products.listTitle')"
    plain
  >
    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('products.loading') }}
    </p>
    <div v-else>
      <div class="overflow-hidden rounded-xl border border-default bg-elevated">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <UInput
              v-model="query"
              icon="i-lucide-search"
              :placeholder="$t('table.search')"
              class="w-52"
            />
            <USelect
              v-model="categoryFilter"
              multiple
              :items="categoryOptions"
              value-key="value"
              icon="i-lucide-filter"
              class="w-40"
            >
              <template #default>
                {{ categoryTriggerLabel }}
              </template>
            </USelect>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-1">
              <UButton
                icon="i-lucide-layout-grid"
                square
                :color="view === 'card' ? 'primary' : 'neutral'"
                :variant="view === 'card' ? 'solid' : 'ghost'"
                :aria-label="$t('products.view.card')"
                :aria-pressed="view === 'card'"
                @click="setView('card')"
              />
              <UButton
                icon="i-lucide-list"
                square
                :color="view === 'list' ? 'primary' : 'neutral'"
                :variant="view === 'list' ? 'solid' : 'ghost'"
                :aria-label="$t('products.view.list')"
                :aria-pressed="view === 'list'"
                @click="setView('list')"
              />
            </div>
            <UButton
              icon="i-lucide-plus"
              :to="localePath('/products/new')"
            >
              {{ $t('actions.add') }}
            </UButton>
          </div>
        </div>
        <p
          v-if="errorMessage"
          class="px-5 py-4 text-sm text-error"
        >
          {{ errorMessage }}
        </p>
        <p
          v-else-if="!filtered.length"
          class="p-10 text-center text-base text-muted"
        >
          {{ $t('products.empty') }}
        </p>
        <UPageGrid
          v-else-if="view === 'card'"
          :ui="{ base: 'relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4' }"
          class="p-4"
        >
          <article
            v-for="(row, index) in rows"
            :key="rowKey(row, index)"
            class="overflow-hidden rounded-lg border border-default bg-default"
            :class="idOf(row) ? 'cursor-pointer hover:bg-muted/30' : ''"
            @click="openItem(row)"
          >
            <div class="aspect-square overflow-hidden bg-muted">
              <img
                v-if="imageOf(row)"
                :src="imageOf(row)"
                alt=""
                class="size-full object-cover"
              >
              <span
                v-else
                class="flex size-full items-center justify-center text-3xl font-semibold text-white"
                :style="{ backgroundColor: thumbTone(thumbSeed(row)) }"
                aria-hidden="true"
              >
                {{ thumbLetter(nameOf(row)) }}
              </span>
            </div>
            <div class="space-y-1 p-3">
              <p
                v-if="nameOf(row)"
                class="line-clamp-2 text-base font-semibold text-highlighted"
              >
                {{ nameOf(row) }}
              </p>
              <div
                v-if="hasBadges(row)"
                class="flex flex-wrap gap-1"
              >
                <UBadge
                  v-if="categoryOf(row)"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ categoryOf(row) }}
                </UBadge>
                <UBadge
                  v-if="offSaleOf(row)"
                  color="warning"
                  variant="subtle"
                  size="sm"
                >
                  {{ $t('products.offSale') }}
                </UBadge>
              </div>
              <p
                v-if="audienceOf(row)"
                class="line-clamp-2 text-sm text-muted"
              >
                {{ audienceOf(row) }}
              </p>
              <p
                v-if="portionOf(row)"
                class="text-sm text-muted"
              >
                {{ portionOf(row) }}
              </p>
              <p
                v-if="identifierOf(row)"
                class="text-xs text-muted"
              >
                {{ identifierOf(row) }}
              </p>
            </div>
          </article>
        </UPageGrid>
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
            <span
              v-else
              class="inline-flex size-16 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-white"
              :style="{ backgroundColor: thumbTone(thumbSeed(row)) }"
              aria-hidden="true"
            >
              {{ thumbLetter(nameOf(row)) }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <p
                  v-if="nameOf(row)"
                  class="text-base font-semibold text-highlighted"
                >
                  {{ nameOf(row) }}
                </p>
                <div
                  v-if="hasBadges(row)"
                  class="flex shrink-0 flex-wrap justify-end gap-1"
                >
                  <UBadge
                    v-if="categoryOf(row)"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                  >
                    {{ categoryOf(row) }}
                  </UBadge>
                  <UBadge
                    v-if="offSaleOf(row)"
                    color="warning"
                    variant="subtle"
                    size="sm"
                  >
                    {{ $t('products.offSale') }}
                  </UBadge>
                </div>
              </div>
              <p
                v-if="audienceOf(row)"
                class="line-clamp-2 text-sm text-muted"
                :class="nameOf(row) || hasBadges(row) ? 'mt-1' : ''"
              >
                {{ audienceOf(row) }}
              </p>
              <p
                v-if="listMetaOf(row)"
                class="text-sm text-muted"
                :class="nameOf(row) || hasBadges(row) || audienceOf(row) ? 'mt-1' : ''"
              >
                {{ listMetaOf(row) }}
              </p>
            </div>
          </article>
        </template>
      </div>
      <ListPager
        :page="page"
        :page-size="pageSize"
        :total="total"
        :from="from"
        :to="to"
        @update:page="page = $event"
      />
    </div>
  </PageHeader>
</template>
