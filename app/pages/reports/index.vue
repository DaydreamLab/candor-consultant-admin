<script setup lang="ts">
import { DEMO_REPORT_MONTHS } from '~/utils/demo'

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
        billable: (product?.priceToA ?? 0) * item.qty,
        shippedAt: row.shippedAt
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
    <p class="mb-4 text-base text-muted">
      {{ $t('reports.monthHint') }}
    </p>

    <div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-default bg-elevated p-5">
        <p class="text-base text-muted">
          {{ $t('reports.shippedSkus') }}
        </p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ summary.shippedSkus }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-5">
        <p class="text-base text-muted">
          {{ $t('reports.shippedQty') }}
        </p>
        <p class="mt-2 text-2xl font-semibold text-highlighted">
          {{ summary.shippedQty }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-5">
        <p class="text-base text-muted">
          {{ $t('reports.cogs') }}
        </p>
        <p class="mt-2 tabular-money text-2xl font-semibold text-highlighted">
          {{ money(summary.cogs) }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-5">
        <p class="text-base text-muted">
          {{ $t('reports.billable') }}
        </p>
        <p class="mt-2 tabular-money text-2xl font-semibold text-highlighted">
          {{ money(summary.billable) }}
        </p>
      </div>
    </div>

    <h2 class="mb-3 text-base font-semibold text-highlighted">
      {{ $t('reports.history') }}
    </h2>
    <div class="mb-8 grid gap-3 md:grid-cols-3">
      <div
        v-for="month in DEMO_REPORT_MONTHS"
        :key="month.id"
        class="rounded-xl border border-default bg-elevated p-5"
      >
        <p class="text-sm text-muted">
          {{ $t('reports.month') }} {{ month.id }}
        </p>
        <p class="mt-2 text-lg font-semibold text-highlighted">
          {{ $t('reports.casesShipped') }} {{ month.cases }}
        </p>
        <p class="mt-3 text-sm text-muted">
          {{ $t('reports.shippedQty') }}
        </p>
        <p class="text-base font-medium text-highlighted">
          {{ month.shippedQty }}
        </p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div>
            <p class="text-sm text-muted">
              {{ $t('reports.cogs') }}
            </p>
            <p class="tabular-money font-medium">
              {{ money(month.cogs) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-muted">
              {{ $t('reports.billable') }}
            </p>
            <p class="tabular-money font-medium">
              {{ money(month.billable) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <AdminTable :empty="!lines.length">
      <template #head>
        <tr>
          <th>{{ $t('col.case') }}</th>
          <th
            v-if="showOrg"
          >
            {{ $t('col.org') }}
          </th>
          <th>{{ $t('col.aLabel') }}</th>
          <th>{{ $t('col.sku') }}</th>
          <th>{{ $t('col.qty') }}</th>
          <th>{{ $t('col.cost') }}</th>
          <th>{{ $t('col.priceToA') }}</th>
          <th>{{ $t('col.shippedAt') }}</th>
        </tr>
      </template>
      <tr
        v-for="row in lines"
        :key="row.id"
        class="border-b border-default last:border-0"
      >
        <td class="font-medium text-highlighted">
          {{ row.caseId }}
        </td>
        <td
          v-if="showOrg"
          class="text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td>
          <div class="flex items-center gap-3">
            <ProductThumb
              :seed="row.sku"
              :label="row.name"
              size="sm"
            />
            {{ row.name }}
          </div>
        </td>
        <td>
          {{ row.sku }}
        </td>
        <td>
          {{ row.qty }}
        </td>
        <td class="tabular-money">
          {{ money(row.cost) }}
        </td>
        <td class="tabular-money">
          {{ money(row.billable) }}
        </td>
        <td class="text-muted">
          {{ row.shippedAt ?? $t('status.na') }}
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
