<script setup lang="ts">
const { locale } = useI18n()
const { scoped, orgLabel, showOrg } = useOrgScope()
const { moduleDesc } = usePageCopy()
const ops = useOpsStore()

const shipped = computed(() =>
  scoped(ops.shipments).filter(row => row.status === 'delivered' || row.status === 'in_transit')
)

const lines = computed(() =>
  shipped.value.flatMap(row =>
    row.items.map((item) => {
      const product = ops.productOf(item.sku)
      return {
        id: `${row.id}-${item.sku}`,
        caseId: row.caseId,
        orgId: row.orgId,
        sku: item.sku,
        qty: item.qty,
        name: product
          ? (locale.value === 'en' ? product.aLabelEn : product.aLabel)
          : item.sku,
        cost: (product?.cost ?? 0) * item.qty,
        billable: (product?.priceToA ?? 0) * item.qty
      }
    })
  )
)

const summary = computed(() => {
  const skus = new Set(lines.value.map(line => line.sku))
  return {
    shippedSkus: skus.size,
    shippedQty: lines.value.reduce((sum, line) => sum + line.qty, 0),
    cogs: lines.value.reduce((sum, line) => sum + line.cost, 0),
    billable: lines.value.reduce((sum, line) => sum + line.billable, 0)
  }
})
</script>

<template>
  <PageHeader
    :title="$t('nav.reports')"
    :description="moduleDesc('reports')"
  >
    <div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-default bg-elevated p-4">
        <p class="text-sm text-muted">
          {{ $t('reports.shippedSkus') }}
        </p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ summary.shippedSkus }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-4">
        <p class="text-sm text-muted">
          {{ $t('reports.shippedQty') }}
        </p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ summary.shippedQty }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-4">
        <p class="text-sm text-muted">
          {{ $t('reports.cogs') }}
        </p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ money(summary.cogs) }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-4">
        <p class="text-sm text-muted">
          {{ $t('reports.billable') }}
        </p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ money(summary.billable) }}
        </p>
      </div>
    </div>

    <AdminTable :empty="!lines.length">
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.case') }}
          </th>
          <th
            v-if="showOrg"
            class="px-4 py-3 font-medium"
          >
            {{ $t('col.org') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.aLabel') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.sku') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.qty') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.cost') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.priceToA') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in lines"
        :key="row.id"
        class="border-b border-default last:border-0"
      >
        <td class="px-4 py-3 font-medium text-highlighted">
          {{ row.caseId }}
        </td>
        <td
          v-if="showOrg"
          class="px-4 py-3 text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td class="px-4 py-3">
          {{ row.name }}
        </td>
        <td class="px-4 py-3">
          {{ row.sku }}
        </td>
        <td class="px-4 py-3">
          {{ row.qty }}
        </td>
        <td class="px-4 py-3">
          {{ money(row.cost) }}
        </td>
        <td class="px-4 py-3">
          {{ money(row.billable) }}
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
