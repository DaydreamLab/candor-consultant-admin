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
        class="w-44"
      />
      <UButton
        icon="i-lucide-plus"
        :disabled="!writable"
        :to="localePath('/products/new')"
      >
        {{ $t('actions.add') }}
      </UButton>
    </template>

    <AdminTable :empty="!rows.length">
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.sku') }}
          </th>
          <th
            v-if="showOrg"
            class="px-4 py-3 font-medium"
          >
            {{ $t('col.org') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.yName') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.aLabel') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.spec') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.onHand') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.available') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.cost') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.priceToA') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.status') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.actions') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.sku"
        class="border-b border-default last:border-0"
      >
        <td class="px-4 py-3 font-medium text-highlighted">
          {{ row.sku }}
        </td>
        <td
          v-if="showOrg"
          class="px-4 py-3 text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td class="px-4 py-3">
          {{ yName(row) }}
        </td>
        <td class="px-4 py-3">
          {{ aName(row) }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.spec }}
        </td>
        <td class="px-4 py-3">
          {{ row.onHand }}
        </td>
        <td class="px-4 py-3">
          {{ row.available }}
        </td>
        <td class="px-4 py-3">
          {{ money(row.cost) }}
        </td>
        <td class="px-4 py-3">
          {{ money(row.priceToA) }}
        </td>
        <td class="px-4 py-3">
          <StatusBadge
            :label="row.low ? $t('workbench.lowStock') : $t('status.active')"
            :color="row.low ? 'error' : 'success'"
          />
        </td>
        <td class="px-4 py-3">
          <RowActions
            :disabled="!writable"
            @edit="navigateTo(localePath(`/products/${encodeURIComponent(row.sku)}`))"
            @remove="deleteSku = row.sku"
          />
        </td>
      </tr>
    </AdminTable>

    <ConfirmDelete
      :open="Boolean(deleteSku)"
      @update:open="(open) => { if (!open) deleteSku = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
