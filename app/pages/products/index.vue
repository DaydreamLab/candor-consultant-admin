<script setup lang="ts">
const localePath = useLocalePath()
const { locale, t } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()

const query = ref('')
const deleteSku = ref<string | null>(null)

const rows = computed(() => {
  const list = scoped(ops.products).map((product) => {
    const stock = ops.inventory.find(item => item.sku === product.sku)
    const onHand = stock?.onHand ?? 0
    const reserved = stock?.reserved ?? 0
    const available = onHand - reserved
    const reorderAt = stock?.reorderAt ?? 0
    return {
      ...product,
      onHand,
      reserved,
      available,
      reorderAt,
      low: available <= reorderAt
    }
  })
  const q = query.value.trim().toLowerCase()
  if (!q) {
    return list
  }
  return list.filter((row) => {
    const name = locale.value === 'en' ? row.nameEn : row.name
    const label = locale.value === 'en' ? row.aLabelEn : row.aLabel
    return [row.sku, name, label].join(' ').toLowerCase().includes(q)
  })
})

function yName(row: (typeof rows.value)[number]) {
  return locale.value === 'en' ? row.nameEn : row.name
}

function aName(row: (typeof rows.value)[number]) {
  return locale.value === 'en' ? row.aLabelEn : row.aLabel
}

function confirmDelete() {
  if (!deleteSku.value) {
    return
  }
  const ok = ops.removeProduct(deleteSku.value)
  if (!ok) {
    feedback.warned(t('actions.inUse'))
  } else {
    feedback.deleted(deleteSku.value)
  }
  deleteSku.value = null
}
</script>

<template>
  <PageHeader
    :title="$t('nav.products')"
    :description="moduleDesc('products')"
  >
    <template #actions>
      <UInput
        v-model="query"
        icon="i-lucide-search"
        :placeholder="$t('table.search')"
        class="w-52"
      />
      <UButton
        icon="i-lucide-plus"
        :disabled="!writable"
        :to="localePath('/products/new')"
      >
        {{ $t('actions.add') }}
      </UButton>
    </template>

    <div
      v-if="!rows.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
    >
      {{ $t('table.empty') }}
    </div>
    <div
      v-else
      class="overflow-hidden rounded-xl border border-default bg-elevated"
    >
      <article
        v-for="row in rows"
        :key="row.sku"
        class="flex flex-wrap items-center gap-5 border-b border-default px-5 py-5 last:border-0"
      >
        <ProductThumb
          :seed="row.sku"
          :label="aName(row)"
          size="lg"
        />
        <div class="min-w-48 flex-1">
          <p class="text-base font-semibold text-highlighted">
            {{ aName(row) }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ yName(row) }} · {{ row.sku }}
          </p>
          <p class="mt-1 text-sm text-dimmed">
            {{ row.spec }}
            <span v-if="showOrg"> · {{ orgLabel(row.orgId) }}</span>
          </p>
        </div>
        <div class="grid min-w-44 grid-cols-2 gap-x-6 gap-y-1">
          <p class="text-sm text-muted">
            {{ $t('products.costHint') }}
          </p>
          <p class="tabular-money text-right text-base font-semibold text-highlighted">
            {{ money(row.cost) }}
          </p>
          <p class="text-sm text-muted">
            {{ $t('products.priceHint') }}
          </p>
          <p class="tabular-money text-right text-base font-semibold text-highlighted">
            {{ money(row.priceToA) }}
          </p>
        </div>
        <div class="min-w-28 text-base">
          <p class="text-sm text-muted">
            {{ $t('col.onHand') }} {{ row.onHand }}
          </p>
          <p class="mt-1 font-medium text-highlighted">
            {{ $t('col.available') }} {{ row.available }}
          </p>
        </div>
        <StatusBadge
          :label="row.low ? $t('products.lowStock') : $t('products.inStock')"
          :color="row.low ? 'error' : 'success'"
        />
        <RowActions
          :disabled="!writable"
          @edit="navigateTo(localePath(`/products/${encodeURIComponent(row.sku)}`))"
          @remove="deleteSku = row.sku"
        />
      </article>
    </div>

    <ConfirmDelete
      :open="Boolean(deleteSku)"
      @update:open="(open) => { if (!open) deleteSku = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
